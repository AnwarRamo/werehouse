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
exports.ImportsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const imports_service_1 = require("./imports.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let ImportsController = class ImportsController {
    constructor(importsService) {
        this.importsService = importsService;
    }
    history(query) {
        return this.importsService.history(query);
    }
    stats() {
        return this.importsService.stats();
    }
    details(jobId) {
        return this.importsService.details(jobId);
    }
    employeesTemplate(res) {
        const content = this.importsService.getEmployeesTemplateCsv();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="employees-template.csv"');
        res.status(200).send(content);
    }
    productsTemplate(res) {
        const content = this.importsService.getProductsTemplateCsv();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="products-template.csv"');
        res.status(200).send(content);
    }
    importEmployees(file, user) {
        return this.importsService.importEmployees(file, user?.userId);
    }
    validateEmployees(file) {
        return this.importsService.validateEmployeesImport(file);
    }
    importProducts(file, user) {
        return this.importsService.importProducts(file, user?.userId);
    }
    validateProducts(file) {
        return this.importsService.validateProductsImport(file);
    }
    retry(jobId, user) {
        return this.importsService.retry(jobId, user?.userId);
    }
};
exports.ImportsController = ImportsController;
__decorate([
    (0, common_1.Get)('history'),
    (0, permissions_decorator_1.Permissions)('view_imports'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "history", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, permissions_decorator_1.Permissions)('view_imports'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)('jobs/:jobId'),
    (0, permissions_decorator_1.Permissions)('view_imports'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "details", null);
__decorate([
    (0, common_1.Get)('templates/employees'),
    (0, permissions_decorator_1.Permissions)('view_imports'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "employeesTemplate", null);
__decorate([
    (0, common_1.Get)('templates/products'),
    (0, permissions_decorator_1.Permissions)('view_imports'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "productsTemplate", null);
__decorate([
    (0, common_1.Post)('employees'),
    (0, permissions_decorator_1.Permissions)('run_imports'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "importEmployees", null);
__decorate([
    (0, common_1.Post)('employees/validate'),
    (0, permissions_decorator_1.Permissions)('run_imports'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "validateEmployees", null);
__decorate([
    (0, common_1.Post)('products'),
    (0, permissions_decorator_1.Permissions)('run_imports'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "importProducts", null);
__decorate([
    (0, common_1.Post)('products/validate'),
    (0, permissions_decorator_1.Permissions)('run_imports'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "validateProducts", null);
__decorate([
    (0, common_1.Post)('jobs/:jobId/retry'),
    (0, permissions_decorator_1.Permissions)('run_imports'),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "retry", null);
exports.ImportsController = ImportsController = __decorate([
    (0, common_1.Controller)('imports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [imports_service_1.ImportsService])
], ImportsController);
//# sourceMappingURL=imports.controller.js.map