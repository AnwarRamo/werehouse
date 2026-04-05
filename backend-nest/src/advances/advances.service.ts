import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { UpdateAdvanceDto } from './dto/update-advance.dto';

@Injectable()
export class AdvancesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(employeeId?: string) {
    const where = employeeId ? { employeeId } : {};
    return this.prisma.employeeAdvance.findMany({
      where,
      orderBy: { issueDate: 'desc' },
    });
  }

  async getById(id: string) {
    const record = await this.prisma.employeeAdvance.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Advance not found');
    return record;
  }

  async create(dto: CreateAdvanceDto) {
    const totalAmount = new Prisma.Decimal(dto.totalAmount);
    return this.prisma.employeeAdvance.create({
      data: {
        employeeId: dto.employeeId,
        advanceType: dto.advanceType ?? 'salary',
        totalAmount,
        installmentAmount: new Prisma.Decimal(dto.installmentAmount ?? 0),
        remainingAmount: totalAmount,
        notes: dto.notes ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateAdvanceDto) {
    await this.getById(id);
    return this.prisma.employeeAdvance.update({
      where: { id },
      data: {
        ...(dto.remainingAmount !== undefined && {
          remainingAmount: new Prisma.Decimal(dto.remainingAmount),
        }),
        ...(dto.installmentAmount !== undefined && {
          installmentAmount: new Prisma.Decimal(dto.installmentAmount),
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.employeeAdvance.delete({ where: { id } });
    return { message: 'Advance deleted' };
  }

  async summary(employeeId: string) {
    const advances = await this.prisma.employeeAdvance.findMany({ where: { employeeId } });
    const total = advances.reduce((s, a) => s + Number(a.totalAmount), 0);
    const remaining = advances.reduce((s, a) => s + Number(a.remainingAmount), 0);
    return { employeeId, totalAdvances: advances.length, totalAmount: total, remainingAmount: remaining, advances };
  }
}
