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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const attendance_record_schema_1 = require("./schemas/attendance-record.schema");
let AttendanceService = class AttendanceService {
    constructor(attendanceModel) {
        this.attendanceModel = attendanceModel;
    }
    async list(query) {
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 100);
        const skip = (page - 1) * limit;
        const filter = {};
        if (query.employeeId)
            filter.employeeId = query.employeeId;
        if (query.date)
            filter.date = query.date;
        const [records, total] = await Promise.all([
            this.attendanceModel.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
            this.attendanceModel.countDocuments(filter),
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
    async getById(recordId) {
        const record = await this.attendanceModel.findById(recordId);
        if (!record)
            throw new common_1.NotFoundException('Attendance record not found');
        return record;
    }
    async update(recordId, dto) {
        const payload = { ...dto };
        if (dto.timestamp) {
            payload.timestamp = new Date(dto.timestamp);
            payload.date = payload.timestamp.toISOString().slice(0, 10);
        }
        const record = await this.attendanceModel.findByIdAndUpdate(recordId, payload, {
            new: true,
            runValidators: true,
        });
        if (!record)
            throw new common_1.NotFoundException('Attendance record not found');
        return { message: 'Attendance record updated successfully', record };
    }
    async stats(startDate, endDate) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start and end dates are required');
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
    async anomalies(startDate, endDate) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start and end dates are required');
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
    async employeeOnDate(employeeId, date) {
        const records = await this.attendanceModel
            .find({ employeeId, date })
            .sort({ timestamp: 1 });
        return { employeeId, date, records, recordCount: records.length };
    }
    async employeePeriod(employeeId, startDate, endDate) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('Start and end dates are required');
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
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(attendance_record_schema_1.AttendanceRecord.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map