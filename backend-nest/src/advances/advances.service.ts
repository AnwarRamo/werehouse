import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { UpdateAdvanceDto } from './dto/update-advance.dto';

const ADVANCE_DELETION_ENTITY = 'advance';

@Injectable()
export class AdvancesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertEmployeeExists(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { employeeId } });
    if (!employee) {
      throw new BadRequestException(`Employee not found: ${employeeId}`);
    }
  }

  private toHistoryPayload(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private parseRequiredString(payload: Prisma.JsonObject, key: string) {
    const value = payload[key];
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`Corrupted history payload: missing ${key}`);
    }
    return value;
  }

  private parseRequiredDecimal(payload: Prisma.JsonObject, key: string) {
    const value = payload[key];
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new BadRequestException(`Corrupted history payload: invalid ${key}`);
    }
    return new Prisma.Decimal(value);
  }

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
    await this.assertEmployeeExists(dto.employeeId);

    const totalAmount = new Prisma.Decimal(dto.totalAmount);
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
    if (Number.isNaN(issueDate.getTime())) {
      throw new BadRequestException('Invalid issueDate');
    }

    return this.prisma.employeeAdvance.create({
      data: {
        employeeId: dto.employeeId,
        advanceType: dto.advanceType ?? 'salary',
        totalAmount,
        installmentAmount: new Prisma.Decimal(dto.installmentAmount ?? 0),
        remainingAmount: totalAmount,
        notes: dto.notes ?? null,
        issueDate,
      },
    });
  }

  async listDeletedHistory() {
    return this.prisma.deletedRecordHistory.findMany({
      where: {
        entityType: ADVANCE_DELETION_ENTITY,
        restoredAt: null,
      },
      orderBy: { deletedAt: 'desc' },
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

  async remove(id: string, deletedBy?: string) {
    const record = await this.getById(id);

    const history = await this.prisma.$transaction(async (tx) => {
      const createdHistory = await tx.deletedRecordHistory.create({
        data: {
          entityType: ADVANCE_DELETION_ENTITY,
          recordId: record.id,
          payload: this.toHistoryPayload(record),
          deletedBy: deletedBy || null,
        },
      });

      await tx.employeeAdvance.delete({ where: { id: record.id } });
      return createdHistory;
    });

    return {
      message: 'Advance deleted successfully',
      recordId: record.id,
      historyId: history.id,
    };
  }

  async restore(historyId: string, restoredBy?: string) {
    const history = await this.prisma.deletedRecordHistory.findFirst({
      where: { id: historyId, entityType: ADVANCE_DELETION_ENTITY },
    });

    if (!history) {
      throw new NotFoundException('Deleted advance history not found');
    }

    if (history.restoredAt) {
      throw new BadRequestException('Advance has already been restored');
    }

    const payload = history.payload as Prisma.JsonObject;
    const id = this.parseRequiredString(payload, 'id');
    const employeeId = this.parseRequiredString(payload, 'employeeId');
    const issueDateValue = this.parseRequiredString(payload, 'issueDate');
    const issueDate = new Date(issueDateValue);

    if (Number.isNaN(issueDate.getTime())) {
      throw new BadRequestException('Corrupted history payload: invalid issueDate');
    }

    await this.assertEmployeeExists(employeeId);

    const existing = await this.prisma.employeeAdvance.findUnique({ where: { id } });
    if (existing) {
      throw new BadRequestException('Advance already exists');
    }

    const advanceType = typeof payload.advanceType === 'string' ? payload.advanceType : 'salary';
    const notes = typeof payload.notes === 'string' ? payload.notes : null;
    const totalAmount = this.parseRequiredDecimal(payload, 'totalAmount');
    const installmentAmount = this.parseRequiredDecimal(payload, 'installmentAmount');
    const remainingAmount = this.parseRequiredDecimal(payload, 'remainingAmount');

    const restoredAdvance = await this.prisma.$transaction(async (tx) => {
      const created = await tx.employeeAdvance.create({
        data: {
          id,
          employeeId,
          advanceType,
          totalAmount,
          installmentAmount,
          remainingAmount,
          notes,
          issueDate,
        },
      });

      await tx.deletedRecordHistory.update({
        where: { id: history.id },
        data: {
          restoredAt: new Date(),
          restoredBy: restoredBy || null,
        },
      });

      return created;
    });

    return {
      message: 'Advance restored successfully',
      advance: restoredAdvance,
    };
  }

  async summary(employeeId: string) {
    const advances = await this.prisma.employeeAdvance.findMany({ where: { employeeId } });
    const total = advances.reduce((s, a) => s + Number(a.totalAmount), 0);
    const remaining = advances.reduce((s, a) => s + Number(a.remainingAmount), 0);
    return { employeeId, totalAdvances: advances.length, totalAmount: total, remainingAmount: remaining, advances };
  }
}
