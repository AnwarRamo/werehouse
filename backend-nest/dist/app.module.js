"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const Joi = __importStar(require("joi"));
const throttler_1 = require("@nestjs/throttler");
const bullmq_1 = require("@nestjs/bullmq");
const auth_1 = require("./auth");
const employees_1 = require("./employees");
const devices_1 = require("./devices");
const health_module_1 = require("./health/health.module");
const attendance_module_1 = require("./attendance/attendance.module");
const payroll_module_1 = require("./payroll/payroll.module");
const inventory_module_1 = require("./inventory/inventory.module");
const imports_module_1 = require("./imports/imports.module");
const prisma_module_1 = require("./prisma/prisma.module");
const request_logging_middleware_1 = require("./common/middleware/request-logging.middleware");
const salary_module_1 = require("./salary/salary.module");
const advances_module_1 = require("./advances/advances.module");
const insurance_module_1 = require("./insurance/insurance.module");
const bonuses_module_1 = require("./bonuses/bonuses.module");
const queuesEnabled = process.env.NODE_ENV !== 'test' && process.env.QUEUES_ENABLED !== 'false';
const queueInfraModules = queuesEnabled
    ? [
        bullmq_1.BullModule.forRootAsync({
            inject: [config_1.ConfigService],
            useFactory: (config) => ({
                connection: {
                    url: config.get('REDIS_URL', 'redis://127.0.0.1:6379'),
                    maxRetriesPerRequest: null,
                    enableReadyCheck: false,
                    lazyConnect: true,
                    retryStrategy: (times) => Math.min(times * 1000, 30000),
                },
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2_000,
                    },
                    removeOnComplete: 500,
                    removeOnFail: 500,
                },
            }),
        }),
    ]
    : [];
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(request_logging_middleware_1.RequestLoggingMiddleware).forRoutes({ path: '*path', method: common_1.RequestMethod.ALL });
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: Joi.object({
                    NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
                    PORT: Joi.number().default(5001),
                    DATABASE_URL: Joi.string().uri().required(),
                    JWT_SECRET: Joi.when('NODE_ENV', {
                        is: 'production',
                        then: Joi.string().min(32).required(),
                        otherwise: Joi.string().min(16).required(),
                    }),
                    JWT_EXPIRE: Joi.string().default('15m'),
                    JWT_COOKIE_NAME: Joi.string().default('warehouse_access_token'),
                    JWT_COOKIE_SECURE: Joi.boolean().default(false),
                    JWT_COOKIE_SAME_SITE: Joi.string()
                        .valid('strict', 'lax', 'none', 'Strict', 'Lax', 'None')
                        .default('lax'),
                    JWT_COOKIE_DOMAIN: Joi.string().allow('').default(''),
                    JWT_COOKIE_MAX_AGE_MS: Joi.number().min(60_000).default(900_000),
                    JWT_ROTATE_THRESHOLD_SEC: Joi.number().min(30).max(3_600).default(300),
                    ADMIN_USERNAME: Joi.string().default('admin'),
                    ADMIN_EMAIL: Joi.string().email({ tlds: { allow: false } }).default('admin@warehouse.local'),
                    ADMIN_BOOTSTRAP_PASSWORD: Joi.when('NODE_ENV', {
                        is: 'production',
                        then: Joi.string().min(8).required(),
                        otherwise: Joi.string().min(8).optional(),
                    }),
                    DEV_ADMIN_USERNAME: Joi.string().default('developer'),
                    DEV_ADMIN_EMAIL: Joi.string()
                        .email({ tlds: { allow: false } })
                        .default('developer@warehouse.local'),
                    DEV_ADMIN_PASSWORD: Joi.when('NODE_ENV', {
                        is: 'production',
                        then: Joi.string().min(12).required(),
                        otherwise: Joi.string().min(8).optional(),
                    }),
                    SUPERADMIN_USERNAME: Joi.string().default('superadmin'),
                    SUPERADMIN_EMAIL: Joi.string().email({ tlds: { allow: false } }).default('superadmin@warehouse.local'),
                    SUPERADMIN_PASSWORD: Joi.when('NODE_ENV', {
                        is: 'production',
                        then: Joi.string().min(12).required(),
                        otherwise: Joi.string().min(8).optional(),
                    }),
                    CORS_ORIGIN: Joi.string().allow('').default(''),
                    JWT_ALLOW_BEARER: Joi.when('NODE_ENV', {
                        is: 'production',
                        then: Joi.boolean().default(false),
                        otherwise: Joi.boolean().default(true),
                    }),
                    AUTH_RETURN_TOKEN_IN_BODY: Joi.boolean().default(false),
                    TRUST_PROXY: Joi.when('NODE_ENV', {
                        is: 'production',
                        then: Joi.boolean().default(true),
                        otherwise: Joi.boolean().default(false),
                    }),
                    BCRYPT_ROUNDS: Joi.number().min(8).max(14).default(10),
                    THROTTLE_TTL_MS: Joi.number().min(1_000).default(60_000),
                    THROTTLE_LIMIT: Joi.number().min(10).default(120),
                    QUEUES_ENABLED: Joi.boolean().default(true),
                    REDIS_URL: Joi.string().uri().default('redis://127.0.0.1:6379'),
                    TOKEN_REVOCATION_STRICT: Joi.boolean().default(false),
                }),
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => [
                    {
                        ttl: config.get('THROTTLE_TTL_MS', 60_000),
                        limit: config.get('THROTTLE_LIMIT', 120),
                    },
                ],
            }),
            ...queueInfraModules,
            prisma_module_1.PrismaModule,
            health_module_1.HealthModule,
            auth_1.AuthModule,
            employees_1.EmployeesModule,
            devices_1.DevicesModule,
            attendance_module_1.AttendanceModule,
            payroll_module_1.PayrollModule,
            inventory_module_1.InventoryModule,
            imports_module_1.ImportsModule,
            salary_module_1.SalaryModule,
            advances_module_1.AdvancesModule,
            insurance_module_1.InsuranceModule,
            bonuses_module_1.BonusesModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map