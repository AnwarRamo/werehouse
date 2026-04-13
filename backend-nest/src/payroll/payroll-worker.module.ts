import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { QUEUE_NAMES } from '../queues/queue.constants';
import { PayrollQueueProcessor } from './payroll.queue.processor';
import { PayrollService } from './payroll.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    BullModule.registerQueue(
      { name: QUEUE_NAMES.PAYROLL },
      { name: QUEUE_NAMES.DEAD_LETTER },
    ),
    PrismaModule,
  ],
  providers: [PayrollService, PayrollQueueProcessor],
})
export class PayrollWorkerModule {}
