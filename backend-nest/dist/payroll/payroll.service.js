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
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const payroll_run_schema_1 = require("./schemas/payroll-run.schema");
const payroll_item_schema_1 = require("./schemas/payroll-item.schema");
const employee_schema_1 = require("../employees/schemas/employee.schema");
let PayrollService = class PayrollService {
    constructor(runModel, itemModel, employeeModel) {
        this.runModel = runModel;
        this.itemModel = itemModel;
        this.employeeModel = employeeModel;
    }
    async list(query) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 50);
        const skip = (page - 1) * limit;
        const filter = {};
        if (query.status)
            filter.status = query.status;
        if (query.approvalStatus)
            filter.approvalStatus = query.approvalStatus;
        const [payrollRuns, total] = await Promise.all([
            this.runModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            this.runModel.countDocuments(filter),
        ]);
        return {
            payrollRuns,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }
    async calculate(dto, userId) {
        const employees = await this.employeeModel.find({ status: 'active' }).limit(100);
        if (employees.length === 0) {
            throw new common_1.BadRequestException('No active employees found');
        }
        const runDateKey = dto.periodStart.slice(0, 10).replace(/-/g, '');
        const runId = `PAY${runDateKey}-${Date.now().toString().slice(-4)}`;
        const run = await this.runModel.create({
            runId,
            periodStart: new Date(dto.periodStart),
            periodEnd: new Date(dto.periodEnd),
            runBy: userId,
            status: 'draft',
            approvalStatus: 'pending',
            totalEmployees: employees.length,
        });
        let totalGross = 0;
        let totalNet = 0;
        const items = [];
        for (const e of employees) {
            const hoursWorked = 160;
            const grossPay = Number((hoursWorked * Number(e.hourlyRate || 0)).toFixed(2));
            const totalDeductions = Number((grossPay * 0.08).toFixed(2));
            const netPay = Number((grossPay - totalDeductions).toFixed(2));
            totalGross += grossPay;
            totalNet += netPay;
            items.push({
                payrollRunId: String(run._id),
                employeeId: e.employeeId,
                employeeName: e.name,
                department: e.department,
                hoursWorked,
                hourlyRate: Number(e.hourlyRate),
                grossPay,
                totalDeductions,
                netPay,
                anomalies: [],
            });
        }
        await this.itemModel.insertMany(items, { ordered: false });
        run.totalGrossPay = Number(totalGross.toFixed(2));
        run.totalDeductions = Number((totalGross - totalNet).toFixed(2));
        run.totalNetPay = Number(totalNet.toFixed(2));
        await run.save();
        return { message: 'Payroll calculated successfully', payrollRun: run };
    }
    async getRun(runId) {
        const payrollRun = await this.runModel.findById(runId);
        if (!payrollRun)
            throw new common_1.NotFoundException('Payroll run not found');
        const items = await this.itemModel.find({ payrollRunId: runId });
        return { payrollRun, items, itemCount: items.length };
    }
    async getEmployeeHistory(employeeId) {
        const payrollItems = await this.itemModel.find({ employeeId }).sort({ createdAt: -1 });
        return { employeeId, payrollItems };
    }
    async approve(runId, userId) {
        const run = await this.runModel.findByIdAndUpdate(runId, {
            status: 'approved',
            approvalStatus: 'approved',
            approvedBy: userId,
            approvalDate: new Date(),
        }, { new: true });
        if (!run)
            throw new common_1.NotFoundException('Payroll run not found');
        return { message: 'Payroll approved successfully', payrollRun: run };
    }
    async reject(runId, reason, userId) {
        if (!reason)
            throw new common_1.BadRequestException('Rejection reason is required');
        const run = await this.runModel.findByIdAndUpdate(runId, {
            status: 'draft',
            approvalStatus: 'rejected',
            approvedBy: userId,
            notes: reason,
        }, { new: true });
        if (!run)
            throw new common_1.NotFoundException('Payroll run not found');
        return { message: 'Payroll rejected successfully', payrollRun: run };
    }
    async summary(periodStart, periodEnd) {
        if (!periodStart || !periodEnd) {
            throw new common_1.BadRequestException('Period start and end dates are required');
        }
        const runs = await this.runModel.find({
            periodStart: { $gte: new Date(periodStart) },
            periodEnd: { $lte: new Date(periodEnd) },
        });
        return {
            period: { periodStart, periodEnd },
            summary: {
                totalRuns: runs.length,
                totalNetPay: runs.reduce((s, r) => s + Number(r.totalNetPay || 0), 0),
                totalGrossPay: runs.reduce((s, r) => s + Number(r.totalGrossPay || 0), 0),
            },
        };
    }
    async anomalies(runId) {
        const anomalies = await this.itemModel.find({
            payrollRunId: runId,
            anomalies: { $exists: true, $ne: [] },
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
        const run = await this.runModel.findById(runId);
        if (!run)
            throw new common_1.NotFoundException('Payroll run not found');
        return { message: 'Export payroll functionality to be implemented', runId, format: 'csv' };
    }
};
exports.PayrollService = PayrollService;
exports.PayrollService = PayrollService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(payroll_run_schema_1.PayrollRun.name)),
    __param(1, (0, mongoose_1.InjectModel)(payroll_item_schema_1.PayrollItem.name)),
    __param(2, (0, mongoose_1.InjectModel)(employee_schema_1.Employee.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map