import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PayrollRun, PayrollRunDocument } from './schemas/payroll-run.schema';
import { PayrollItem, PayrollItemDocument } from './schemas/payroll-item.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(PayrollRun.name) private runModel: Model<PayrollRunDocument>,
    @InjectModel(PayrollItem.name) private itemModel: Model<PayrollItemDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
  ) {}

  async list(query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;

    const [payrollRuns, total] = await Promise.all([
      this.runModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.runModel.countDocuments(filter),
    ]);

    return {
      payrollRuns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async calculate(dto: CalculatePayrollDto, userId?: string) {
    const employees = await this.employeeModel.find({ status: 'active' }).limit(100);
    if (employees.length === 0) {
      throw new BadRequestException('No active employees found');
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

  async getRun(runId: string) {
    const payrollRun = await this.runModel.findById(runId);
    if (!payrollRun) throw new NotFoundException('Payroll run not found');
    const items = await this.itemModel.find({ payrollRunId: runId });
    return { payrollRun, items, itemCount: items.length };
  }

  async getEmployeeHistory(employeeId: string) {
    const payrollItems = await this.itemModel.find({ employeeId }).sort({ createdAt: -1 });
    return { employeeId, payrollItems };
  }

  async approve(runId: string, userId?: string) {
    const run = await this.runModel.findByIdAndUpdate(
      runId,
      {
        status: 'approved',
        approvalStatus: 'approved',
        approvedBy: userId,
        approvalDate: new Date(),
      },
      { new: true },
    );
    if (!run) throw new NotFoundException('Payroll run not found');
    return { message: 'Payroll approved successfully', payrollRun: run };
  }

  async reject(runId: string, reason: string, userId?: string) {
    if (!reason) throw new BadRequestException('Rejection reason is required');
    const run = await this.runModel.findByIdAndUpdate(
      runId,
      {
        status: 'draft',
        approvalStatus: 'rejected',
        approvedBy: userId,
        notes: reason,
      },
      { new: true },
    );
    if (!run) throw new NotFoundException('Payroll run not found');
    return { message: 'Payroll rejected successfully', payrollRun: run };
  }

  async summary(periodStart: string, periodEnd: string) {
    if (!periodStart || !periodEnd) {
      throw new BadRequestException('Period start and end dates are required');
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

  async anomalies(runId: string) {
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

  async export(runId: string) {
    const run = await this.runModel.findById(runId);
    if (!run) throw new NotFoundException('Payroll run not found');
    return { message: 'Export payroll functionality to be implemented', runId, format: 'csv' };
  }
}
