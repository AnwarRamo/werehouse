import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBonusDto } from './dto/create-bonus.dto';
import { UpdateBonusDto } from './dto/update-bonus.dto';

@Injectable()
export class BonusesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(employeeId?: string, period?: string) {
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (period) where.period = period;
    return this.prisma.employeeBonus.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getById(id: string) {
    const record = await this.prisma.employeeBonus.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Bonus record not found');
    return record;
  }

  async create(dto: CreateBonusDto) {
    return this.prisma.employeeBonus.create({
      data: {
        employeeId: dto.employeeId,
        bonusAmount: new Prisma.Decimal(dto.bonusAmount ?? 0),
        bonusReason: dto.bonusReason ?? null,
        assistanceAmount: new Prisma.Decimal(dto.assistanceAmount ?? 0),
        period: dto.period ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateBonusDto) {
    await this.getById(id);
    return this.prisma.employeeBonus.update({
      where: { id },
      data: {
        ...(dto.bonusAmount !== undefined && { bonusAmount: new Prisma.Decimal(dto.bonusAmount) }),
        ...(dto.bonusReason !== undefined && { bonusReason: dto.bonusReason }),
        ...(dto.assistanceAmount !== undefined && { assistanceAmount: new Prisma.Decimal(dto.assistanceAmount) }),
        ...(dto.period !== undefined && { period: dto.period }),
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.employeeBonus.delete({ where: { id } });
    return { message: 'Bonus record deleted' };
  }

  async periodSummary(period: string) {
    const records = await this.prisma.employeeBonus.findMany({ where: { period } });
    const totalBonus = records.reduce((s, r) => s + Number(r.bonusAmount), 0);
    const totalAssistance = records.reduce((s, r) => s + Number(r.assistanceAmount), 0);
    return { period, count: records.length, totalBonus, totalAssistance, records };
  }
}
