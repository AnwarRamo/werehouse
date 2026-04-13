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
const bullmq_1 = require("@nestjs/bullmq");
const payroll_controller_1 = require("./payroll.controller");
const payroll_service_1 = require("./payroll.service");
const audit_service_1 = require("../common/services/audit.service");
const queue_constants_1 = require("../queues/queue.constants");
const queuesEnabled = process.env.NODE_ENV !== 'test' && process.env.QUEUES_ENABLED !== 'false';
const payrollQueueModules = queuesEnabled
    ? [
        bullmq_1.BullModule.registerQueue({ name: queue_constants_1.QUEUE_NAMES.PAYROLL }, { name: queue_constants_1.QUEUE_NAMES.DEAD_LETTER }),
    ]
    : [];
let PayrollModule = class PayrollModule {
};
exports.PayrollModule = PayrollModule;
exports.PayrollModule = PayrollModule = __decorate([
    (0, common_1.Module)({
        imports: [...payrollQueueModules],
        controllers: [payroll_controller_1.PayrollController],
        providers: [payroll_service_1.PayrollService, audit_service_1.AuditService],
    })
], PayrollModule);
//# sourceMappingURL=payroll.module.js.map