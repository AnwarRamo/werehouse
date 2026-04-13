import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdvancesService } from '../advances/advances.service';
import { BonusesService } from '../bonuses/bonuses.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFinanceAdvanceDto } from './dto/create-finance-advance.dto';
import { CreateFinanceBonusDto } from './dto/create-finance-bonus.dto';

@Injectable()
export class FinancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly advancesService: AdvancesService,
    private readonly bonusesService: BonusesService,
  ) {}

  private toMoney(value: number) {
    return Number(value.toFixed(2));
  }

  private resolveMonth(month?: string) {
    if (!month) {
      return new Date().toISOString().slice(0, 7);
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new BadRequestException('Month must be in YYYY-MM format');
    }

    return month;
  }

  async createAdvance(dto: CreateFinanceAdvanceDto) {
    const advance = await this.advancesService.create({
      employeeId: dto.employeeId,
      advanceType: dto.advanceType,
      totalAmount: dto.amount,
      installmentAmount: dto.installmentAmount,
      notes: dto.notes,
      issueDate: dto.date,
    });

    return {
      message: 'Advance created successfully',
      advance,
    };
  }

  async createBonus(dto: CreateFinanceBonusDto) {
    const bonus = await this.bonusesService.create({
      employeeId: dto.employeeId,
      bonusAmount: dto.bonusAmount,
      bonusReason: dto.bonusReason,
      assistanceAmount: dto.assistanceAmount,
      period: dto.period,
    });

    return {
      message: 'Bonus created successfully',
      bonus,
    };
  }

  async summary(employeeId: string, month?: string) {
    const period = this.resolveMonth(month);

    const [employee, salary, insurance, bonuses, advances] = await Promise.all([
      this.prisma.employee.findUnique({ where: { employeeId } }),
      this.prisma.employeeSalary.findUnique({ where: { employeeId } }),
      this.prisma.employeeInsurance.findUnique({ where: { employeeId } }),
      this.prisma.employeeBonus.findMany({
        where: {
          employeeId,
          period,
        },
      }),
      this.prisma.employeeAdvance.findMany({
        where: {
          employeeId,
          remainingAmount: {
            gt: new Prisma.Decimal(0),
          },
        },
      }),
    ]);

    if (!employee) {
      throw new NotFoundException(`Employee not found: ${employeeId}`);
    }

    const baseSalary = Number(salary?.baseSalary || 0);
    const transportAllowance = Number(salary?.transportAllowance || 0);

    const bonusAmount = bonuses.reduce((sum, record) => sum + Number(record.bonusAmount || 0), 0);
    const assistanceAmount = bonuses.reduce(
      (sum, record) => sum + Number(record.assistanceAmount || 0),
      0,
    );

    const advancesInstallments = advances.reduce((sum, record) => {
      const installment = Number(record.installmentAmount || 0);
      const remaining = Number(record.remainingAmount || 0);
      return sum + Math.min(installment, remaining);
    }, 0);

    const insuranceDeduction = Number(insurance?.insuranceSalary || 0);

    const gross = this.toMoney(baseSalary + transportAllowance + bonusAmount);
    const deductions = this.toMoney(insuranceDeduction + advancesInstallments + assistanceAmount);
    const net = this.toMoney(gross - deductions);

    return {
      employeeId,
      employeeName: employee.name,
      period,
      components: {
        baseSalary: this.toMoney(baseSalary),
        transportAllowance: this.toMoney(transportAllowance),
        bonuses: this.toMoney(bonusAmount),
        insurance: this.toMoney(insuranceDeduction),
        advances: this.toMoney(advancesInstallments),
        assistance: this.toMoney(assistanceAmount),
      },
      totals: {
        gross,
        deductions,
        net,
      },
      records: {
        advances,
        bonuses,
        insurance,
        salary,
      },
    };
  }
}
