import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth';
import { EmployeesModule } from './employees';
import { DevicesModule } from './devices';
import { HealthModule } from './health/health.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PayrollModule } from './payroll/payroll.module';
import { InventoryModule } from './inventory/inventory.module';
import { ImportsModule } from './imports/imports.module';
import { PrismaModule } from './prisma/prisma.module';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { SalaryModule } from './salary/salary.module';
import { AdvancesModule } from './advances/advances.module';
import { InsuranceModule } from './insurance/insurance.module';
import { BonusesModule } from './bonuses/bonuses.module';
import { FilesModule } from './files/files.module';

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

const explicitQueuesEnabled = parseBooleanEnv(process.env.QUEUES_ENABLED);
const queuesEnabled =
  process.env.NODE_ENV !== 'test' &&
  (explicitQueuesEnabled ?? process.env.NODE_ENV === 'production');

const queueInfraModules = queuesEnabled
  ? [
      BullModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          connection: {
            url: config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379'),
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            lazyConnect: true,
            retryStrategy: (times: number) => Math.min(times * 1000, 30000),
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

@Module({
  imports: [
    ConfigModule.forRoot({
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
        QUEUES_ENABLED: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.boolean().default(true),
          otherwise: Joi.boolean().default(false),
        }),
        REDIS_URL: Joi.string().uri().default('redis://127.0.0.1:6379'),
        TOKEN_REVOCATION_STRICT: Joi.boolean().default(false),
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL_MS', 60_000),
          limit: config.get<number>('THROTTLE_LIMIT', 120),
        },
      ],
    }),
    ...queueInfraModules,
    PrismaModule,
    HealthModule,
    AuthModule,
    EmployeesModule,
    DevicesModule,
    AttendanceModule,
    PayrollModule,
    InventoryModule,
    ImportsModule,
    SalaryModule,
    AdvancesModule,
    InsuranceModule,
    BonusesModule,
    FilesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
