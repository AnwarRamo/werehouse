import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryParams } from '../common/types/query.types';
import { resolvePagination } from '../common/utils/pagination.util';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

export type AttendanceListQuery = PaginationQueryParams & {
  employeeId?: string;
  date?: string;
};

type ShiftPair = {
  inRecordId?: string;
  outRecordId?: string;
  hoursWorked?: number;
  minutesLate?: number;
  gracePeriodApplied?: number;
};

const ATTENDANCE_DELETION_ENTITY = 'attendance';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private deriveDateKey(timestampInput: string, parsed: Date) {
    const fromInput = /^(\d{4}-\d{2}-\d{2})/.exec(timestampInput)?.[1];
    if (fromInput) {
      return fromInput;
    }

    return parsed.toISOString().slice(0, 10);
  }

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

  private resolveRange(startDate?: string, endDate?: string) {
    if (startDate && endDate) {
      return { startDate, endDate };
    }

    if (startDate || endDate) {
      throw new BadRequestException('Start and end dates must be provided together');
    }

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  async list(query: AttendanceListQuery) {
    const { page, limit, skip } = resolvePagination(query, { defaultLimit: 100 });

    const where: Prisma.AttendanceRecordWhereInput = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.date) where.date = query.date;

    const [records, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return {
      records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateAttendanceDto) {
    const eventDate = new Date(dto.timestamp);
    if (Number.isNaN(eventDate.getTime())) {
      throw new BadRequestException('Invalid timestamp');
    }

    await this.assertEmployeeExists(dto.employeeId);

    const date = this.deriveDateKey(dto.timestamp, eventDate);

    const record = await this.prisma.attendanceRecord.create({
      data: {
        ...dto,
        timestamp: eventDate,
        type: dto.type.toUpperCase(),
        source: dto.source || 'manual',
        verified: dto.verified ?? true,
        date,
      },
    });

    return { message: 'Attendance record created successfully', record };
  }

  async getById(recordId: string) {
    const record = await this.prisma.attendanceRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('Attendance record not found');
    return record;
  }

  async update(recordId: string, dto: UpdateAttendanceDto) {
    const existing = await this.prisma.attendanceRecord.findUnique({ where: { id: recordId } });

    if (!existing) throw new NotFoundException('Attendance record not found');

    if (dto.employeeId !== undefined) {
      await this.assertEmployeeExists(dto.employeeId);
    }

    const payload: Prisma.AttendanceRecordUncheckedUpdateInput = {};

    if (dto.employeeId !== undefined) payload.employeeId = dto.employeeId;
    if (dto.type !== undefined) payload.type = dto.type.toUpperCase();
    if (dto.deviceId !== undefined) payload.deviceId = dto.deviceId;
    if (dto.location !== undefined) payload.location = dto.location;
    if (dto.source !== undefined) payload.source = dto.source;
    if (dto.verified !== undefined) payload.verified = dto.verified;
    if (dto.notes !== undefined) payload.notes = dto.notes;

    if (dto.timestamp) {
      const parsed = new Date(dto.timestamp);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid timestamp');
      }
      payload.timestamp = parsed;
      payload.date = this.deriveDateKey(dto.timestamp, parsed);
    }

    const updated = await this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: payload,
    });

    return { message: 'Attendance record updated successfully', record: updated };
  }

  async listDeletedHistory() {
    return this.prisma.deletedRecordHistory.findMany({
      where: {
        entityType: ATTENDANCE_DELETION_ENTITY,
        restoredAt: null,
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async remove(recordId: string, deletedBy?: string) {
    const record = await this.getById(recordId);

    const history = await this.prisma.$transaction(async (tx) => {
      const createdHistory = await tx.deletedRecordHistory.create({
        data: {
          entityType: ATTENDANCE_DELETION_ENTITY,
          recordId: record.id,
          payload: this.toHistoryPayload(record),
          deletedBy: deletedBy || null,
        },
      });

      await tx.attendanceRecord.delete({ where: { id: record.id } });
      return createdHistory;
    });

    return {
      message: 'Attendance record deleted successfully',
      recordId: record.id,
      historyId: history.id,
    };
  }

  async restore(historyId: string, restoredBy?: string) {
    const history = await this.prisma.deletedRecordHistory.findFirst({
      where: { id: historyId, entityType: ATTENDANCE_DELETION_ENTITY },
    });

    if (!history) {
      throw new NotFoundException('Deleted attendance history not found');
    }

    if (history.restoredAt) {
      throw new BadRequestException('Attendance record has already been restored');
    }

    const payload = history.payload as Prisma.JsonObject;
    const id = this.parseRequiredString(payload, 'id');
    const employeeId = this.parseRequiredString(payload, 'employeeId');
    const timestampValue = this.parseRequiredString(payload, 'timestamp');
    const date = this.parseRequiredString(payload, 'date');
    const type = this.parseRequiredString(payload, 'type').toUpperCase();
    const timestamp = new Date(timestampValue);

    if (Number.isNaN(timestamp.getTime())) {
      throw new BadRequestException('Corrupted history payload: invalid timestamp');
    }

    await this.assertEmployeeExists(employeeId);

    const existing = await this.prisma.attendanceRecord.findUnique({ where: { id } });
    if (existing) {
      throw new BadRequestException('Attendance record already exists');
    }

    const source = typeof payload.source === 'string' ? payload.source : 'manual';
    const verified = typeof payload.verified === 'boolean' ? payload.verified : true;
    const deviceId = typeof payload.deviceId === 'string' ? payload.deviceId : null;
    const location = typeof payload.location === 'string' ? payload.location : null;
    const notes = typeof payload.notes === 'string' ? payload.notes : null;
    const shiftPair = payload.shiftPair;

    const restoredRecord = await this.prisma.$transaction(async (tx) => {
      const created = await tx.attendanceRecord.create({
        data: {
          id,
          employeeId,
          timestamp,
          type,
          deviceId,
          location,
          source,
          verified,
          notes,
          date,
          ...(shiftPair !== undefined && shiftPair !== null
            ? { shiftPair: shiftPair as Prisma.InputJsonValue }
            : {}),
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
      message: 'Attendance record restored successfully',
      record: restoredRecord,
    };
  }

  async stats(startDate: string, endDate: string) {
    const range = this.resolveRange(startDate, endDate);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        date: { gte: range.startDate, lte: range.endDate },
      },
    });

    const unverified = records.filter((r: (typeof records)[number]) => !r.verified).length;
    const late = records.filter((r: (typeof records)[number]) => ((r.shiftPair as ShiftPair | null)?.minutesLate || 0) > 5).length;

    return {
      period: range,
      statistics: {
        totalRecords: records.length,
        unverifiedRecords: unverified,
        totalLateArrivals: late,
      },
    };
  }

  async anomalies(startDate: string, endDate: string) {
    const range = this.resolveRange(startDate, endDate);

    const candidates = await this.prisma.attendanceRecord.findMany({
      where: {
        date: { gte: range.startDate, lte: range.endDate },
      },
    });

    const anomalies = candidates.filter((record: (typeof candidates)[number]) => {
      if (!record.verified) return true;
      const shiftPair = record.shiftPair as ShiftPair | null;
      return (shiftPair?.minutesLate || 0) > 60;
    });

    return {
      period: range,
      anomalies,
      anomalyCount: anomalies.length,
    };
  }

  async employeeOnDate(employeeId: string, date: string) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { employeeId, date },
      orderBy: { timestamp: 'asc' },
    });

    return { employeeId, date, records, recordCount: records.length };
  }

  async employeePeriod(employeeId: string, startDate: string, endDate: string) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start and end dates are required');
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: [{ date: 'asc' }, { timestamp: 'asc' }],
    });

    return {
      employeeId,
      period: { startDate, endDate },
      records,
      statistics: {
        totalDays: new Set(records.map((r: (typeof records)[number]) => r.date)).size,
        totalRecords: records.length,
      },
    };
  }
}
