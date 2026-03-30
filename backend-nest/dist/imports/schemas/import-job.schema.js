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
exports.ImportJobSchema = exports.ImportJob = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let ImportJob = class ImportJob {
};
exports.ImportJob = ImportJob;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], ImportJob.prototype, "jobId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['employees', 'attendance', 'devices', 'products', 'stock'] }),
    __metadata("design:type", String)
], ImportJob.prototype, "entity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ImportJob.prototype, "fileName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ImportJob.prototype, "uploadedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], ImportJob.prototype, "uploadedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending', enum: ['pending', 'processing', 'completed', 'failed', 'partial'] }),
    __metadata("design:type", String)
], ImportJob.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], ImportJob.prototype, "totalRows", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], ImportJob.prototype, "successRows", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], ImportJob.prototype, "errorRows", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Array, default: [] }),
    __metadata("design:type", Array)
], ImportJob.prototype, "errors", void 0);
exports.ImportJob = ImportJob = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ImportJob);
exports.ImportJobSchema = mongoose_1.SchemaFactory.createForClass(ImportJob);
exports.ImportJobSchema.index({ entity: 1, uploadedAt: -1 });
exports.ImportJobSchema.index({ status: 1 });
//# sourceMappingURL=import-job.schema.js.map