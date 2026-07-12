import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginationMeta, resolvePagination } from '../common/utils/pagination.util';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { PayrollListQueryDto } from './dto/payroll-list-query.dto';
import { PayrollInputsQueryDto, UpsertPayrollInputDto } from './dto/payroll-input.dto';
import {
  BulkUpsertPayrollReceiptsDto,
  PayrollReceiptsQueryDto,
  UpsertPayrollReceiptDto,
} from './dto/payroll-receipt.dto';
import { Queue } from 'bullmq';
import { QUEUE_JOBS, QUEUE_NAMES } from '../queues/queue.constants';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { TransportationService } from '../transportation/transportation.service';
import { AttendanceAggregationService } from '../attendance/attendance-aggregation.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.types';
import {
  PAYROLL_BATCH_SIZE,
  WORK_DAYS_PER_MONTH,
  WORK_HOURS_PER_DAY,
  MINUTES_PER_HOUR as MINUTES_PER_HOUR_NUM,
  OVERTIME_MULTIPLIER,
  SICK_LEAVE_DEDUCTION_RATIO,
  WEEKEND_MULTIPLIER,
  PAYROLL_ROUNDING_UNIT,
} from '../common/constants/payroll.constants';

const STANDARD_WORK_DAYS = new Prisma.Decimal(WORK_DAYS_PER_MONTH);
const STANDARD_HOURS_PER_DAY = new Prisma.Decimal(WORK_HOURS_PER_DAY);
const MINUTES_PER_HOUR = new Prisma.Decimal(MINUTES_PER_HOUR_NUM);
const MULTIPLIER_OVERTIME = new Prisma.Decimal(OVERTIME_MULTIPLIER);
const MULTIPLIER_SICK_LEAVE = new Prisma.Decimal(SICK_LEAVE_DEDUCTION_RATIO);
const MULTIPLIER_WEEKEND = new Prisma.Decimal(WEEKEND_MULTIPLIER);

