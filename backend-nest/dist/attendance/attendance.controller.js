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
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const attendance_service_1 = require("./attendance.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_attendance_dto_1 = require("./dto/create-attendance.dto");
const update_attendance_dto_1 = require("./dto/update-attendance.dto");
let AttendanceController = class AttendanceController {
    constructor(attendanceService) {
        this.attendanceService = attendanceService;
    }
    list(query) {
        return this.attendanceService.list(query);
    }
    stats(startDate, endDate) {
        return this.attendanceService.stats(startDate, endDate);
    }
    anomalies(startDate, endDate) {
        return this.attendanceService.anomalies(startDate, endDate);
    }
    listDeletedHistory() {
        return this.attendanceService.listDeletedHistory();
    }
    create(dto) {
        return this.attendanceService.create(dto);
    }
    restore(historyId, user) {
        return this.attendanceService.restore(historyId, user?.userId);
    }
    employeeOnDate(employeeId, date) {
        return this.attendanceService.employeeOnDate(employeeId, date);
    }
    employeePeriod(employeeId, startDate, endDate) {
        return this.attendanceService.employeePeriod(employeeId, startDate, endDate);
    }
    getById(recordId) {
        return this.attendanceService.getById(recordId);
    }
    update(recordId, dto) {
        return this.attendanceService.update(recordId, dto);
    }
    remove(recordId, user) {
        return this.attendanceService.remove(recordId, user?.userId);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_attendance'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, permissions_decorator_1.Permissions)('view_attendance'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)('anomalies'),
    (0, permissions_decorator_1.Permissions)('view_attendance'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "anomalies", null);
__decorate([
    (0, common_1.Get)('deleted/history'),
    (0, permissions_decorator_1.Permissions)('edit_attendance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "listDeletedHistory", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('edit_attendance'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_attendance_dto_1.CreateAttendanceDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('restore/:historyId'),
    (0, permissions_decorator_1.Permissions)('edit_attendance'),
    __param(0, (0, common_1.Param)('historyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "restore", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId/date/:date'),
    (0, permissions_decorator_1.Permissions)('view_attendance'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Param)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "employeeOnDate", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId/period'),
    (0, permissions_decorator_1.Permissions)('view_attendance'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "employeePeriod", null);
__decorate([
    (0, common_1.Get)(':recordId'),
    (0, permissions_decorator_1.Permissions)('view_attendance'),
    __param(0, (0, common_1.Param)('recordId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getById", null);
__decorate([
    (0, common_1.Put)(':recordId'),
    (0, permissions_decorator_1.Permissions)('edit_attendance'),
    __param(0, (0, common_1.Param)('recordId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_attendance_dto_1.UpdateAttendanceDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':recordId'),
    (0, permissions_decorator_1.Permissions)('edit_attendance'),
    __param(0, (0, common_1.Param)('recordId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "remove", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, common_1.Controller)('attendance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map