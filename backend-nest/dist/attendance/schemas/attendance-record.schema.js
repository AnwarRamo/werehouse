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
exports.AttendanceRecordSchema = exports.AttendanceRecord = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let ShiftPair = class ShiftPair {
};
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ShiftPair.prototype, "inRecordId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ShiftPair.prototype, "outRecordId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], ShiftPair.prototype, "hoursWorked", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], ShiftPair.prototype, "minutesLate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], ShiftPair.prototype, "gracePeriodApplied", void 0);
ShiftPair = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], ShiftPair);
let AttendanceRecord = class AttendanceRecord {
};
exports.AttendanceRecord = AttendanceRecord;
__decorate([
    (0, mongoose_1.Prop)({ required: true, match: /^EMP[0-9]{3,}$/ }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "employeeId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "timestamp", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['IN', 'OUT'] }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "deviceId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'device', enum: ['device', 'manual', 'import', 'api'] }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], AttendanceRecord.prototype, "verified", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: ShiftPair, default: {} }),
    __metadata("design:type", ShiftPair)
], AttendanceRecord.prototype, "shiftPair", void 0);
exports.AttendanceRecord = AttendanceRecord = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], AttendanceRecord);
exports.AttendanceRecordSchema = mongoose_1.SchemaFactory.createForClass(AttendanceRecord);
exports.AttendanceRecordSchema.index({ employeeId: 1, timestamp: -1 });
exports.AttendanceRecordSchema.index({ date: 1, employeeId: 1 });
exports.AttendanceRecordSchema.index({ deviceId: 1, timestamp: -1 });
//# sourceMappingURL=attendance-record.schema.js.map