type PayrollQueuePayload = {
  payrollRunId: string;
  dto: CalculatePayrollDto;
  userId?: string;
};

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @InjectQueue(QUEUE_NAMES.PAYROLL) private readonly payrollQueue?: Queue,
    @Optional() private readonly transportationService?: TransportationService,
    @Optional() private readonly aggregationService?: AttendanceAggregationService,
  ) {}

  private toDecimal(value: Prisma.Decimal | number | string | null | undefined) {
    if (value instanceof Prisma.Decimal) {
      return value;
    }
    return new Prisma.Decimal(value ?? 0);
  }

  /** Normalize any date string to YYYY-MM-DD (strip timezone offsets) */
  private toDateOnly(value: string): Date {
    return new Date(value.slice(0, 10) + 'T00:00:00.000Z');
  }

  private roundUpToNearestThousand(value: Prisma.Decimal) {
    const numeric = value.toNumber();
    if (!Number.isFinite(numeric) || numeric === 0) {
      return new Prisma.Decimal(0);
    }
    return new Prisma.Decimal(Math.ceil(numeric / PAYROLL_ROUNDING_UNIT) * PAYROLL_ROUNDING_UNIT);
  }

  private resolveAttendanceValue(value: number | null | undefined, fallback: number, enabled: boolean) {
    if (value !== null && value !== undefined) {
      return Number(value);
    }

    return enabled ? fallback : 0;
  }



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

  private resolveMonthPeriod(month: string) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!match) {
      throw new BadRequestException('Month must be in YYYY-MM format');
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const periodStartDate = new Date(Date.UTC(year, monthIndex, 1));
    const periodEndDate = new Date(Date.UTC(year, monthIndex + 1, 0));

    return {
      periodStartDate,
      periodEndDate,
      periodStart: `${match[1]}-${match[2]}-01`,
      periodEnd: `${match[1]}-${match[2]}-${String(periodEndDate.getUTCDate()).padStart(2, '0')}`,
    };
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private async resolveLatestPayrollRunIdForMonth(month: string) {
    const period = this.resolveMonthPeriod(month);
    const latestRun = await this.prisma.payrollRun.findFirst({
      where: {
        periodStart: {
          gte: period.periodStartDate,
          lte: period.periodEndDate,
        },
      },
      orderBy: { runDate: 'desc' },
      select: { id: true },
    });
    return latestRun?.id ?? null;
  }

  private resolveReceiptDate(isReceived: boolean, receivedAt?: string) {
    if (!isReceived) {
      return null;
    }

    const effectiveDate = receivedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    return this.toDateOnly(effectiveDate);
  }

  private async resolvePayrollRun(runIdentifier: string) {
    const where: Prisma.PayrollRunWhereInput = this.isUuid(runIdentifier)
      ? {
          OR: [{ id: runIdentifier }, { runId: runIdentifier }],
        }
      : { runId: runIdentifier };

    const run = await this.prisma.payrollRun.findFirst({ where });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  async list(query: PayrollListQueryDto) {
    const { page, limit, skip } = resolvePagination(query);

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

    return {
      data: payrollRuns,
      ...paginationMeta(page, limit, total),
    };
  }

  async listInputs(query: PayrollInputsQueryDto) {
    const page = Math.max(1, (query as any).page ?? 1);
    const limit = Math.min(200, Math.max(1, (query as any).limit ?? 50));
    const skip = (page - 1) * limit;
    const where: Prisma.PayrollInputWhereInput = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.periodStart && query.periodEnd) {
      where.periodStart = this.toDateOnly(query.periodStart);
      where.periodEnd = this.toDateOnly(query.periodEnd);
    }

    const [records, total] = await Promise.all([
      this.prisma.payrollInput.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payrollInput.count({ where }),
    ]);

    return {
      data: records,
      ...paginationMeta(page, limit, total),
    };
  }

  async upsertInput(dto: UpsertPayrollInputDto) {
    const periodStart = dto.periodStart.slice(0, 10);
    const periodEnd = dto.periodEnd.slice(0, 10);

    const data = {
      employeeId: dto.employeeId,
      periodStart: this.toDateOnly(periodStart),
      periodEnd: this.toDateOnly(periodEnd),
      lateMinutes: Number(dto.lateMinutes ?? 0),
      earlyLeaveMinutes: Number(dto.earlyLeaveMinutes ?? 0),
      absenceDays:
        dto.absenceDays === undefined || dto.absenceDays === null
          ? null
          : Number(dto.absenceDays),
      sickLeaveDays: Number(dto.sickLeaveDays ?? 0),
      adminLeaveDays: Number(dto.adminLeaveDays ?? 0),
      unpaidLeaveDays: Number(dto.unpaidLeaveDays ?? 0),
      deathLeaveDays: Number(dto.deathLeaveDays ?? 0),
      unpaidHours: new Prisma.Decimal((dto.unpaidHours ?? 0).toString()),
      overtimeRegularMinutes: Number(dto.overtimeRegularMinutes ?? 0),
      overtimeWeekendDays: new Prisma.Decimal((dto.overtimeWeekendDays ?? 0).toString()),
      penaltyAmount:
        dto.penaltyAmount === undefined || dto.penaltyAmount === null
          ? null
          : new Prisma.Decimal(dto.penaltyAmount.toString()),
      clothingDeduction: new Prisma.Decimal((dto.clothingDeduction ?? 0).toString()),
      bonusAdjustment:
        dto.bonusAdjustment === undefined || dto.bonusAdjustment === null
          ? null
          : new Prisma.Decimal(dto.bonusAdjustment.toString()),
      advanceAmount:
        dto.advanceAmount === undefined || dto.advanceAmount === null
          ? null
          : new Prisma.Decimal(dto.advanceAmount.toString()),
      insuranceAmount:
        dto.insuranceAmount === undefined || dto.insuranceAmount === null
          ? null
          : new Prisma.Decimal(dto.insuranceAmount.toString()),
      transportAllowanceOverride:
        dto.transportAllowanceOverride === undefined || dto.transportAllowanceOverride === null
          ? null
          : new Prisma.Decimal(dto.transportAllowanceOverride.toString()),
      notes: dto.notes ?? null,
    } as Prisma.PayrollInputUncheckedCreateInput;

    return this.prisma.payrollInput.upsert({
      where: {
        employeeId_periodStart_periodEnd: {
          employeeId: dto.employeeId,
          periodStart: this.toDateOnly(periodStart),
          periodEnd: this.toDateOnly(periodEnd),
        },
      },
      update: data,
      create: data,
    });
  }

  /**
   * Compute earned salary for a partial period (from periodStart to endDate)
   * using DailyAttendanceLog as the single source of truth for attendance metrics.
   *
   * Multipliers strictly applied:
   *   - Morning Delay penalty:  1.5× minuteWage per late minute
   *   - Early Leave penalty:    1.0× minuteWage per early-leave minute
   *   - Normal Overtime bonus:  1.5× minuteWage per weekday overtime minute
   *   - Weekend Overtime bonus: 2.0× dailyWage per Friday overtime day
   *
   * Returns the net earned salary (prorated base + overtime bonuses − attendance penalties).
   */
  private async computeEarnedSalaryForPeriod(
    employeeId: string,
    periodStart: Date,
    endDate: Date,
    workDays: number,
    hoursPerDayEmp: number,
  ): Promise<Prisma.Decimal> {
    // Fetch salary config
    const [employee, salaryRecord] = await Promise.all([
      this.prisma.employee.findUnique({
        where: { employeeId },
        select: { hourlyRate: true, baseSalary: true },
      }),
      this.prisma.employeeSalary.findUnique({ where: { employeeId } }),
    ]);

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    // Count attendance days from IN records within [periodStart, endDate]
    const attendanceInRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        type: 'IN',
        date: {
          gte: periodStart.toISOString().slice(0, 10),
          lte: endDate.toISOString().slice(0, 10),
        },
      },
      select: { date: true },
    });
    const uniqueDates = new Set(attendanceInRecords.map((r) => r.date));
    const attendanceDays = uniqueDates.size;

    // ── Trigger real-time aggregation for each attendance date ──
    // DailyAttendanceLog (DELAY_MINUTES, EARLY_LEAVE_MINUTES, OVERTIME_MINUTES)
    // may not yet exist for these dates. Aggregate now so the queries below
    // pick up the freshly computed penalty records.
    if (this.aggregationService && uniqueDates.size > 0) {
      await Promise.all(
        [...uniqueDates].map((dateStr) =>
          this.aggregationService!
            .aggregateEmployeeDay(employeeId, dateStr)
            .catch((err) =>
              this.logger.warn(
                `[EARNED] Aggregation failed for ${employeeId} on ${dateStr}: ${err.message}`,
              ),
            ),
        ),
      );
    }

    // Fetch DailyAttendanceLog records for the partial period
    const fromDate = new Date(periodStart);
    const toDate = new Date(endDate);
    toDate.setUTCHours(23, 59, 59, 999);

    const [delayLogs, overtimeLogs, earlyLeaveLogs] = await Promise.all([
      this.prisma.dailyAttendanceLog.findMany({
        where: {
          employeeId,
          recordType: 'DELAY_MINUTES',
          date: { gte: fromDate, lte: toDate },
        },
        select: { value: true },
      }),
      this.prisma.dailyAttendanceLog.findMany({
        where: {
          employeeId,
          recordType: 'OVERTIME_MINUTES',
          date: { gte: fromDate, lte: toDate },
        },
        select: { date: true, value: true },
      }),
      this.prisma.dailyAttendanceLog.findMany({
        where: {
          employeeId,
          recordType: 'EARLY_LEAVE_MINUTES',
          date: { gte: fromDate, lte: toDate },
        },
        select: { value: true },
      }),
    ]);

    // ── g3 formula: baseSalary + livingAllowance + lumpSumSalary ──
    const fallbackBaseSalary = Number(employee.hourlyRate || 0) * hoursPerDayEmp * workDays;
    const baseSalary = this.toDecimal(
      salaryRecord?.baseSalary ?? employee.baseSalary ?? fallbackBaseSalary,
    );
    const livingAllowance = this.toDecimal(salaryRecord?.livingAllowance ?? 0);
    const lumpSumSalary = this.toDecimal(salaryRecord?.lumpSumSalary ?? 0);

    const g3 = baseSalary
      .plus(livingAllowance)
      .plus(lumpSumSalary);
    const dailyWage = g3.div(STANDARD_WORK_DAYS);
    const hourlyWage = dailyWage.div(new Prisma.Decimal(hoursPerDayEmp));
    const minuteWage = hourlyWage.div(MINUTES_PER_HOUR);

    // 1. Prorated earned base = dailyWage × attendance days actually worked
    const earnedBase = dailyWage.times(this.toDecimal(attendanceDays));

    // 2. Aggregate DELAY_MINUTES → penalty at 1.5× minuteWage
    let totalDelayMinutes = 0;
    for (const log of delayLogs) {
      const minutes = Number(log.value ?? 0);
      if (Number.isFinite(minutes) && minutes > 0) {
        totalDelayMinutes += minutes;
      }
    }
    const latePenalty = minuteWage
      .times(this.toDecimal(totalDelayMinutes))
      .times(new Prisma.Decimal(1.5));

    // 3. Aggregate EARLY_LEAVE_MINUTES → penalty at 1.0× minuteWage
    let totalEarlyLeaveMinutes = 0;
    for (const log of earlyLeaveLogs) {
      const minutes = Number(log.value ?? 0);
      if (Number.isFinite(minutes) && minutes > 0) {
        totalEarlyLeaveMinutes += minutes;
      }
    }
    const earlyLeavePenalty = minuteWage.times(this.toDecimal(totalEarlyLeaveMinutes));

    // 4. Aggregate OVERTIME_MINUTES → classify weekday vs weekend (Friday)
    let weekdayOvertimeMinutes = 0;
    let weekendOvertimeDays = 0;

    for (const log of overtimeLogs) {
      const minutes = Number(log.value ?? 0);
      if (!Number.isFinite(minutes) || minutes <= 0) continue;

      const d = new Date(log.date);
      if (d.getDay() === 5) {
        // Friday = weekend → count as weekend overtime day
        weekendOvertimeDays += 1;
      } else {
        weekdayOvertimeMinutes += minutes;
      }
    }

    // Weekday overtime bonus: 1.5× minuteWage
    const overtimeRegularPay = minuteWage
      .times(new Prisma.Decimal(1.5))
      .times(this.toDecimal(weekdayOvertimeMinutes));

    // Weekend overtime bonus: 2.0× dailyWage per Friday day
    const overtimeWeekendPay = dailyWage
      .times(new Prisma.Decimal(2.0))
      .times(this.toDecimal(weekendOvertimeDays));

    // 5. Net earned salary = earnedBase + overtime bonuses − attendance penalties
    const netEarned = earnedBase
      .plus(overtimeRegularPay)
      .plus(overtimeWeekendPay)
      .minus(latePenalty)
      .minus(earlyLeavePenalty);

    this.logger.log(
      `[EARNED] ${employeeId} ${periodStart.toISOString().slice(0,10)}→${endDate.toISOString().slice(0,10)} ` +
      `g3=${g3.toFixed(2)} days=${attendanceDays} delay=${totalDelayMinutes}min early=${totalEarlyLeaveMinutes}min ` +
      `otWeekday=${weekdayOvertimeMinutes}min otWeekendDays=${weekendOvertimeDays} net=${netEarned.toFixed(2)}`,
    );

    return netEarned;
  }

  async calculateProvisionalSettlement(employeeId: string, terminationDateStr: string) {
    const terminationDate = new Date(terminationDateStr);
    const month = terminationDateStr.substring(0, 7); // YYYY-MM

    // Compute month boundaries for bonus filtering
    const [yearStr, monthStr] = month.split('-');
    const monthStart = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
    const monthEnd = new Date(Date.UTC(Number(yearStr), Number(monthStr), 0, 23, 59, 59, 999));

    // 1. Fetch employee record
    const employee = await this.prisma.employee.findUnique({ where: { employeeId } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found.`);
    }

    const workDays = employee.workDaysInPeriod ?? 26;
    const hoursPerDayEmp = employee.hoursPerDay ?? 8;

    // 2. Compute earned salary dynamically from DailyAttendanceLog (start of month → terminationDate)
    const periodStart = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
    const earnedSalary = await this.computeEarnedSalaryForPeriod(
      employeeId,
      periodStart,
      terminationDate,
      workDays,
      hoursPerDayEmp,
    );

    // 3. Use end-of-day for date comparisons (terminationDate may be midnight UTC)
    const terminationEndOfDay = new Date(terminationDate);
    terminationEndOfDay.setUTCHours(23, 59, 59, 999);

    // 4. Fetch bonuses, advances, penalties in parallel
    const [bonuses, advances, penalties] = await Promise.all([
      this.prisma.employeeBonus.findMany({
        where: {
          employeeId,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      this.prisma.employeeAdvance.findMany({
        where: {
          employeeId,
          issueDate: { lte: terminationEndOfDay },
          remainingAmount: { gt: 0 },
        },
      }),
      this.prisma.employeePenalty.findMany({
        where: {
          employeeId,
          issueDate: { lte: terminationEndOfDay },
        },
      }),
    ]);

    const totalBonuses = bonuses.reduce((sum, b) => {
      return sum.plus(this.toDecimal(b.bonusAmount)).plus(this.toDecimal(b.assistanceAmount));
    }, new Prisma.Decimal(0));

    const totalAdvances = advances.reduce((sum, a) => {
      const installment = this.toDecimal(a.installmentAmount).toNumber();
      const remaining = this.toDecimal(a.remainingAmount).toNumber();
      // Lump-sum advance (installment=0): deduct entire remaining amount
      // Installment-based: deduct the smaller of installment or remaining
      const deductible = installment > 0 ? Math.min(installment, remaining) : remaining;
      return sum.plus(new Prisma.Decimal(deductible));
    }, new Prisma.Decimal(0));

    const totalPenalties = penalties.reduce((sum, p) => {
      return sum.plus(this.toDecimal(p.amount));
    }, new Prisma.Decimal(0));

    const employeeSalary = await this.prisma.employeeSalary.findUnique({ where: { employeeId } });
    const insuranceDeduction = this.toDecimal(employeeSalary?.insuranceAmount);

    // Calculate absenceDays for diagnostic logging (prorated earned salary already handles financial impact)
    const attendanceInRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        type: 'IN',
        date: {
          gte: periodStart.toISOString().slice(0, 10),
          lte: terminationDate.toISOString().slice(0, 10),
        },
      },
      select: { date: true },
    });
    const uniqueDates = new Set(attendanceInRecords.map((r) => r.date));
    const attendanceDays = uniqueDates.size;
    const absenceDays = Math.max(0, workDays - attendanceDays);
    const absencePenalty = new Prisma.Decimal(0); // Force absencePenalty to 0 for provisional settlement

    // 5. Bus subscription deduction (prorated for the partial month up to termination date)
    let busDeduction = 0;
    if (this.transportationService) {
      try {
        const batchResult = await this.transportationService.calculateBatchBusDeductions(
          [employeeId],
          terminationDate,
          { isProvisional: true, terminationDate: terminationDate }, // Pass options for provisional settlement
        );
        busDeduction = batchResult.get(employeeId) ?? 0;
      } catch (err) {
        this.logger.warn(
          `Failed to calculate bus deduction for provisional settlement: ${(err as Error)?.message || String(err)}`,
        );
      }
    }

    const totalDeductions = totalAdvances
      .plus(totalPenalties)
      .plus(insuranceDeduction)
      .plus(new Prisma.Decimal(busDeduction))
      .plus(absencePenalty);

    // TEMP DIAGNOSTIC LOG
    this.logger.log(`[PROVISIONAL] empId=${employeeId} termDate=${terminationDateStr} termEndOfDay=${terminationEndOfDay.toISOString()}`);
    this.logger.log(`[PROVISIONAL] advances=${JSON.stringify(advances.map(a => ({id:a.id,totalAmount:a.totalAmount.toString(),installment:a.installmentAmount.toString(),remaining:a.remainingAmount.toString(),issueDate:a.issueDate})))}`);
    this.logger.log(`[PROVISIONAL] totalAdvances=${totalAdvances.toString()} totalPenalties=${totalPenalties.toString()} insurance=${insuranceDeduction.toString()} busDeduction=${busDeduction} absenceDays=${absenceDays} absencePenalty=${absencePenalty.toString()}`);
    this.logger.log(`[PROVISIONAL] totalDeductions=${totalDeductions.toString()}`);

    // Final provisional settlement
    const provisionalFinalSalary = earnedSalary.plus(totalBonuses).minus(totalDeductions);

    return {
      employeeId: employee.employeeId,
      employeeName: employee.name,
      terminationDate: terminationDateStr,
      earnedSalary: earnedSalary.toFixed(2),
      bonuses: totalBonuses.toFixed(2),
      deductions: totalDeductions.toFixed(2),
      provisionalTotal: provisionalFinalSalary.toFixed(2),
      currency: employee.currency ?? 'SYP',
    };
  }

  async calculate(dto: CalculatePayrollDto, userId?: string) {
    const periodStart = this.toDateOnly(dto.periodStart);
    const periodEnd = this.toDateOnly(dto.periodEnd);

    // Check for an existing payroll run for the given period
    const existingRun = await this.prisma.payrollRun.findFirst({
      where: {
        periodStart: periodStart,
        periodEnd: periodEnd,
      },
    });

    if (existingRun) {
      this.logger.log(`Deleting existing payroll run ${existingRun.runId} for period ${dto.periodStart} - ${dto.periodEnd}`);
      await this.deletePayrollRun(existingRun.id, userId);
    }

    const runDateKey = dto.periodStart.slice(0, 10).replace(/-/g, '');
    const runId = `PAY${runDateKey}-${Date.now().toString().slice(-4)}`;

    const run = await this.prisma.payrollRun.create({
      data: {
        runId,
        periodStart: periodStart,
        periodEnd: periodEnd,
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
        periodStart: this.toDateOnly(dto.periodStart),
        periodEnd: this.toDateOnly(dto.periodEnd),
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
    const payrollRun = await this.resolvePayrollRun(runId);
    const items = await this.prisma.payrollItem.findMany({ where: { payrollRunId: payrollRun.id } });
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

  async reject(runId: string, reason: string, userId?: string) {
    if (!reason) throw new BadRequestException('Rejection reason is required');
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

  async deletePayrollRun(runId: string, userId?: string) {
    const run = await this.resolvePayrollRun(runId);

    if (run.approvalStatus === 'approved') {
      throw new BadRequestException('Cannot delete an approved payroll run');
    }

    const items = await this.prisma.payrollItem.findMany({ where: { payrollRunId: run.id } });

    await this.prisma.deletedRecordHistory.create({
      data: {
        entityType: 'PayrollRun',
        recordId: run.id,
        payload: {
          run,
          items,
          deletedBy: userId,
          deletedAt: new Date().toISOString(),
        },
      },
    });

    await this.prisma.payrollItem.deleteMany({ where: { payrollRunId: run.id } });
    await this.prisma.payrollRun.delete({ where: { id: run.id } });

    return { message: 'Payroll run deleted successfully', runId: run.runId };
  }

  async summary(periodStart?: string, periodEnd?: string) {
    const period = this.resolvePeriod(periodStart, periodEnd);

    const runs = await this.prisma.payrollRun.findMany({
      where: {
        periodStart: { gte: this.toDateOnly(period.periodStart), lte: this.toDateOnly(period.periodEnd) },
      },
    });

    return {
      period,
      summary: {
        totalRuns: runs.length,
        totalNetPay: Number(
          runs
            .reduce((sum, run) => sum.plus(this.toDecimal(run.totalNetPay || 0)), new Prisma.Decimal(0))
            .toFixed(2),
        ),
        totalGrossPay: Number(
          runs
            .reduce((sum, run) => sum.plus(this.toDecimal(run.totalGrossPay || 0)), new Prisma.Decimal(0))
            .toFixed(2),
        ),
      },
    };
  }

  async report(month: string) {
    const period = this.resolveMonthPeriod(month);

    const runs = await this.prisma.payrollRun.findMany({
      where: {
        periodStart: {
          gte: period.periodStartDate,
          lte: period.periodEndDate,
        },
      },
      orderBy: { runDate: 'desc' },
    });

    if (runs.length === 0) {
      return {
        month,
        period: {
          startDate: period.periodStart,
          endDate: period.periodEnd,
        },
        runsCount: 0,
        latestRun: null,
        totals: {
          totalGrossPay: 0,
          totalDeductions: 0,
          totalNetPay: 0,
        },
        items: [],
      };
    }

    const latestRun = runs[0];
    const items = await this.prisma.payrollItem.findMany({
      where: { payrollRunId: latestRun.id },
      orderBy: { employeeId: 'asc' },
    });

    return {
      month,
      period: {
        startDate: period.periodStart,
        endDate: period.periodEnd,
      },
      runsCount: runs.length,
      latestRun,
      totals: {
        totalGrossPay: Number(
          runs
            .reduce((sum, run) => sum.plus(this.toDecimal(run.totalGrossPay || 0)), new Prisma.Decimal(0))
            .toFixed(2),
        ),
        totalDeductions: Number(
          runs
            .reduce((sum, run) => sum.plus(this.toDecimal(run.totalDeductions || 0)), new Prisma.Decimal(0))
            .toFixed(2),
        ),
        totalNetPay: Number(
          runs
            .reduce((sum, run) => sum.plus(this.toDecimal(run.totalNetPay || 0)), new Prisma.Decimal(0))
            .toFixed(2),
        ),
      },
      items,
    };
  }

  async listReceipts(query: PayrollReceiptsQueryDto) {
    const period = this.resolveMonthPeriod(query.month);
    const latestRunId = await this.resolveLatestPayrollRunIdForMonth(query.month);
    const data = await this.prisma.payrollReceipt.findMany({
      where: {
        month: query.month,
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      },
      orderBy: { employeeId: 'asc' },
    });

    return {
      month: query.month,
      period: {
        startDate: period.periodStart,
        endDate: period.periodEnd,
      },
      latestRunId,
      data,
    };
  }

  async upsertReceipt(employeeId: string, dto: UpsertPayrollReceiptDto, user?: AuthenticatedUser) {
    this.resolveMonthPeriod(dto.month);

    const employee = await this.prisma.employee.findUnique({
      where: { employeeId },
      select: { employeeId: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!dto.isReceived) {
      await this.prisma.payrollReceipt.deleteMany({
        where: {
          employeeId,
          month: dto.month,
        },
      });

      return {
        success: true,
        data: {
          employeeId,
          month: dto.month,
          isReceived: false,
          receivedAt: null,
        },
      };
    }

    const payrollRunId = await this.resolveLatestPayrollRunIdForMonth(dto.month);
    const receipt = await this.prisma.payrollReceipt.upsert({
      where: {
        employeeId_month: {
          employeeId,
          month: dto.month,
        },
      },
      update: {
        payrollRunId,
        isReceived: true,
        receivedAt: this.resolveReceiptDate(true, dto.receivedAt),
        receivedBy: user?.userId || user?.username || 'system',
      },
      create: {
        employeeId,
        month: dto.month,
        payrollRunId,
        isReceived: true,
        receivedAt: this.resolveReceiptDate(true, dto.receivedAt),
        receivedBy: user?.userId || user?.username || 'system',
      },
    });

    return {
      success: true,
      data: receipt,
    };
  }

  async bulkUpsertReceipts(dto: BulkUpsertPayrollReceiptsDto, user?: AuthenticatedUser) {
    this.resolveMonthPeriod(dto.month);

    const uniqueEmployeeIds = Array.from(new Set(dto.employeeIds.filter(Boolean)));
    if (uniqueEmployeeIds.length === 0) {
      throw new BadRequestException('At least one employeeId is required');
    }

    const existingEmployees = await this.prisma.employee.findMany({
      where: { employeeId: { in: uniqueEmployeeIds } },
      select: { employeeId: true },
    });
    const existingEmployeeIdSet = new Set(existingEmployees.map((employee) => employee.employeeId));
    const missingEmployeeIds = uniqueEmployeeIds.filter((employeeId) => !existingEmployeeIdSet.has(employeeId));

    if (missingEmployeeIds.length > 0) {
      throw new NotFoundException(`Employees not found: ${missingEmployeeIds.join(', ')}`);
    }

    if (!dto.isReceived) {
      const deleted = await this.prisma.payrollReceipt.deleteMany({
        where: {
          month: dto.month,
          employeeId: { in: uniqueEmployeeIds },
        },
      });

      return {
        success: true,
        count: uniqueEmployeeIds.length,
        deletedCount: deleted.count,
        data: uniqueEmployeeIds.map((employeeId) => ({
          employeeId,
          month: dto.month,
          isReceived: false,
          receivedAt: null,
        })),
      };
    }

    const payrollRunId = await this.resolveLatestPayrollRunIdForMonth(dto.month);
    const receivedAt = this.resolveReceiptDate(true, dto.receivedAt);
    const actorId = user?.userId || user?.username || 'system';

    const data = await this.prisma.$transaction(
      uniqueEmployeeIds.map((employeeId) =>
        this.prisma.payrollReceipt.upsert({
          where: {
            employeeId_month: {
              employeeId,
              month: dto.month,
            },
          },
          update: {
            payrollRunId,
            isReceived: true,
            receivedAt,
            receivedBy: actorId,
          },
          create: {
            employeeId,
            month: dto.month,
            payrollRunId,
            isReceived: true,
            receivedAt,
            receivedBy: actorId,
          },
        }),
      ),
    );

    return {
      success: true,
      count: data.length,
      data,
    };
  }

  async anomalies(runId: string) {
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
      anomalies: anomalies.map((a: (typeof anomalies)[number]) => ({
        employeeId: a.employeeId,
        employeeName: a.employeeName,
        anomalies: a.anomalies,
      })),
    };
  }

  async export(runId: string) {
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

  async exportPdf(runId: string) {
    const run = await this.resolvePayrollRun(runId);

    const items = await this.prisma.payrollItem.findMany({
      where: { payrollRunId: run.id },
      orderBy: { employeeId: 'asc' },
    });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([842, 595]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const margin = 24;
    let y = 565;

    page.drawText(`Payroll Report: ${run.runId}`, {
      x: margin,
      y,
      size: 14,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 20;
    page.drawText(`Period: ${run.periodStart.toISOString().slice(0, 10)} to ${run.periodEnd.toISOString().slice(0, 10)}`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 24;

    const header = 'EmpID        Name                    Dept            Gross     Deductions   Net';
    page.drawText(header, { x: margin, y, size: 10, font: bold });
    y -= 14;

    for (const item of items) {
      if (y < 36) {
        break;
      }

      const netDisplay = Number(item.netPayRounded ?? item.netPay);
      const line = [
        (item.employeeId || '').padEnd(12).slice(0, 12),
        (item.employeeName || '').padEnd(24).slice(0, 24),
        (item.department || '').padEnd(14).slice(0, 14),
        Number(item.grossPay).toFixed(2).padStart(10),
        Number(item.totalDeductions).toFixed(2).padStart(12),
        netDisplay.toFixed(2).padStart(8),
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

  private buildCsv(run: NonNullable<Awaited<ReturnType<PrismaService['payrollRun']['findUnique']>>>, items: Awaited<ReturnType<PrismaService['payrollItem']['findMany']>>) {
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
      'netPayRounded',
      'roundingDifference',
      'netPayWithAdvance',
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
        this.escapeCsv(Number(item.netPayRounded)),
        this.escapeCsv(Number(item.roundingDifference)),
        this.escapeCsv(Number(item.netPayWithAdvance)),
        this.escapeCsv((item.anomalies || []).join('; ')),
      ].join(','));
    }

    return rows.join('\n');
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
      if (!this.payrollQueue) {
        throw new Error('Payroll queue is not available');
      }

      const workers = await this.payrollQueue.getWorkers();
      if (workers.length === 0) {
        throw new Error('No payroll worker is currently connected');
      }

      await this.payrollQueue.add(QUEUE_JOBS.PAYROLL_CALCULATE, payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
      });
      return;
    } catch (error) {
      this.logger.warn(
        `Payroll queue unavailable; falling back to inline execution. Reason: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      await this.processPayrollRunJob(payload);
    }
  }

  private async processPayrollRun(runId: string, dto: CalculatePayrollDto, userId?: string) {
    const targetEmployees = await this.prisma.employee.findMany({
      where: {
        OR: [
          { status: 'active' },
          { status: 'terminated', isSettled: false },
        ],
      },
      orderBy: { employeeId: 'asc' },
      select: {
        employeeId: true,
        name: true,
        department: true,
        hourlyRate: true,
        baseSalary: true,
        workDaysInPeriod: true,
        hoursPerDay: true,
        gracePeriodMinutes: true,
      },
    });

    if (targetEmployees.length === 0) {
      throw new BadRequestException('No eligible employees found');
    }

    const employeeIds = targetEmployees.map((employee) => employee.employeeId);
    const periodStart = dto.periodStart.slice(0, 10);
    const periodEnd = dto.periodEnd.slice(0, 10);
    const periodTag = periodStart.slice(0, 7);

    const defaultWorkDaysInPeriod = Math.max(1, Number(dto.workDaysInPeriod ?? 26));
    const defaultHoursPerDay = Math.max(1, Number(dto.hoursPerDay ?? 8));

    // تحديد الـ flags للخصومات (افتراضياً مفعل)
    const includeAttendanceDeductions = dto.includeAttendanceDeductions !== false;
    const includeTransportationDeductions = dto.includeTransportationDeductions !== false;

    const [
      salaryRecords,
      bonuses,
      advances,
      penalties,
      attendanceInRecords,
      payrollInputs,
      dailyOvertimeLogs,
      dailyEarlyLeaveLogs,
      dailyDelayLogs,
    ] = await Promise.all([


      this.prisma.employeeSalary.findMany({
        where: { employeeId: { in: employeeIds } },
      }),
      this.prisma.employeeBonus.findMany({
        where: {
          employeeId: { in: employeeIds },
          // period column may not exist in DB yet — filter by createdAt date range
          createdAt: {
            gte: new Date(`${periodStart}T00:00:00.000Z`),
            lte: new Date(`${periodEnd}T23:59:59.999Z`),
          },
        },
      }),
      this.prisma.employeeAdvance.findMany({
        where: {
          employeeId: { in: employeeIds },
          remainingAmount: { gt: new Prisma.Decimal(0) },
        },
      }),
      this.prisma.employeePenalty.findMany({
        where: {
          employeeId: { in: employeeIds },
          issueDate: {
            gte: new Date(`${periodStart}T00:00:00.000Z`),
            lte: new Date(`${periodEnd}T23:59:59.999Z`),
          },
        },
      }),
      // Attendance IN records — used ONLY for counting attendance days (absence calculation)
      includeAttendanceDeductions
        ? this.prisma.attendanceRecord.findMany({
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
            },
          })
        : Promise.resolve([]),
      this.prisma.payrollInput.findMany({
        where: {
          employeeId: { in: employeeIds },
          periodStart: this.toDateOnly(periodStart),
          periodEnd: this.toDateOnly(periodEnd),
        },
      }),
      // DailyAttendanceLog: OVERTIME_MINUTES (all days — weekday + weekend)
      this.prisma.dailyAttendanceLog.findMany({
        where: {
          employeeId: { in: employeeIds },
          recordType: 'OVERTIME_MINUTES',
          date: {
            gte: new Date(`${periodStart}T00:00:00.000Z`),
            lte: new Date(`${periodEnd}T23:59:59.999Z`),
          },
        },
        select: {
          employeeId: true,
          date: true,
          value: true,
        },
      }),
      // DailyAttendanceLog: EARLY_LEAVE_MINUTES from missing-minutes engine
      this.prisma.dailyAttendanceLog.findMany({
        where: {
          employeeId: { in: employeeIds },
          recordType: 'EARLY_LEAVE_MINUTES',
          date: {
            gte: new Date(`${periodStart}T00:00:00.000Z`),
            lte: new Date(`${periodEnd}T23:59:59.999Z`),
          },
        },
        select: {
          employeeId: true,
          value: true,
        },
      }),
      // DailyAttendanceLog: DELAY_MINUTES from aggregation engine
      this.prisma.dailyAttendanceLog.findMany({
        where: {
          employeeId: { in: employeeIds },
          recordType: 'DELAY_MINUTES',
          date: {
            gte: new Date(`${periodStart}T00:00:00.000Z`),
            lte: new Date(`${periodEnd}T23:59:59.999Z`),
          },
        },
        select: {
          employeeId: true,
          value: true,
        },
      }),
    ]);


    // ── Trigger on-demand aggregation for all employee attendance dates ──
    // This ensures DailyAttendanceLog (DELAY, EARLY_LEAVE, OVERTIME) is
    // populated BEFORE the queries below read it.
    if (this.aggregationService && includeAttendanceDeductions) {
      const empDatesMap = new Map<string, Set<string>>();
      for (const rec of attendanceInRecords) {
        const dates = empDatesMap.get(rec.employeeId) || new Set<string>();
        dates.add(rec.date);
        empDatesMap.set(rec.employeeId, dates);
      }
      const aggregationPromises: Promise<unknown>[] = [];
      for (const [empId, dates] of empDatesMap) {
        for (const dateStr of dates) {
          aggregationPromises.push(
            this.aggregationService!
              .aggregateEmployeeDay(empId, dateStr)
              .catch((err) =>
                this.logger.warn(
                  `[PAYROLL] Aggregation failed for ${empId} on ${dateStr}: ${err.message}`,
                ),
              ),
          );
        }
      }
      if (aggregationPromises.length > 0) {
        this.logger.log(
          `[PAYROLL] Triggering aggregation for ${aggregationPromises.length} employee-date(s)`,
        );
        await Promise.all(aggregationPromises);

        // Re-fetch DailyAttendanceLog records AFTER aggregation
        const [refreshedOvertime, refreshedEarlyLeave, refreshedDelay] = await Promise.all([
          this.prisma.dailyAttendanceLog.findMany({
            where: {
              employeeId: { in: employeeIds },
              recordType: 'OVERTIME_MINUTES',
              date: {
                gte: new Date(`${periodStart}T00:00:00.000Z`),
                lte: new Date(`${periodEnd}T23:59:59.999Z`),
              },
            },
            select: { employeeId: true, date: true, value: true },
          }),
          this.prisma.dailyAttendanceLog.findMany({
            where: {
              employeeId: { in: employeeIds },
              recordType: 'EARLY_LEAVE_MINUTES',
              date: {
                gte: new Date(`${periodStart}T00:00:00.000Z`),
                lte: new Date(`${periodEnd}T23:59:59.999Z`),
              },
            },
            select: { employeeId: true, value: true },
          }),
          this.prisma.dailyAttendanceLog.findMany({
            where: {
              employeeId: { in: employeeIds },
              recordType: 'DELAY_MINUTES',
              date: {
                gte: new Date(`${periodStart}T00:00:00.000Z`),
                lte: new Date(`${periodEnd}T23:59:59.999Z`),
              },
            },
            select: { employeeId: true, value: true },
          }),
        ]);
        // Replace the stale pre-aggregation arrays
        dailyOvertimeLogs.length = 0;
        dailyOvertimeLogs.push(...refreshedOvertime);
        dailyEarlyLeaveLogs.length = 0;
        dailyEarlyLeaveLogs.push(...refreshedEarlyLeave);
        dailyDelayLogs.length = 0;
        dailyDelayLogs.push(...refreshedDelay);
      }
    }

    const salaryByEmployee = new Map(salaryRecords.map((record) => [record.employeeId, record]));

    const payrollInputByEmployee = new Map(payrollInputs.map((input) => [input.employeeId, input]));

    const attendanceDatesByEmployee = new Map<string, Set<string>>();

    // ── Aggregate DELAY_MINUTES from DailyAttendanceLog (authoritative source) ──
    const lateMinutesByEmployee = new Map<string, number>();
    for (const log of dailyDelayLogs) {
      const minutes = Number(log.value ?? 0);
      if (!Number.isFinite(minutes) || minutes <= 0) continue;
      lateMinutesByEmployee.set(
        log.employeeId,
        (lateMinutesByEmployee.get(log.employeeId) || 0) + minutes,
      );
    }

    // ── Aggregate OVERTIME_MINUTES from DailyAttendanceLog ──
    // Weekday overtime → regular overtime pay
    // Weekend (Friday) overtime → weekend overtime pay + weekend days
    const overtimeMinutesByEmployee = new Map<string, number>();
    const overtimeWeekendMinutesByEmployee = new Map<string, number>();
    const overtimeWeekendDaysByEmployee = new Map<string, number>();

    for (const log of dailyOvertimeLogs) {
      const minutes = Number(log.value ?? 0);
      if (!Number.isFinite(minutes) || minutes <= 0) continue;

      const d = new Date(log.date);
      const isFriday = d.getDay() === 5;

      if (isFriday) {
        // Weekend overtime: separate bucket for weekend multiplier
        overtimeWeekendMinutesByEmployee.set(
          log.employeeId,
          (overtimeWeekendMinutesByEmployee.get(log.employeeId) || 0) + minutes,
        );
        overtimeWeekendDaysByEmployee.set(
          log.employeeId,
          (overtimeWeekendDaysByEmployee.get(log.employeeId) || 0) + 1,
        );
      } else {
        // Weekday overtime: regular overtime pay
        overtimeMinutesByEmployee.set(
          log.employeeId,
          (overtimeMinutesByEmployee.get(log.employeeId) || 0) + minutes,
        );
      }
    }

    // ── Aggregate EARLY_LEAVE_MINUTES from DailyAttendanceLog (missing-minutes engine) ──
    const earlyLeaveMinutesByEmployee = new Map<string, number>();
    for (const log of dailyEarlyLeaveLogs) {
      const minutes = Number(log.value ?? 0);
      if (!Number.isFinite(minutes) || minutes <= 0) continue;
      earlyLeaveMinutesByEmployee.set(
        log.employeeId,
        (earlyLeaveMinutesByEmployee.get(log.employeeId) || 0) + minutes,
      );
    }

    // ── Count attendance days from IN records (for absence calculation only) ──
    if (includeAttendanceDeductions) {
      for (const record of attendanceInRecords) {
        const dates = attendanceDatesByEmployee.get(record.employeeId) || new Set<string>();
        dates.add(record.date);
        attendanceDatesByEmployee.set(record.employeeId, dates);
      }
    }

    const attendanceDaysByEmployee = new Map<string, number>();
    for (const [employeeId, daysSet] of attendanceDatesByEmployee.entries()) {
      attendanceDaysByEmployee.set(employeeId, daysSet.size);
    }

    const bonusesByEmployee = new Map<string, { bonus: number; deductions: number }>();
    for (const bonus of bonuses) {
      const current = bonusesByEmployee.get(bonus.employeeId) || { bonus: 0, deductions: 0 };
      // المكافآت (bonusAmount + assistanceAmount) تُضاف للراتب
      current.bonus += Number(bonus.bonusAmount || 0);
      current.bonus += Number(bonus.assistanceAmount || 0);
      bonusesByEmployee.set(bonus.employeeId, current);
    }

    const advancesByEmployee = new Map<string, number>();
    for (const advance of advances) {
      const installment = Number(advance.installmentAmount || 0);
      const remaining = Number(advance.remainingAmount || 0);

      if (remaining <= 0) {
        continue;
      }

      // Lump-sum advance (installment=0): deduct entire remaining amount
      // Installment-based: deduct the smaller of installment or remaining
      const deductible = installment > 0 ? Math.min(installment, remaining) : remaining;
      advancesByEmployee.set(
        advance.employeeId,
        (advancesByEmployee.get(advance.employeeId) || 0) + deductible,
      );
    }

    const penaltiesByEmployee = new Map<string, number>();
    for (const penalty of penalties) {
      penaltiesByEmployee.set(
        penalty.employeeId,
        (penaltiesByEmployee.get(penalty.employeeId) || 0) + Number(penalty.amount || 0),
      );
    }

    await this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'processing',
        totalEmployees: targetEmployees.length,
      },
    });

    // Ensures idempotent retry for the same run id.
    await this.prisma.payrollItem.deleteMany({ where: { payrollRunId: runId } });

    // ── Batch-calculate bus subscription deductions for all target employees ──
    const busDeductionsByEmployee = new Map<string, number>();
    if (includeTransportationDeductions && this.transportationService) {
      try {
        const targetMonth = new Date(periodEnd);
        const allEmpIds = targetEmployees.map((e) => e.employeeId);
        const batchResult = await this.transportationService.calculateBatchBusDeductions(allEmpIds, targetMonth);
        for (const [empId, amount] of batchResult) {
          busDeductionsByEmployee.set(empId, amount);
        }
        if (batchResult.size > 0) {
          this.logger.log(`Bus subscription deductions calculated for ${batchResult.size} employees`);
        }
      } catch (err) {
        this.logger.warn(`Failed to calculate bus subscription deductions: ${(err as Error)?.message || String(err)}`);
      }
    }

    let totalGross = new Prisma.Decimal(0);
    let totalDeductions = new Prisma.Decimal(0);
    let totalNet = new Prisma.Decimal(0);
    let processedEmployees = 0;

    for (let offset = 0; offset < targetEmployees.length; offset += PAYROLL_BATCH_SIZE) {
      const employeesBatch = targetEmployees.slice(offset, offset + PAYROLL_BATCH_SIZE);
      const items: Prisma.PayrollItemCreateManyInput[] = [];

      for (const employee of employeesBatch) {
        const salaryRecord = salaryByEmployee.get(employee.employeeId);
        const input = payrollInputByEmployee.get(employee.employeeId);
        
        const workDays = employee.workDaysInPeriod ?? defaultWorkDaysInPeriod;
        const hoursPerDayEmp = employee.hoursPerDay ?? defaultHoursPerDay;
        
        const fallbackBaseSalary = Number(employee.hourlyRate || 0) * hoursPerDayEmp * workDays;
        const baseSalary = this.toDecimal(
          salaryRecord?.baseSalary ?? employee.baseSalary ?? fallbackBaseSalary,
        );
        const livingAllowance = this.toDecimal(salaryRecord?.livingAllowance ?? 0);
        const lumpSumSalary = this.toDecimal(salaryRecord?.lumpSumSalary ?? 0);
        // responsibilityAllowance, extraEffortAllowance, productionIncentive
        // are no longer auto-computed and are excluded from g3.
        const transportAllowanceBase = this.toDecimal(
          input?.transportAllowanceOverride ?? salaryRecord?.transportAllowance ?? 0,
        );

        const attendanceDays = attendanceDaysByEmployee.get(employee.employeeId) || 0;
        const hoursWorked = attendanceDays * hoursPerDayEmp;

        // absenceDaysFallback: compute as (workDays - attendanceDays) BUT exclude APPROVED paid leaves
        const absenceDaysFallbackRaw = Math.max(0, workDays - attendanceDays);

        // Count paid approved leave days inside period to avoid double-penalizing them as absence
        // NOTE: For now we treat PAID leave type or isPaid=true as "paid".
        // This logic is intentionally inclusive for overlap partials.
        const paidApprovedLeaves = await this.prisma.leaveRequest.findMany({
          where: {
            employeeId: employee.employeeId,
            status: 'APPROVED',
            leaveType: { in: ['PAID', 'SICK', 'ADMIN', 'DEATH'] },
            startDate: { lte: new Date(periodEnd) },
            endDate: { gte: new Date(periodStart) },
          },
          select: { startDate: true, endDate: true, isPaid: true, leaveType: true },
        });

        const paidApprovedLeaveDaysInPeriod = paidApprovedLeaves.reduce((sum, l) => {
          // inclusive overlap day count
          const overlapStart = l.startDate > new Date(periodStart) ? l.startDate : new Date(periodStart);
          const overlapEnd = l.endDate < new Date(periodEnd) ? l.endDate : new Date(periodEnd);
          const ms = overlapEnd.getTime() - overlapStart.getTime();
          const days = Math.floor(ms / 86_400_000) + 1;
          return sum + (Number.isFinite(days) && days > 0 ? days : 0);
        }, 0);

        const absenceDaysFallback = Math.max(
          0,
          absenceDaysFallbackRaw - paidApprovedLeaveDaysInPeriod,
        );


        const employeeBonuses = bonusesByEmployee.get(employee.employeeId);
        const bonusAmount = this.toDecimal(employeeBonuses?.bonus || 0);
        const advancesInstallments = this.toDecimal(advancesByEmployee.get(employee.employeeId) || 0);
        const penaltiesTotal = this.toDecimal(penaltiesByEmployee.get(employee.employeeId) || 0);

        // ── FIX (Bug #2 — Missing Bonuses), root cause closed at the schema level ──
        // `PayrollInput.bonusAdjustment` is now a genuinely nullable column
        // (see migration 20260712000000_make_payroll_input_overrides_nullable).
        // `input?.bonusAdjustment` is `null` for a row that was never given an
        // explicit override, so `??` correctly falls back to the computed sum
        // from EmployeeBonus (bonusAmount + assistanceAmount). An explicit `0`
        // override is now honored too, since it's distinguishable from "unset".
        const bonusAdjustment = this.toDecimal(input?.bonusAdjustment ?? bonusAmount);

        // ── FIX (Bug #1 — Ghost / Double Deductions) ────────────────────────
        // totalDeductions must ONLY contain PURE FINANCIAL deductions:
        // advanceAmount + explicit financial penalties (+ clothing/insurance/
        // bus subscription). Time/attendance-based penalties (delay minutes,
        // early-leave minutes) are already netted out of `attendanceCalculatedSalary`
        // by computeEarnedSalaryForPeriod() above. They must NEVER be summed
        // into totalDeductions again — doing so double-discounts the employee.
        // penaltyAmount/advanceAmount are now nullable too, so the same
        // plain `??` correctly falls back to the computed EmployeePenalty /
        // EmployeeAdvance totals instead of silently masking them.
        const penaltyAmountFinal = this.toDecimal(input?.penaltyAmount ?? penaltiesTotal);
        const advanceAmount = this.toDecimal(input?.advanceAmount ?? advancesInstallments);

        const clothingDeduction = this.toDecimal(
          (input as unknown as { clothingDeduction?: Prisma.Decimal })?.clothingDeduction ?? 0,
        );
        const insuranceAmount = this.toDecimal(
          input?.insuranceAmount ?? salaryRecord?.insuranceAmount ?? 0,
        );

        const absenceDays = this.resolveAttendanceValue(
          input?.absenceDays,
          absenceDaysFallback,
          includeAttendanceDeductions,
        );
        const sickLeaveDays = Number(input?.sickLeaveDays ?? 0);
        const adminLeaveDays = Number(input?.adminLeaveDays ?? 0);
        const unpaidLeaveDays = Number(input?.unpaidLeaveDays ?? 0);
        const deathLeaveDays = Number(input?.deathLeaveDays ?? 0);
        const unpaidHours = Number(input?.unpaidHours ?? 0);
        // overtimeRegularMinutes (computed from AttendanceRecord as hoursWorked - hoursPerDay)
        const overtimeRegularMinutesComputed = overtimeMinutesByEmployee.get(employee.employeeId) || 0;
        const overtimeRegularMinutes = includeAttendanceDeductions
          ? Number(input?.overtimeRegularMinutes ?? overtimeRegularMinutesComputed)
          : Number(input?.overtimeRegularMinutes ?? 0);

        // overtimeWeekendMinutes/days:
        // - Start by using PayrollInput override if present.
        // - For automated classification (weekend overtime), we will use DailyAttendanceLog in a later step.
        const overtimeWeekendMinutesComputed =
          overtimeWeekendMinutesByEmployee.get(employee.employeeId) || 0;

        // PayrollInput currently stores overtimeWeekendDays (Decimal) - keep existing field.
        // We approximate computed weekend days by the classified weekend log days.
        const overtimeWeekendDaysComputed =
          overtimeWeekendDaysByEmployee.get(employee.employeeId) || 0;

        const overtimeWeekendDays = Number(
          input?.overtimeWeekendDays ?? overtimeWeekendDaysComputed,
        );

        // If in future PayrollInput adds overtimeWeekendMinutes, we can switch to minutes-based pay.



        const leaveTotal = absenceDays + sickLeaveDays + adminLeaveDays + unpaidLeaveDays + deathLeaveDays;
        const transportAllowance = includeTransportationDeductions
          ? transportAllowanceBase
              .div(STANDARD_WORK_DAYS)
              .times(this.toDecimal(Math.max(0, WORK_DAYS_PER_MONTH - leaveTotal)))
          : transportAllowanceBase;

        // Base Gross = Attendance_Calculated_Salary.
        // This already encapsulates base salary, attendance days, late penalties, early leave penalties, and overtime.
        const attendanceCalculatedSalary = await this.computeEarnedSalaryForPeriod(
          employee.employeeId,
          this.toDateOnly(periodStart),
          this.toDateOnly(periodEnd),
          workDays,
          hoursPerDayEmp,
        );

        // Final Gross Pay = Attendance_Calculated_Salary + other bonuses (bonusAdjustment) + transportAllowance
        const grossPay = attendanceCalculatedSalary
          .plus(bonusAdjustment)
          .plus(transportAllowance);

        // Other Deductions: penalties (from employeePenalty), clothing deduction, advances, insurance, bus subscription
        // NOTE: penaltyAmountFinal / advanceAmount were already resolved above via
        // resolveDecimalOverride() — do NOT recompute them here from the raw
        // `input?.field ?? ...` pattern, that reintroduces the masking bug.
        const busDeductionAmount = this.toDecimal(busDeductionsByEmployee.get(employee.employeeId) ?? 0);

        const employeeDeductions = penaltyAmountFinal
          .plus(clothingDeduction)
          .plus(advanceAmount)
          .plus(insuranceAmount)
          .plus(busDeductionAmount);
        const netPay = grossPay.minus(employeeDeductions);
        const netPayRounded = this.roundUpToNearestThousand(netPay);
        const roundingDifference = netPayRounded.minus(netPay);
        const netPayWithAdvance = netPayRounded;

        const anomalies: string[] = [];
        if (!salaryRecord) {
          anomalies.push('Salary configuration not found; fallback hourly-rate baseline used');
        }
        if (!input) {
          anomalies.push('Payroll inputs not found; defaults used where possible');
        }
        if (attendanceDays === 0) {
          anomalies.push('No attendance records in selected period');
        }

        if (penaltiesTotal.greaterThan(0)) {
          anomalies.push(`Penalties applied: ${penaltiesTotal.toFixed(2)}`);
        }
        if (insuranceAmount.greaterThan(0)) {
          anomalies.push(`Insurance deducted: ${insuranceAmount.toFixed(2)}`);
        }
        if (transportAllowance.greaterThan(0)) {
          anomalies.push(`Transport allowance added: ${transportAllowance.toFixed(2)}`);
        }
        if (busDeductionAmount.greaterThan(0)) {
          anomalies.push(`Bus subscription deducted: ${busDeductionAmount.toFixed(2)}`);
        }
        // Informational only — these minutes are already netted inside
        // attendanceCalculatedSalary and are intentionally NOT part of totalDeductions.
        const lateMinutesForPeriod = lateMinutesByEmployee.get(employee.employeeId) || 0;
        const earlyLeaveMinutesForPeriod = earlyLeaveMinutesByEmployee.get(employee.employeeId) || 0;
        if (includeAttendanceDeductions && lateMinutesForPeriod > 0) {
          anomalies.push(`Delay minutes (already netted in attendance salary): ${lateMinutesForPeriod}`);
        }
        if (includeAttendanceDeductions && earlyLeaveMinutesForPeriod > 0) {
          anomalies.push(`Early-leave minutes (already netted in attendance salary): ${earlyLeaveMinutesForPeriod}`);
        }
        if (netPay.lessThan(0)) {
          anomalies.push('Net pay is negative after deductions');
        }

        totalGross = totalGross.plus(grossPay);
        totalDeductions = totalDeductions.plus(employeeDeductions);
        totalNet = totalNet.plus(netPayRounded);
        processedEmployees += 1;

        const hourlyWage = this.toDecimal(employee.hourlyRate ?? 0); // Calculate hourlyWage here

        items.push({
          payrollRunId: runId,
          employeeId: employee.employeeId,
          employeeName: employee.name,
          department: employee.department,
          attendanceBasedSalary: attendanceCalculatedSalary,
          hoursWorked: new Prisma.Decimal(hoursWorked),
          hourlyRate: hourlyWage,
          grossPay,
          totalBonuses: bonusAdjustment,
          totalDeductions: employeeDeductions,
          netPay,
          netPayRounded,
          roundingDifference,
          netPayWithAdvance,

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
        totalGrossPay: totalGross,
        totalDeductions: totalDeductions,
        totalNetPay: totalNet,
      },
    });

    return updatedRun;
  }
}