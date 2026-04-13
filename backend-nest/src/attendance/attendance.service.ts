import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parse as parseCsv } from 'csv-parse/sync';
import { extname } from 'path';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePagination } from '../common/utils/pagination.util';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceListQueryDto } from './dto/attendance-list-query.dto';

type ShiftPair = {
  inRecordId?: string;
  outRecordId?: string;
  hoursWorked?: number;
  minutesLate?: number;
  gracePeriodApplied?: number;
};

type AttendanceAlertStatus = 'absent' | 'late';

type AttendanceAlertItem = {
  status: AttendanceAlertStatus;
  employeeId: string;
  name: string;
  department: string;
  scheduledStart: string;
  checkIn: string | null;
  minutesLate: number;
};

type EmployeeDailyAttendance = {
  firstIn: Date | null;
  maxMinutesLateFromShiftPair: number | null;
};

type AttendanceImportRow = {
  employeeId: string;
  timestamp: string;
  type: string;
  deviceId?: string;
  location?: string;
  source?: string;
  notes?: string;
};

const ATTENDANCE_DELETION_ENTITY = 'attendance';
const DEFAULT_ALERT_SCHEDULE_START = '08:00';
const DEFAULT_LATE_THRESHOLD_MINUTES = 15;
const TIME_HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ATTENDANCE_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const ATTENDANCE_IMPORT_EXTENSIONS = new Set([
  '.csv',
  '.tsv',
  '.txt',
  '.json',
  '.xlsx',
  '.xls',
  '.xlsm',
  '.xlsb',
  '.ods',
]);

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

  private toDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseClockMinutes(value?: string) {
    const source = (value || DEFAULT_ALERT_SCHEDULE_START).slice(0, 5);
    const match = TIME_HH_MM_REGEX.exec(source);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  private minutesFromCheckIn(checkIn: Date) {
    return (checkIn.getHours() * 60) + checkIn.getMinutes();
  }

  private resolveMinutesLate(
    firstIn: Date,
    scheduledStart?: string,
    minutesLateFromShiftPair?: number | null,
  ) {
    if (typeof minutesLateFromShiftPair === 'number' && Number.isFinite(minutesLateFromShiftPair)) {
      return Math.max(0, Math.floor(minutesLateFromShiftPair));
    }

    const scheduledMinutes = this.parseClockMinutes(scheduledStart);
    if (scheduledMinutes === null) return 0;

    return Math.max(0, this.minutesFromCheckIn(firstIn) - scheduledMinutes);
  }

  private normalizeImportHeader(value: string) {
    return value.toLowerCase().replace(/[\s_-]+/g, '');
  }

  private normalizeImportRow(row: Record<string, unknown>) {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[this.normalizeImportHeader(key)] = String(value ?? '').trim();
    }
    return normalized;
  }

  private detectDelimiter(content: string) {
    const firstLine = content.split(/\r?\n/, 1)[0] || '';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    return tabCount > commaCount ? '\t' : ',';
  }

  private parseDelimitedRows(content: string, delimiter: string) {
    let parsed: Array<Record<string, unknown>>;
    try {
      parsed = parseCsv(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        delimiter,
      }) as Array<Record<string, unknown>>;
    } catch {
      throw new BadRequestException('Unable to parse attendance file');
    }

    return parsed
      .map((row) => this.normalizeImportRow(row))
      .filter((row) => Object.values(row).some((value) => value !== ''));
  }

  private parseJsonRows(content: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException('Invalid JSON attendance file');
    }

    if (!Array.isArray(parsed)) {
      throw new BadRequestException('Attendance JSON file must contain an array of rows');
    }

    return parsed
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry) => this.normalizeImportRow(entry))
      .filter((row) => Object.values(row).some((value) => value !== ''));
  }

  private parseSpreadsheetRows(buffer: Buffer) {
    try {
      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        raw: false,
        cellDates: false,
        dense: true,
      });

      const firstSheetName = workbook.SheetNames?.[0];
      if (!firstSheetName) {
        throw new BadRequestException('Attendance spreadsheet must contain at least one sheet');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        raw: false,
      });

      return rows
        .map((row) => this.normalizeImportRow(row))
        .filter((row) => Object.values(row).some((value) => value !== ''));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Unable to parse attendance spreadsheet file');
    }
  }

  private pickRowValue(row: Record<string, string>, keys: string[]) {
    for (const key of keys) {
      const value = row[this.normalizeImportHeader(key)];
      if (value) {
        return value;
      }
    }
    return '';
  }

  private normalizeAttendanceType(value: string) {
    const normalized = value.trim().toLowerCase();

    if (['in', 'checkin', 'entry', 'arrival', 'حضور', 'دخول'].includes(normalized)) {
      return 'IN';
    }

    if (['out', 'checkout', 'exit', 'departure', 'انصراف', 'خروج'].includes(normalized)) {
      return 'OUT';
    }

    return null;
  }

  private normalizeAttendanceSource(value?: string) {
    return value?.trim().toLowerCase() === 'device' ? 'device' : 'manual';
  }

  private extractAttendanceRows(file: Express.Multer.File): AttendanceImportRow[] {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Attendance file is required');
    }

    const extension = extname(String(file.originalname || '')).toLowerCase();
    if (!ATTENDANCE_IMPORT_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Unsupported attendance file extension');
    }

    let rows: Record<string, string>[] = [];

    if (extension === '.json') {
      rows = this.parseJsonRows(file.buffer.toString('utf8'));
    } else if (['.xlsx', '.xls', '.xlsm', '.xlsb', '.ods'].includes(extension)) {
      rows = this.parseSpreadsheetRows(file.buffer);
    } else {
      const content = file.buffer.toString('utf8');
      const delimiter = extension === '.tsv' ? '\t' : this.detectDelimiter(content);
      rows = this.parseDelimitedRows(content, delimiter);
    }

    return rows
      .map((row) => ({
        employeeId: this.pickRowValue(row, [
          'employeeId',
          'employee_id',
          'empId',
          'id',
          'رقم الموظف',
          'كود الموظف',
        ]),
        timestamp: this.pickRowValue(row, [
          'timestamp',
          'datetime',
          'eventTime',
          'time',
          'التاريخ',
          'الوقت',
        ]),
        type: this.pickRowValue(row, ['type', 'eventType', 'direction', 'status', 'النوع']),
        deviceId: this.pickRowValue(row, ['deviceId', 'device_id', 'device', 'الجهاز']) || undefined,
        location: this.pickRowValue(row, ['location', 'site', 'الموقع']) || undefined,
        source: this.pickRowValue(row, ['source', 'المصدر']) || undefined,
        notes: this.pickRowValue(row, ['notes', 'note', 'ملاحظات']) || undefined,
      }))
      .filter((row) => row.employeeId || row.timestamp || row.type);
  }

  private resolveMonthRange(month: string) {
    if (!ATTENDANCE_MONTH_REGEX.test(month)) {
      throw new BadRequestException('Month must be in YYYY-MM format');
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const monthEndDate = new Date(Date.UTC(year, monthNumber, 0));
    const endDay = String(monthEndDate.getUTCDate()).padStart(2, '0');

    return {
      startDate: `${month}-01`,
      endDate: `${month}-${endDay}`,
    };
  }

  async list(query: AttendanceListQueryDto) {
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

  async upload(file: Express.Multer.File, userId?: string) {
    const rows = this.extractAttendanceRows(file);
    if (rows.length === 0) {
      throw new BadRequestException('No attendance rows found in uploaded file');
    }

    const employeeIds = Array.from(new Set(rows.map((row) => row.employeeId).filter(Boolean)));
    const employees = await this.prisma.employee.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { employeeId: true },
    });
    const employeeSet = new Set(employees.map((employee) => employee.employeeId));

    const errors: Array<{ row: number; error: string }> = [];
    let importedRows = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;

      if (!row.employeeId || !employeeSet.has(row.employeeId)) {
        errors.push({ row: rowNumber, error: `Employee not found: ${row.employeeId || 'unknown'}` });
        continue;
      }

      if (!row.timestamp) {
        errors.push({ row: rowNumber, error: 'Missing timestamp' });
        continue;
      }

      const parsedTimestamp = new Date(row.timestamp);
      if (Number.isNaN(parsedTimestamp.getTime())) {
        errors.push({ row: rowNumber, error: 'Invalid timestamp format' });
        continue;
      }

      const normalizedType = this.normalizeAttendanceType(row.type || '');
      if (!normalizedType) {
        errors.push({ row: rowNumber, error: 'Attendance type must be IN or OUT' });
        continue;
      }

      try {
        await this.prisma.attendanceRecord.create({
          data: {
            employeeId: row.employeeId,
            timestamp: parsedTimestamp,
            type: normalizedType,
            deviceId: row.deviceId || null,
            location: row.location || null,
            source: this.normalizeAttendanceSource(row.source),
            verified: true,
            notes: row.notes || null,
            date: this.deriveDateKey(row.timestamp, parsedTimestamp),
          },
        });

        importedRows += 1;
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Failed to save attendance row',
        });
      }
    }

    return {
      message:
        errors.length > 0
          ? 'Attendance upload completed with partial failures'
          : 'Attendance upload completed successfully',
      uploadedBy: userId || null,
      totalRows: rows.length,
      importedRows,
      failedRows: errors.length,
      errors: errors.slice(0, 100),
    };
  }

  async month(month: string) {
    const range = this.resolveMonthRange(month);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
      orderBy: [{ date: 'asc' }, { timestamp: 'asc' }],
    });

    const employeeCount = new Set(records.map((record) => record.employeeId)).size;
    const lateCount = records.filter(
      (record) => ((record.shiftPair as ShiftPair | null)?.minutesLate || 0) > 0,
    ).length;

    return {
      month,
      period: range,
      statistics: {
        totalRecords: records.length,
        totalEmployees: employeeCount,
        totalLateRecords: lateCount,
      },
      records,
    };
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

  async stats(startDate?: string, endDate?: string) {
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

  async anomalies(startDate?: string, endDate?: string) {
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

  async alerts(date?: string, lateThresholdMinutes = DEFAULT_LATE_THRESHOLD_MINUTES) {
    const targetDate = date || this.toDateKey();
    const threshold = Number.isFinite(lateThresholdMinutes)
      ? Math.max(0, Math.floor(lateThresholdMinutes))
      : DEFAULT_LATE_THRESHOLD_MINUTES;

    const [activeEmployees, records] = await Promise.all([
      this.prisma.employee.findMany({
        where: { status: 'active' },
        select: {
          employeeId: true,
          name: true,
          department: true,
          scheduledStart: true,
        },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { date: targetDate },
        orderBy: { timestamp: 'asc' },
        select: {
          employeeId: true,
          type: true,
          timestamp: true,
          shiftPair: true,
        },
      }),
    ]);

    const attendanceByEmployee = new Map<string, EmployeeDailyAttendance>();

    for (const record of records) {
      const snapshot = attendanceByEmployee.get(record.employeeId) || {
        firstIn: null,
        maxMinutesLateFromShiftPair: null,
      };

      const shiftPair = record.shiftPair as ShiftPair | null;
      if (typeof shiftPair?.minutesLate === 'number' && Number.isFinite(shiftPair.minutesLate)) {
        const existingMinutes = snapshot.maxMinutesLateFromShiftPair ?? 0;
        snapshot.maxMinutesLateFromShiftPair = Math.max(
          existingMinutes,
          Math.max(0, Math.floor(shiftPair.minutesLate)),
        );
      }

      if (record.type.toUpperCase() === 'IN' && !snapshot.firstIn) {
        snapshot.firstIn = record.timestamp;
      }

      attendanceByEmployee.set(record.employeeId, snapshot);
    }

    const absentAlerts: AttendanceAlertItem[] = [];
    const lateAlerts: AttendanceAlertItem[] = [];

    for (const employee of activeEmployees) {
      const snapshot = attendanceByEmployee.get(employee.employeeId);
      const scheduledStart = employee.scheduledStart || DEFAULT_ALERT_SCHEDULE_START;
      if (!snapshot?.firstIn) {
        absentAlerts.push({
          status: 'absent',
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          scheduledStart,
          checkIn: null,
          minutesLate: 0,
        });
        continue;
      }

      const minutesLate = this.resolveMinutesLate(
        snapshot.firstIn,
        scheduledStart,
        snapshot.maxMinutesLateFromShiftPair,
      );

      if (minutesLate >= threshold) {
        lateAlerts.push({
          status: 'late',
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          scheduledStart,
          checkIn: snapshot.firstIn.toISOString(),
          minutesLate,
        });
      }
    }

    const alerts = [...absentAlerts, ...lateAlerts].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'absent' ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });

    return {
      date: targetDate,
      lateThresholdMinutes: threshold,
      summary: {
        activeEmployees: activeEmployees.length,
        checkedInCount: activeEmployees.length - absentAlerts.length,
        absentCount: absentAlerts.length,
        lateCount: lateAlerts.length,
        totalAlerts: alerts.length,
      },
      alerts,
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
