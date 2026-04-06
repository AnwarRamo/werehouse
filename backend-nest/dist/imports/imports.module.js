"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportsModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const imports_controller_1 = require("./imports.controller");
const imports_service_1 = require("./imports.service");
const imports_queue_processor_1 = require("./imports.queue.processor");
const queue_constants_1 = require("../queues/queue.constants");
const queuesEnabled = process.env.NODE_ENV !== 'test' && process.env.QUEUES_ENABLED !== 'false';
const importsQueueModules = queuesEnabled
    ? [
        bullmq_1.BullModule.registerQueue({ name: queue_constants_1.QUEUE_NAMES.IMPORTS }, { name: queue_constants_1.QUEUE_NAMES.DEAD_LETTER }),
    ]
    : [];
const importsProcessors = queuesEnabled ? [imports_queue_processor_1.ImportsQueueProcessor] : [];
let ImportsModule = class ImportsModule {
};
exports.ImportsModule = ImportsModule;
exports.ImportsModule = ImportsModule = __decorate([
    (0, common_1.Module)({
        imports: [...importsQueueModules],
        controllers: [imports_controller_1.ImportsController],
        providers: [imports_service_1.ImportsService, ...importsProcessors],
    })
], ImportsModule);
//# sourceMappingURL=imports.module.js.map