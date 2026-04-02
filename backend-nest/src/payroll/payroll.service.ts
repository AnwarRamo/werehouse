import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { Queue } from 'bullmq';
import { QUEUE_JOBS, QUEUE_NAMES } from '../queues/queue.constants';

const PAYROLL_BATCH_SIZE = 250;

type PayrollQueuePayload = {
  payrollRunId: string;
  dto: CalculatePayrollDto;
  userId?: string;
};

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.PAYROLL) private readonly payrollQueue: Queue,
  ) {}

  private resolvePeriod(periodStart?: string, periodEnd?: string) {
    if (periodStart && periodEnd) {
      return { periodStart, periodEnd };
    }

    if (periodStart || periodEnd) {
      throw new BadRequestException('Period start and end dates must be provided together');
    }

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);

    return {
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
    };
  }

  async list(query: any) {
    const page = Number(query.page || 1);
    const limit = Math.min(Number(query.limit || 50), 200);
    const skip = (page - 1) * limit;

    const where: Prisma.PayrollRunWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.approvalStatus) where.approvalStatus = query.approvalStatus;

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

  async calculate(dto: CalculatePayrollDto, userId?: string) {
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

  async calculateAsync(dto: CalculatePayrollDto, userId?: string) {
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

  async getRun(runId: string) {
    const payrollRun = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!payrollRun) throw new NotFoundException('Payroll run not found');
    const items = await this.prisma.payrollItem.findMany({ where: { payrollRunId: runId } });
    return { payrollRun, items, itemCount: items.length };
  }

  async getEmployeeHistory(employeeId: string) {
    const payrollItems = await this.prisma.payrollItem.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
    return { employeeId, payrollItems };
  }

  async approve(runId: string, userId?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');

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

  async reject(runId: string, reason: string, userId?: string) {
    if (!reason) throw new BadRequestException('Rejection reason is required');
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');

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

  async summary(periodStart: string, periodEnd: string) {
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
        totalNetPay: runs.reduce((s: number, r: (typeof runs)[number]) => s + Number(r.totalNetPay || 0), 0),
        totalGrossPay: runs.reduce((s: number, r: (typeof runs)[number]) => s + Number(r.totalGrossPay || 0), 0),
      },
    };
  }

  async anomalies(runId: string) {
    const anomalies = await this.prisma.payrollItem.findMany({
      where: {
        payrollRunId: runId,
        NOT: { anomalies: { isEmpty: true } },
      },
    });

    return {
      runId,
      anomalyCount: anomalies.length,
      anomalies: anomalies.map((a: (typeof anomalies)[number]) => ({
        employeeId: a.employeeId,
        employeeName: a.employeeName,
        anomalies: a.anomalies,
      })),
    };
  }

  async export(runId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');

    const items = await this.prisma.payrollItem.findMany({
      where: { payrollRunId: runId },
      orderBy: { employeeId: 'asc' },
    });

    const rows: string[] = [];
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

    const fileName = `payroll-${run.runId}.csv`;
    return {
      mimeType: 'text/csv; charset=utf-8',
      fileName,
      content: rows.join('\n'),
    };
  }

  private escapeCsv(value: unknown): string {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  async processPayrollRunJob(payload: PayrollQueuePayload) {
    return this.processPayrollRun(payload.payrollRunId, payload.dto, payload.userId);
  }

  async markPayrollRunFailed(payrollRunId: string, message: string) {
    await this.prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status: 'failed',
        notes: message || 'Payroll calculation failed',
      },
    });
  }

  private async enqueuePayrollJob(payload: PayrollQueuePayload) {
    try {
      await this.payrollQueue.add(QUEUE_JOBS.PAYROLL_CALCULATE, payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
      });
      return;
    } catch {
      await this.processPayrollRunJob(payload);
    }
  }

  private async processPayrollRun(runId: string, dto: CalculatePayrollDto, userId?: string) {
    const activeEmployeesCount = await this.prisma.employee.count({ where: { status: 'active' } });
    if (activeEmployeesCount === 0) {
      throw new BadRequestException('No active employees found');
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

      const items: Prisma.PayrollItemCreateManyInput[] = employees.map((employee) => {
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
          hoursWorked: new Prisma.Decimal(hoursWorked),
          hourlyRate: new Prisma.Decimal(hourlyRate),
          grossPay: new Prisma.Decimal(grossPay),
          totalDeductions: new Prisma.Decimal(totalDeductions),
          netPay: new Prisma.Decimal(netPay),
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
        totalGrossPay: new Prisma.Decimal(totalGross.toFixed(2)),
        totalDeductions: new Prisma.Decimal((totalGross - totalNet).toFixed(2)),
        totalNetPay: new Prisma.Decimal(totalNet.toFixed(2)),
      },
    });

    return updatedRun;
  }
}
