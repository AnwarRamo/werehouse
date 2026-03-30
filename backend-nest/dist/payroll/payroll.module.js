"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const payroll_controller_1 = require("./payroll.controller");
const payroll_service_1 = require("./payroll.service");
const payroll_run_schema_1 = require("./schemas/payroll-run.schema");
const payroll_item_schema_1 = require("./schemas/payroll-item.schema");
const employee_schema_1 = require("../employees/schemas/employee.schema");
let PayrollModule = class PayrollModule {
};
exports.PayrollModule = PayrollModule;
exports.PayrollModule = PayrollModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: payroll_run_schema_1.PayrollRun.name, schema: payroll_run_schema_1.PayrollRunSchema },
                { name: payroll_item_schema_1.PayrollItem.name, schema: payroll_item_schema_1.PayrollItemSchema },
                { name: employee_schema_1.Employee.name, schema: employee_schema_1.EmployeeSchema },
            ]),
        ],
        controllers: [payroll_controller_1.PayrollController],
        providers: [payroll_service_1.PayrollService],
    })
], PayrollModule);
//# sourceMappingURL=payroll.module.js.map