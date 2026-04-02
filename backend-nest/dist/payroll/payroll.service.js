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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let PayrollService = class PayrollService {
    constructor(prisma) {
        this.prisma = prisma;
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
        const employees = await this.prisma.employee.findMany({
            where: { status: 'active' },
            take: 100,
        });
        if (employees.length === 0)
            throw new common_1.BadRequestException('No active employees found');
        const runDateKey = dto.periodStart.slice(0, 10).replace(/-/g, '');
        const runId = `PAY${runDateKey}-${Date.now().toString().slice(-4)}`;
        const run = await this.prisma.payrollRun.create({
            data: {
                runId,
                periodStart: new Date(dto.periodStart),
                periodEnd: new Date(dto.periodEnd),
                runBy: userId,
                status: 'draft',
                approvalStatus: 'pending',
                totalEmployees: employees.length,
            },
        });
        let totalGross = 0;
        let totalNet = 0;
        const items = [];
        for (const e of employees) {
            const hoursWorked = 160;
            const hourlyRate = Number(e.hourlyRate);
            const grossPay = Number((hoursWorked * hourlyRate).toFixed(2));
            const totalDeductions = Number((grossPay * 0.08).toFixed(2));
            const netPay = Number((grossPay - totalDeductions).toFixed(2));
            totalGross += grossPay;
            totalNet += netPay;
            items.push({
                payrollRunId: run.id,
                employeeId: e.employeeId,
                employeeName: e.name,
                department: e.department,
                hoursWorked: new client_1.Prisma.Decimal(hoursWorked),
                hourlyRate: new client_1.Prisma.Decimal(hourlyRate),
                grossPay: new client_1.Prisma.Decimal(grossPay),
                totalDeductions: new client_1.Prisma.Decimal(totalDeductions),
                netPay: new client_1.Prisma.Decimal(netPay),
                anomalies: [],
            });
        }
        if (items.length) {
            await this.prisma.payrollItem.createMany({ data: items });
        }
        const updatedRun = await this.prisma.payrollRun.update({
            where: { id: run.id },
            data: {
                totalGrossPay: new client_1.Prisma.Decimal(totalGross.toFixed(2)),
                totalDeductions: new client_1.Prisma.Decimal((totalGross - totalNet).toFixed(2)),
                totalNetPay: new client_1.Prisma.Decimal(totalNet.toFixed(2)),
            },
        });
        return { message: 'Payroll calculated successfully', payrollRun: updatedRun };
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
        return { message: 'Export payroll functionality to be implemented', runId, format: 'csv' };
    }
};
exports.PayrollService = PayrollService;
exports.PayrollService = PayrollService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map