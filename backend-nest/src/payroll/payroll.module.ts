import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { AuditService } from '../common/services/audit.service';
import { PayrollQueueProcessor } from './payroll.queue.processor';
import { QUEUE_NAMES } from '../queues/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.PAYROLL },
      { name: QUEUE_NAMES.DEAD_LETTER },
    ),
  ],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollQueueProcessor, AuditService],
})
export class PayrollModule {}
