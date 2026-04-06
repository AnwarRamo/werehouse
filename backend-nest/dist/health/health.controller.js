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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const prisma_service_1 = require("../prisma/prisma.service");
let HealthController = class HealthController {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.redisEnabled = this.config.get('QUEUES_ENABLED', true);
        this.redis = this.redisEnabled
            ? new ioredis_1.default(this.config.get('REDIS_URL', 'redis://127.0.0.1:6379'), {
                lazyConnect: true,
                maxRetriesPerRequest: 1,
                enableReadyCheck: false,
            })
            : null;
    }
    getLive() {
        return {
            status: 'ok',
            check: 'liveness',
            timestamp: new Date().toISOString(),
        };
    }
    async getReady() {
        const db = await this.checkDatabase();
        const redis = await this.checkRedis();
        const redisHealthy = redis === 'up' || redis === 'disabled';
        return {
            status: db === 'up' && redisHealthy ? 'ok' : 'degraded',
            check: 'readiness',
            timestamp: new Date().toISOString(),
            services: {
                database: db,
                redis,
            },
        };
    }
    async getHealth() {
        const db = await this.checkDatabase();
        const redis = await this.checkRedis();
        const redisHealthy = redis === 'up' || redis === 'disabled';
        const status = db === 'up' && redisHealthy ? 'ok' : 'degraded';
        return {
            status,
            timestamp: new Date().toISOString(),
            framework: 'NestJS',
            services: {
                database: db,
                redis,
            },
        };
    }
    async checkDatabase() {
        try {
            await this.prisma.$queryRaw `SELECT 1 as ok`;
            return 'up';
        }
        catch {
            return 'down';
        }
    }
    async checkRedis() {
        if (!this.redisEnabled || !this.redis) {
            return 'disabled';
        }
        try {
            if (this.redis.status === 'wait') {
                await this.redis.connect();
            }
            await this.redis.ping();
            return 'up';
        }
        catch {
            return 'down';
        }
    }
    async onModuleDestroy() {
        if (!this.redis) {
            return;
        }
        await this.redis.quit();
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)('live'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "getLive", null);
__decorate([
    (0, common_1.Get)('ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getReady", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getHealth", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], HealthController);
//# sourceMappingURL=health.controller.js.map