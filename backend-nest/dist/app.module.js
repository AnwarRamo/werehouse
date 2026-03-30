"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const auth_1 = require("./auth");
const employees_1 = require("./employees");
const devices_1 = require("./devices");
const health_module_1 = require("./health/health.module");
const attendance_module_1 = require("./attendance/attendance.module");
const payroll_module_1 = require("./payroll/payroll.module");
const inventory_module_1 = require("./inventory/inventory.module");
const imports_module_1 = require("./imports/imports.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            mongoose_1.MongooseModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    uri: config.get('MONGODB_URI'),
                }),
            }),
            health_module_1.HealthModule,
            auth_1.AuthModule,
            employees_1.EmployeesModule,
            devices_1.DevicesModule,
            attendance_module_1.AttendanceModule,
            payroll_module_1.PayrollModule,
            inventory_module_1.InventoryModule,
            imports_module_1.ImportsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map