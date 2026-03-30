import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceRecord, AttendanceRecordDocument } from './schemas/attendance-record.schema';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceRecord.name)
    private attendanceModel: Model<AttendanceRecordDocument>,
  ) {}

  async list(query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 100);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.employeeId) filter.employeeId = query.employeeId;
    if (query.date) filter.date = query.date;

    const [records, total] = await Promise.all([
      this.attendanceModel.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
      this.attendanceModel.countDocuments(filter),
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

    const record = await this.attendanceModel.create({
      ...dto,
      timestamp: eventDate,
      type: dto.type.toUpperCase(),
      source: dto.source || 'manual',
      verified: dto.verified ?? true,
      date,
    });

    return { message: 'Attendance record created successfully', record };
  }

  async getById(recordId: string) {
    const record = await this.attendanceModel.findById(recordId);
    if (!record) throw new NotFoundException('Attendance record not found');
    return record;
  }

  async update(recordId: string, dto: UpdateAttendanceDto) {
    const payload: any = { ...dto };
    if (dto.timestamp) {
      payload.timestamp = new Date(dto.timestamp);
      payload.date = payload.timestamp.toISOString().slice(0, 10);
    }

    const record = await this.attendanceModel.findByIdAndUpdate(recordId, payload, {
      new: true,
      runValidators: true,
    });

    if (!record) throw new NotFoundException('Attendance record not found');
    return { message: 'Attendance record updated successfully', record };
  }

  async stats(startDate: string, endDate: string) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start and end dates are required');
    }

    const records = await this.attendanceModel.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const unverified = records.filter((r) => !r.verified).length;
    const late = records.filter((r) => (r.shiftPair?.minutesLate || 0) > 5).length;

    return {
      period: { startDate, endDate },
      statistics: {
        totalRecords: records.length,
        unverifiedRecords: unverified,
        totalLateArrivals: late,
      },
    };
  }

  async anomalies(startDate: string, endDate: string) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start and end dates are required');
    }

    const anomalies = await this.attendanceModel.find({
      date: { $gte: startDate, $lte: endDate },
      $or: [{ verified: false }, { 'shiftPair.minutesLate': { $gt: 60 } }],
    });

    return {
      period: { startDate, endDate },
      anomalies,
      anomalyCount: anomalies.length,
    };
  }

  async employeeOnDate(employeeId: string, date: string) {
    const records = await this.attendanceModel
      .find({ employeeId, date })
      .sort({ timestamp: 1 });

    return { employeeId, date, records, recordCount: records.length };
  }

  async employeePeriod(employeeId: string, startDate: string, endDate: string) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start and end dates are required');
    }

    const records = await this.attendanceModel
      .find({ employeeId, date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1, timestamp: 1 });

    return {
      employeeId,
      period: { startDate, endDate },
      records,
      statistics: {
        totalDays: new Set(records.map((r) => r.date)).size,
        totalRecords: records.length,
      },
    };
  }
}
