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
exports.PayrollRunSchema = exports.PayrollRun = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let PayrollRun = class PayrollRun {
};
exports.PayrollRun = PayrollRun;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], PayrollRun.prototype, "runId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], PayrollRun.prototype, "periodStart", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], PayrollRun.prototype, "periodEnd", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'monthly' }),
    __metadata("design:type", String)
], PayrollRun.prototype, "periodType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], PayrollRun.prototype, "runDate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PayrollRun.prototype, "runBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'draft' }),
    __metadata("design:type", String)
], PayrollRun.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending' }),
    __metadata("design:type", String)
], PayrollRun.prototype, "approvalStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PayrollRun.prototype, "approvedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PayrollRun.prototype, "approvalDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, type: Number }),
    __metadata("design:type", Number)
], PayrollRun.prototype, "totalEmployees", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, type: Number }),
    __metadata("design:type", Number)
], PayrollRun.prototype, "totalGrossPay", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, type: Number }),
    __metadata("design:type", Number)
], PayrollRun.prototype, "totalDeductions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, type: Number }),
    __metadata("design:type", Number)
], PayrollRun.prototype, "totalNetPay", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'SYP' }),
    __metadata("design:type", String)
], PayrollRun.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PayrollRun.prototype, "notes", void 0);
exports.PayrollRun = PayrollRun = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], PayrollRun);
exports.PayrollRunSchema = mongoose_1.SchemaFactory.createForClass(PayrollRun);
//# sourceMappingURL=payroll-run.schema.js.map