"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utils/pagination.util");
const ATTENDANCE_DELETION_ENTITY = 'attendance';
let AttendanceService = class AttendanceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertEmployeeExists(employeeId) {
        const employee = await this.prisma.employee.findUnique({ where: { employeeId } });
        if (!employee) {
            throw new common_1.BadRequestException(`Employee not found: ${employeeId}`);
        }
    }
    toHistoryPayload(value) {
        return JSON.parse(JSON.stringify(value));
    }
    parseRequiredString(payload, key) {
        const value = payload[key];
        if (typeof value !== 'string' || !value.trim()) {
            throw new common_1.BadRequestException(`Corrupted history payload: missing ${key}`);
        }
        return value;
    }
    resolveRange(startDate, endDate) {
        if (startDate && endDate) {
            return { startDate, endDate };
        }
        if (startDate || endDate) {
            throw new common_1.BadRequestException('Start and end dates must be provided together');
        }
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - 30);
        return {
            startDate: start.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
        };
    }
    async list(query) {
        const { page, limit, skip } = (0, pagination_util_1.resolvePagination)(query, { defaultLimit: 100 });
        const where = {};
        if (query.employeeId)
            where.employeeId = query.employeeId;
        if (query.date)
            where.date = query.date;
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
    async create(dto) {
        const eventDate = new Date(dto.timestamp);
        if (Number.isNaN(eventDate.getTime())) {
            throw new common_1.BadRequestException('Invalid timestamp');
        }
        await this.assertEmployeeExists(dto.employeeId);
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
    async getById(recordId) {
        const record = await this.prisma.attendanceRecord.findUnique({ where: { id: recordId } });
        if (!record)
            throw new common_1.NotFoundException('Attendance record not found');
        return record;
    }
    async update(recordId, dto) {
        const existing = await this.prisma.attendanceRecord.findUnique({ where: { id: recordId } });
        if (!existing)
            throw new common_1.NotFoundException('Attendance record not found');
        if (dto.employeeId !== undefined) {
            await this.assertEmployeeExists(dto.employeeId);
        }
        const payload = {};
        if (dto.employeeId !== undefined)
            payload.employeeId = dto.employeeId;
        if (dto.type !== undefined)
            payload.type = dto.type.toUpperCase();
        if (dto.deviceId !== undefined)
            payload.deviceId = dto.deviceId;
        if (dto.location !== undefined)
            payload.location = dto.location;
        if (dto.source !== undefined)
            payload.source = dto.source;
        if (dto.verified !== undefined)
            payload.verified = dto.verified;
        if (dto.notes !== undefined)
            payload.notes = dto.notes;
        if (dto.timestamp) {
            const parsed = new Date(dto.timestamp);
            if (Number.isNaN(parsed.getTime())) {
                throw new common_1.BadRequestException('Invalid timestamp');
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
    async listDeletedHistory() {
        return this.prisma.deletedRecordHistory.findMany({
            where: {
                entityType: ATTENDANCE_DELETION_ENTITY,
                restoredAt: null,
            },
            orderBy: { deletedAt: 'desc' },
        });
    }
    async remove(recordId, deletedBy) {
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
    async restore(historyId, restoredBy) {
        const history = await this.prisma.deletedRecordHistory.findFirst({
            where: { id: historyId, entityType: ATTENDANCE_DELETION_ENTITY },
        });
        if (!history) {
            throw new common_1.NotFoundException('Deleted attendance history not found');
        }
        if (history.restoredAt) {
            throw new common_1.BadRequestException('Attendance record has already been restored');
        }
        const payload = history.payload;
        const id = this.parseRequiredString(payload, 'id');
        const employeeId = this.parseRequiredString(payload, 'employeeId');
        const timestampValue = this.parseRequiredString(payload, 'timestamp');
        const date = this.parseRequiredString(payload, 'date');
        const type = this.parseRequiredString(payload, 'type').toUpperCase();
        const timestamp = new Date(timestampValue);
        if (Number.isNaN(timestamp.getTime())) {
            throw new common_1.BadRequestException('Corrupted history payload: invalid timestamp');
        }
        await this.assertEmployeeExists(employeeId);
        const existing = await this.prisma.attendanceRecord.findUnique({ where: { id } });
        if (existing) {
            throw new common_1.BadRequestException('Attendance record already exists');
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
                        ? { shiftPair: shiftPair }
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
    async stats(startDate, endDate) {
        const range = this.resolveRange(startDate, endDate);
        const records = await this.prisma.attendanceRecord.findMany({
            where: {
                date: { gte: range.startDate, lte: range.endDate },
            },
        });
        const unverified = records.filter((r) => !r.verified).length;
        const late = records.filter((r) => (r.shiftPair?.minutesLate || 0) > 5).length;
        return {
            period: range,
            statistics: {
                totalRecords: records.length,
                unverifiedRecords: unverified,
                totalLateArrivals: late,
            },
        };
    }
    async anomalies(startDate, endDate) {
        const range = this.resolveRange(startDate, endDate);
        const candidates = await this.prisma.attendanceRecord.findMany({
            where: {
                date: { gte: range.startDate, lte: range.endDate },
            },
        });
        const anomalies = candidates.filter((record) => {
            if (!record.verified)
                return true;
            const shiftPair = record.shiftPair;
            return (shiftPair?.minutesLate || 0) > 60;
        });
        return {
            period: range,
            anomalies,
            anomalyCount: anomalies.length,
        };
    }
    async employeeOnDate(employeeId, date) {
        const records = await this.prisma.attendanceRecord.findMany({
            where: { employeeId, date },
            orderBy: { timestamp: 'asc' },
        });
        return { employeeId, date, records, recordCount: records.length };
    }
    async employeePeriod(employeeId, startDate, endDate) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start and end dates are required');
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
                totalDays: new Set(records.map((r) => r.date)).size,
                totalRecords: records.length,
            },
        };
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map