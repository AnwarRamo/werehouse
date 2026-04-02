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
exports.EmployeesController = void 0;
const common_1 = require("@nestjs/common");
const employees_service_1 = require("./employees.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const create_employee_dto_1 = require("./dto/create-employee.dto");
const update_employee_dto_1 = require("./dto/update-employee.dto");
let EmployeesController = class EmployeesController {
    constructor(employeesService) {
        this.employeesService = employeesService;
    }
    list(query) {
        return this.employeesService.list(query);
    }
    stats() {
        return this.employeesService.stats();
    }
    byDepartment(department) {
        return this.employeesService.byDepartment(department);
    }
    create(dto) {
        return this.employeesService.create(dto);
    }
    getOne(employeeId) {
        return this.employeesService.getByEmployeeId(employeeId);
    }
    update(employeeId, dto) {
        return this.employeesService.update(employeeId, dto);
    }
    remove(employeeId) {
        return this.employeesService.remove(employeeId);
    }
};
exports.EmployeesController = EmployeesController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_employees'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, permissions_decorator_1.Permissions)('view_employees'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)('department/:department'),
    (0, permissions_decorator_1.Permissions)('view_employees'),
    __param(0, (0, common_1.Param)('department')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "byDepartment", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('edit_employees'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_employee_dto_1.CreateEmployeeDto]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':employeeId'),
    (0, permissions_decorator_1.Permissions)('view_employees'),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "getOne", null);
__decorate([
    (0, common_1.Put)(':employeeId'),
    (0, permissions_decorator_1.Permissions)('edit_employees'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_employee_dto_1.UpdateEmployeeDto]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':employeeId'),
    (0, permissions_decorator_1.Permissions)('delete_employees'),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "remove", null);
exports.EmployeesController = EmployeesController = __decorate([
    (0, common_1.Controller)('employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [employees_service_1.EmployeesService])
], EmployeesController);
//# sourceMappingURL=employees.controller.js.map