"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utils/pagination.util");
const bullmq_2 = require("bullmq");
const queue_constants_1 = require("../queues/queue.constants");
const pdf_lib_1 = require("pdf-lib");
const PAYROLL_BATCH_SIZE = 250;
let PayrollService = class PayrollService {
    constructor(prisma, payrollQueue) {
        this.prisma = prisma;
        this.payrollQueue = payrollQueue;
    }
    toMoney(value) {
        return Number(value.toFixed(2));
    }
    extractMinutesLate(shiftPair) {
        if (!shiftPair || typeof shiftPair !== 'object' || Array.isArray(shiftPair)) {
            return 0;
        }
        const raw = shiftPair.minutesLate;
        const parsed = Number(raw ?? 0);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return 0;
        }
        return parsed;
    }
    resolvePeriod(periodStart, periodEnd) {
        if (periodStart && periodEnd) {
            return { periodStart, periodEnd };
        }
        if (periodStart || periodEnd) {
            throw new common_1.BadRequestException('Period start and end dates must be provided together');
        }
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - 30);
        return {
            periodStart: start.toISOString().slice(0, 10),
            periodEnd: end.toISOString().slice(0, 10),
        };
    }
    isUuid(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }
    async resolvePayrollRun(runIdentifier) {
        const where = this.isUuid(runIdentifier)
            ? {
                OR: [{ id: runIdentifier }, { runId: runIdentifier }],
            }
            : { runId: runIdentifier };
        const run = await this.prisma.payrollRun.findFirst({ where });
        if (!run)
            throw new common_1.NotFoundException('Payroll run not found');
        return run;
    }
    async list(query) {
        const { page, limit, skip } = (0, pagination_util_1.resolvePagination)(query);
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.approvalStatus)
            where.approvalStatus = query.approvalStatus;
        const [payrollRuns, total] = await Promise.all([
            this.prisma.payrollRun.findMany({
                where,
                orderBy: { runDate: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.payrollRun.count({ where }),
        ]);
        return { payrollRuns, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    async calculate(dto, userId) {
        const runDateKey = dto.periodStart.slice(0, 10).replace(/-/g, '');
        const runId = `PAY${runDateKey}-${Date.now().toString().slice(-4)}`;
        const run = await this.prisma.payrollRun.create({
            data: {
                runId,
                periodStart: new Date(dto.periodStart),
                periodEnd: new Date(dto.periodEnd),
                runBy: userId,
                status: 'processing',
                approvalStatus: 'pending',
                totalEmployees: 0,
            },
        });
        const updatedRun = await this.processPayrollRun(run.id, dto, userId);
        return { message: 'Payroll calculated successfully', payrollRun: updatedRun };
    }
    async calculateAsync(dto, userId) {
        const runDateKey = dto.periodStart.slice(0, 10).replace(/-/g, '');
        const runId = `PAY${runDateKey}-${Date.now().toString().slice(-4)}`;
        const run = await this.prisma.payrollRun.create({
            data: {
                runId,
                periodStart: new Date(dto.periodStart),
                periodEnd: new Date(dto.periodEnd),
                runBy: userId,
                status: 'queued',
                approvalStatus: 'pending',
                totalEmployees: 0,
            },
        });
        await this.enqueuePayrollJob({ payrollRunId: run.id, dto, userId });
        return { message: 'Payroll calculation queued', payrollRun: run };
    }
    async getRun(runId) {
        const payrollRun = await this.resolvePayrollRun(runId);
        const items = await this.prisma.payrollItem.findMany({ where: { payrollRunId: payrollRun.id } });
        return { payrollRun, items, itemCount: items.length };
    }
    async getEmployeeHistory(employeeId) {
        const payrollItems = await this.prisma.payrollItem.findMany({
            where: { employeeId },
            orderBy: { createdAt: 'desc' },
        });
        return { employeeId, payrollItems };
    }
    async approve(runId, userId) {
        const run = await this.resolvePayrollRun(runId);
        const updated = await this.prisma.payrollRun.update({
            where: { id: run.id },
            data: {
                status: 'approved',
                approvalStatus: 'approved',
                approvedBy: userId,
                approvalDate: new Date(),
            },
        });
        return { message: 'Payroll approved successfully', payrollRun: updated };
    }
    async reject(runId, reason, userId) {
        if (!reason)
            throw new common_1.BadRequestException('Rejection reason is required');
        const run = await this.resolvePayrollRun(runId);
        const updated = await this.prisma.payrollRun.update({
            where: { id: run.id },
            data: {
                status: 'draft',
                approvalStatus: 'rejected',
                approvedBy: userId,
                notes: reason,
            },
        });
        return { message: 'Payroll rejected successfully', payrollRun: updated };
    }
    async summary(periodStart, periodEnd) {
        const period = this.resolvePeriod(periodStart, periodEnd);
        const runs = await this.prisma.payrollRun.findMany({
            where: {
                periodStart: { gte: new Date(period.periodStart), lte: new Date(period.periodEnd) },
            },
        });
        return {
            period,
            summary: {
                totalRuns: runs.length,
                totalNetPay: runs.reduce((s, r) => s + Number(r.totalNetPay || 0), 0),
                totalGrossPay: runs.reduce((s, r) => s + Number(r.totalGrossPay || 0), 0),
            },
        };
    }
    async anomalies(runId) {
        const run = await this.resolvePayrollRun(runId);
        const anomalies = await this.prisma.payrollItem.findMany({
            where: {
                payrollRunId: run.id,
                NOT: { anomalies: { isEmpty: true } },
            },
        });
        return {
            runId: run.runId,
            anomalyCount: anomalies.length,
            anomalies: anomalies.map((a) => ({
                employeeId: a.employeeId,
                employeeName: a.employeeName,
                anomalies: a.anomalies,
            })),
        };
    }
    async export(runId) {
        const run = await this.resolvePayrollRun(runId);
        const items = await this.prisma.payrollItem.findMany({
            where: { payrollRunId: run.id },
            orderBy: { employeeId: 'asc' },
        });
        const fileName = `payroll-${run.runId}.csv`;
        return {
            mimeType: 'text/csv; charset=utf-8',
            fileName,
            content: this.buildCsv(run, items),
        };
    }
    async exportPdf(runId) {
        const run = await this.resolvePayrollRun(runId);
        const items = await this.prisma.payrollItem.findMany({
            where: { payrollRunId: run.id },
            orderBy: { employeeId: 'asc' },
        });
        const pdf = await pdf_lib_1.PDFDocument.create();
        const page = pdf.addPage([842, 595]);
        const font = await pdf.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const bold = await pdf.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const margin = 24;
        let y = 565;
        page.drawText(`Payroll Report: ${run.runId}`, {
            x: margin,
            y,
            size: 14,
            font: bold,
            color: (0, pdf_lib_1.rgb)(0.1, 0.1, 0.1),
        });
        y -= 20;
        page.drawText(`Period: ${run.periodStart.toISOString().slice(0, 10)} to ${run.periodEnd.toISOString().slice(0, 10)}`, {
            x: margin,
            y,
            size: 10,
            font,
            color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2),
        });
        y -= 24;
        const header = 'EmpID        Name                    Dept            Gross     Deductions   Net';
        page.drawText(header, { x: margin, y, size: 10, font: bold });
        y -= 14;
        for (const item of items) {
            if (y < 36) {
                break;
            }
            const line = [
                (item.employeeId || '').padEnd(12).slice(0, 12),
                (item.employeeName || '').padEnd(24).slice(0, 24),
                (item.department || '').padEnd(14).slice(0, 14),
                Number(item.grossPay).toFixed(2).padStart(10),
                Number(item.totalDeductions).toFixed(2).padStart(12),
                Number(item.netPay).toFixed(2).padStart(8),
            ].join(' ');
            page.drawText(line, { x: margin, y, size: 9, font });
            y -= 12;
        }
        const bytes = await pdf.save();
        return {
            mimeType: 'application/pdf',
            fileName: `payroll-${run.runId}.pdf`,
            content: Buffer.from(bytes),
        };
    }
    buildCsv(run, items) {
        const rows = [];
        rows.push([
            'payrollRunId',
            'periodStart',
            'periodEnd',
            'employeeId',
            'employeeName',
            'department',
            'hoursWorked',
            'hourlyRate',
            'grossPay',
            'totalDeductions',
            'netPay',
            'anomalies',
        ].join(','));
        for (const item of items) {
            rows.push([
                this.escapeCsv(run.runId),
                this.escapeCsv(run.periodStart.toISOString().slice(0, 10)),
                this.escapeCsv(run.periodEnd.toISOString().slice(0, 10)),
                this.escapeCsv(item.employeeId),
                this.escapeCsv(item.employeeName),
                this.escapeCsv(item.department),
                this.escapeCsv(Number(item.hoursWorked)),
                this.escapeCsv(Number(item.hourlyRate)),
                this.escapeCsv(Number(item.grossPay)),
                this.escapeCsv(Number(item.totalDeductions)),
                this.escapeCsv(Number(item.netPay)),
                this.escapeCsv((item.anomalies || []).join('; ')),
            ].join(','));
        }
        return rows.join('\n');
    }
    escapeCsv(value) {
        const text = String(value ?? '');
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    }
    async processPayrollRunJob(payload) {
        return this.processPayrollRun(payload.payrollRunId, payload.dto, payload.userId);
    }
    async markPayrollRunFailed(payrollRunId, message) {
        await this.prisma.payrollRun.update({
            where: { id: payrollRunId },
            data: {
                status: 'failed',
                notes: message || 'Payroll calculation failed',
            },
        });
    }
    async enqueuePayrollJob(payload) {
        try {
            if (!this.payrollQueue) {
                throw new Error('Payroll queue is not available');
            }
            await this.payrollQueue.add(queue_constants_1.QUEUE_JOBS.PAYROLL_CALCULATE, payload, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2_000 },
            });
            return;
        }
        catch {
            await this.processPayrollRunJob(payload);
        }
    }
    async processPayrollRun(runId, dto, userId) {
        const activeEmployees = await this.prisma.employee.findMany({
            where: { status: 'active' },
            orderBy: { employeeId: 'asc' },
            select: {
                employeeId: true,
                name: true,
                department: true,
                hourlyRate: true,
            },
        });
        if (activeEmployees.length === 0) {
            throw new common_1.BadRequestException('No active employees found');
        }
        const employeeIds = activeEmployees.map((employee) => employee.employeeId);
        const periodStart = dto.periodStart.slice(0, 10);
        const periodEnd = dto.periodEnd.slice(0, 10);
        const periodTag = periodStart.slice(0, 7);
        const gracePeriodMinutes = Math.max(0, Number(dto.gracePeriodMinutes ?? 15));
        const [salaryRecords, bonuses, advances, attendanceInRecords] = await Promise.all([
            this.prisma.employeeSalary.findMany({
                where: { employeeId: { in: employeeIds } },
            }),
            this.prisma.employeeBonus.findMany({
                where: {
                    employeeId: { in: employeeIds },
                    period: periodTag,
                },
            }),
            this.prisma.employeeAdvance.findMany({
                where: {
                    employeeId: { in: employeeIds },
                    remainingAmount: { gt: new client_1.Prisma.Decimal(0) },
                },
            }),
            this.prisma.attendanceRecord.findMany({
                where: {
                    employeeId: { in: employeeIds },
                    type: 'IN',
                    date: {
                        gte: periodStart,
                        lte: periodEnd,
                    },
                },
                select: {
                    employeeId: true,
                    date: true,
                    shiftPair: true,
                },
            }),
        ]);
        const salaryByEmployee = new Map(salaryRecords.map((record) => [record.employeeId, record]));
        const employeeById = new Map(activeEmployees.map((employee) => [employee.employeeId, employee]));
        const attendanceDatesByEmployee = new Map();
        const latePenaltyByEmployee = new Map();
        for (const record of attendanceInRecords) {
            const dates = attendanceDatesByEmployee.get(record.employeeId) || new Set();
            dates.add(record.date);
            attendanceDatesByEmployee.set(record.employeeId, dates);
            const minutesLate = this.extractMinutesLate(record.shiftPair);
            const lateAfterGrace = Math.max(0, minutesLate - gracePeriodMinutes);
            if (lateAfterGrace <= 0) {
                continue;
            }
            const employee = employeeById.get(record.employeeId);
            const hourlyRate = Number(employee?.hourlyRate || 0);
            if (!hourlyRate) {
                continue;
            }
            const penalty = (lateAfterGrace / 60) * hourlyRate;
            latePenaltyByEmployee.set(record.employeeId, (latePenaltyByEmployee.get(record.employeeId) || 0) + penalty);
        }
        const attendanceDaysByEmployee = new Map();
        for (const [employeeId, daysSet] of attendanceDatesByEmployee.entries()) {
            attendanceDaysByEmployee.set(employeeId, daysSet.size);
        }
        const bonusesByEmployee = new Map();
        for (const bonus of bonuses) {
            const current = bonusesByEmployee.get(bonus.employeeId) || { bonus: 0, deductions: 0 };
            current.bonus += Number(bonus.bonusAmount || 0);
            current.deductions += Number(bonus.assistanceAmount || 0);
            bonusesByEmployee.set(bonus.employeeId, current);
        }
        const advancesByEmployee = new Map();
        for (const advance of advances) {
            const installment = Number(advance.installmentAmount || 0);
            const remaining = Number(advance.remainingAmount || 0);
            if (installment <= 0 || remaining <= 0) {
                continue;
            }
            const deductible = Math.min(installment, remaining);
            advancesByEmployee.set(advance.employeeId, (advancesByEmployee.get(advance.employeeId) || 0) + deductible);
        }
        await this.prisma.payrollRun.update({
            where: { id: runId },
            data: {
                status: 'processing',
                totalEmployees: activeEmployees.length,
            },
        });
        await this.prisma.payrollItem.deleteMany({ where: { payrollRunId: runId } });
        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        let processedEmployees = 0;
        for (let offset = 0; offset < activeEmployees.length; offset += PAYROLL_BATCH_SIZE) {
            const employeesBatch = activeEmployees.slice(offset, offset + PAYROLL_BATCH_SIZE);
            const items = [];
            for (const employee of employeesBatch) {
                const salaryRecord = salaryByEmployee.get(employee.employeeId);
                const hourlyRate = Number(employee.hourlyRate || 0);
                const fallbackBaseSalary = hourlyRate * 8 * 26;
                const baseSalary = Number(salaryRecord?.baseSalary ?? fallbackBaseSalary);
                const attendanceDays = attendanceDaysByEmployee.get(employee.employeeId) || 0;
                const hoursWorked = attendanceDays * 8;
                const proratedBase = this.toMoney((baseSalary / 26) * attendanceDays);
                const employeeBonuses = bonusesByEmployee.get(employee.employeeId);
                const bonusAmount = this.toMoney(employeeBonuses?.bonus || 0);
                const administrativeDeductions = this.toMoney(employeeBonuses?.deductions || 0);
                const advancesInstallments = this.toMoney(advancesByEmployee.get(employee.employeeId) || 0);
                const latePenalty = this.toMoney(latePenaltyByEmployee.get(employee.employeeId) || 0);
                const grossPay = this.toMoney(proratedBase + bonusAmount);
                const employeeDeductions = this.toMoney(administrativeDeductions + advancesInstallments + latePenalty);
                const netPay = this.toMoney(grossPay - employeeDeductions);
                const anomalies = [];
                if (!salaryRecord) {
                    anomalies.push('Salary configuration not found; fallback hourly-rate baseline used');
                }
                if (attendanceDays === 0) {
                    anomalies.push('No attendance records in selected period');
                }
                if (latePenalty > 0) {
                    anomalies.push(`Late penalty applied: ${latePenalty.toFixed(2)}`);
                }
                if (netPay < 0) {
                    anomalies.push('Net pay is negative after deductions');
                }
                totalGross += grossPay;
                totalDeductions += employeeDeductions;
                totalNet += netPay;
                processedEmployees += 1;
                items.push({
                    payrollRunId: runId,
                    employeeId: employee.employeeId,
                    employeeName: employee.name,
                    department: employee.department,
                    hoursWorked: new client_1.Prisma.Decimal(hoursWorked),
                    hourlyRate: new client_1.Prisma.Decimal(hourlyRate),
                    grossPay: new client_1.Prisma.Decimal(grossPay),
                    totalDeductions: new client_1.Prisma.Decimal(employeeDeductions),
                    netPay: new client_1.Prisma.Decimal(netPay),
                    anomalies,
                });
            }
            if (items.length > 0) {
                await this.prisma.payrollItem.createMany({ data: items });
            }
        }
        const updatedRun = await this.prisma.payrollRun.update({
            where: { id: runId },
            data: {
                status: 'completed',
                totalEmployees: processedEmployees,
                totalGrossPay: new client_1.Prisma.Decimal(this.toMoney(totalGross)),
                totalDeductions: new client_1.Prisma.Decimal(this.toMoney(totalDeductions)),
                totalNetPay: new client_1.Prisma.Decimal(this.toMoney(totalNet)),
            },
        });
        return updatedRun;
    }
};
exports.PayrollService = PayrollService;
exports.PayrollService = PayrollService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_NAMES.PAYROLL)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map