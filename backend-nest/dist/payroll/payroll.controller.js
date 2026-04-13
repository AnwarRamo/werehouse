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
exports.PayrollController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const payroll_service_1 = require("./payroll.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const calculate_payroll_dto_1 = require("./dto/calculate-payroll.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const audit_service_1 = require("../common/services/audit.service");
const payroll_list_query_dto_1 = require("./dto/payroll-list-query.dto");
const payroll_summary_query_dto_1 = require("./dto/payroll-summary-query.dto");
const reject_payroll_dto_1 = require("./dto/reject-payroll.dto");
let PayrollController = class PayrollController {
    constructor(payrollService, audit) {
        this.payrollService = payrollService;
        this.audit = audit;
    }
    list(query) {
        return this.payrollService.list(query);
    }
    summary(query) {
        return this.payrollService.summary(query.periodStart, query.periodEnd);
    }
    calculate(dto, user) {
        return this.payrollService.calculate(dto, user?.userId);
    }
    calculateAsync(dto, user) {
        return this.payrollService.calculateAsync(dto, user?.userId);
    }
    report(month) {
        return this.payrollService.report(month);
    }
    getById(runId) {
        return this.payrollService.getRun(runId);
    }
    anomalies(runId) {
        return this.payrollService.anomalies(runId);
    }
    async approve(runId, user, req) {
        const result = await this.payrollService.approve(runId, user?.userId);
        this.audit.log({
            action: 'payroll.approve',
            actorId: user?.userId,
            actorUsername: user?.username,
            targetType: 'payroll_run',
            targetId: runId,
        }, req);
        return result;
    }
    async reject(runId, dto, user, req) {
        const result = await this.payrollService.reject(runId, dto.reason, user?.userId);
        this.audit.log({
            action: 'payroll.reject',
            actorId: user?.userId,
            actorUsername: user?.username,
            targetType: 'payroll_run',
            targetId: runId,
            metadata: { reason: dto.reason },
        }, req);
        return result;
    }
    async export(runId, req, res) {
        const payload = await this.payrollService.export(runId);
        this.audit.log({
            action: 'payroll.export',
            targetType: 'payroll_run',
            targetId: runId,
        }, req);
        res.setHeader('Content-Type', payload.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
        res.status(200).send(payload.content);
    }
    async exportPdf(runId, req, res) {
        const payload = await this.payrollService.exportPdf(runId);
        this.audit.log({
            action: 'payroll.export.pdf',
            targetType: 'payroll_run',
            targetId: runId,
        }, req);
        res.setHeader('Content-Type', payload.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
        res.status(200).send(payload.content);
    }
    employeeHistory(employeeId) {
        return this.payrollService.getEmployeeHistory(employeeId);
    }
};
exports.PayrollController = PayrollController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_payroll'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payroll_list_query_dto_1.PayrollListQueryDto]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_decorator_1.Permissions)('view_payroll'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payroll_summary_query_dto_1.PayrollSummaryQueryDto]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "summary", null);
__decorate([
    (0, common_1.Post)('calculate'),
    (0, permissions_decorator_1.Permissions)('run_payroll'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calculate_payroll_dto_1.CalculatePayrollDto, Object]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "calculate", null);
__decorate([
    (0, common_1.Post)('calculate/async'),
    (0, permissions_decorator_1.Permissions)('run_payroll'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calculate_payroll_dto_1.CalculatePayrollDto, Object]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "calculateAsync", null);
__decorate([
    (0, common_1.Get)('report/:month'),
    (0, permissions_decorator_1.Permissions)('view_payroll'),
    __param(0, (0, common_1.Param)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "report", null);
__decorate([
    (0, common_1.Get)(':runId'),
    (0, permissions_decorator_1.Permissions)('view_payroll'),
    __param(0, (0, common_1.Param)('runId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getById", null);
__decorate([
    (0, common_1.Get)(':runId/anomalies'),
    (0, permissions_decorator_1.Permissions)('view_payroll'),
    __param(0, (0, common_1.Param)('runId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "anomalies", null);
__decorate([
    (0, common_1.Put)(':runId/approve'),
    (0, permissions_decorator_1.Permissions)('approve_payroll'),
    __param(0, (0, common_1.Param)('runId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "approve", null);
__decorate([
    (0, common_1.Put)(':runId/reject'),
    (0, permissions_decorator_1.Permissions)('approve_payroll'),
    __param(0, (0, common_1.Param)('runId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reject_payroll_dto_1.RejectPayrollDto, Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "reject", null);
__decorate([
    (0, common_1.Get)(':runId/export'),
    (0, permissions_decorator_1.Permissions)('view_payroll'),
    __param(0, (0, common_1.Param)('runId')),
    __param(1, (0, common_2.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "export", null);
__decorate([
    (0, common_1.Get)(':runId/export/pdf'),
    (0, permissions_decorator_1.Permissions)('view_payroll'),
    __param(0, (0, common_1.Param)('runId')),
    __param(1, (0, common_2.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "exportPdf", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId'),
    (0, permissions_decorator_1.Permissions)('view_payroll'),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "employeeHistory", null);
exports.PayrollController = PayrollController = __decorate([
    (0, common_1.Controller)('payroll'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [payroll_service_1.PayrollService,
        audit_service_1.AuditService])
], PayrollController);
//# sourceMappingURL=payroll.controller.js.map