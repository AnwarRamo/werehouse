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
const bullmq_2 = require("bullmq");
const queue_constants_1 = require("../queues/queue.constants");
const pdf_lib_1 = require("pdf-lib");
const PAYROLL_BATCH_SIZE = 250;
let PayrollService = class PayrollService {
    constructor(prisma, payrollQueue) {
        this.prisma = prisma;
        this.payrollQueue = payrollQueue;
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
    async list(query) {
        const page = Number(query.page || 1);
        const limit = Math.min(Number(query.limit || 50), 200);
        const skip = (page - 1) * limit;
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
        const payrollRun = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
        if (!payrollRun)
            throw new common_1.NotFoundException('Payroll run not found');
        const items = await this.prisma.payrollItem.findMany({ where: { payrollRunId: runId } });
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
        const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
        if (!run)
            throw new common_1.NotFoundException('Payroll run not found');
        const updated = await this.prisma.payrollRun.update({
            where: { id: runId },
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
        const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
        if (!run)
            throw new common_1.NotFoundException('Payroll run not found');
        const updated = await this.prisma.payrollRun.update({
            where: { id: runId },
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
        const anomalies = await this.prisma.payrollItem.findMany({
            where: {
                payrollRunId: runId,
                NOT: { anomalies: { isEmpty: true } },
            },
        });
        return {
            runId,
            anomalyCount: anomalies.length,
            anomalies: anomalies.map((a) => ({
                employeeId: a.employeeId,
                employeeName: a.employeeName,
                anomalies: a.anomalies,
            })),
        };
    }
    async export(runId) {
        const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
        if (!run)
            throw new common_1.NotFoundException('Payroll run not found');
        const items = await this.prisma.payrollItem.findMany({
            where: { payrollRunId: runId },
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
        const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
        if (!run)
            throw new common_1.NotFoundException('Payroll run not found');
        const items = await this.prisma.payrollItem.findMany({
            where: { payrollRunId: runId },
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
        const activeEmployeesCount = await this.prisma.employee.count({ where: { status: 'active' } });
        if (activeEmployeesCount === 0) {
            throw new common_1.BadRequestException('No active employees found');
        }
        await this.prisma.payrollRun.update({
            where: { id: runId },
            data: {
                status: 'processing',
                totalEmployees: activeEmployeesCount,
            },
        });
        let totalGross = 0;
        let totalNet = 0;
        let processedEmployees = 0;
        let skip = 0;
        while (true) {
            const employees = await this.prisma.employee.findMany({
                where: { status: 'active' },
                orderBy: { employeeId: 'asc' },
                skip,
                take: PAYROLL_BATCH_SIZE,
            });
            if (employees.length === 0) {
                break;
            }
            const items = employees.map((employee) => {
                const hoursWorked = 160;
                const hourlyRate = Number(employee.hourlyRate);
                const grossPay = Number((hoursWorked * hourlyRate).toFixed(2));
                const totalDeductions = Number((grossPay * 0.08).toFixed(2));
                const netPay = Number((grossPay - totalDeductions).toFixed(2));
                totalGross += grossPay;
                totalNet += netPay;
                processedEmployees += 1;
                return {
                    payrollRunId: runId,
                    employeeId: employee.employeeId,
                    employeeName: employee.name,
                    department: employee.department,
                    hoursWorked: new client_1.Prisma.Decimal(hoursWorked),
                    hourlyRate: new client_1.Prisma.Decimal(hourlyRate),
                    grossPay: new client_1.Prisma.Decimal(grossPay),
                    totalDeductions: new client_1.Prisma.Decimal(totalDeductions),
                    netPay: new client_1.Prisma.Decimal(netPay),
                    anomalies: [],
                };
            });
            await this.prisma.payrollItem.createMany({ data: items });
            skip += employees.length;
        }
        const updatedRun = await this.prisma.payrollRun.update({
            where: { id: runId },
            data: {
                status: 'completed',
                totalEmployees: processedEmployees,
                totalGrossPay: new client_1.Prisma.Decimal(totalGross.toFixed(2)),
                totalDeductions: new client_1.Prisma.Decimal((totalGross - totalNet).toFixed(2)),
                totalNetPay: new client_1.Prisma.Decimal(totalNet.toFixed(2)),
            },
        });
        return updatedRun;
    }
};
exports.PayrollService = PayrollService;
exports.PayrollService = PayrollService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)(queue_constants_1.QUEUE_NAMES.PAYROLL)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map