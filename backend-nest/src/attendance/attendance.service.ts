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

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

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

    const date = eventDate.toISOString().slice(0, 10);

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

    const payload: Prisma.AttendanceRecordUpdateInput = {};

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
      payload.date = parsed.toISOString().slice(0, 10);
    }

    const updated = await this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: payload,
    });

    return { message: 'Attendance record updated successfully', record: updated };
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
