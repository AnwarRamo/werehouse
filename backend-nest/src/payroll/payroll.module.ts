import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { AuditService } from '../common/services/audit.service';
import { PayrollQueueProcessor } from './payroll.queue.processor';
import { QUEUE_NAMES } from '../queues/queue.constants';

const payrollQueueModules =
  process.env.NODE_ENV === 'test'
    ? []
    : [
        BullModule.registerQueue(
          { name: QUEUE_NAMES.PAYROLL },
          { name: QUEUE_NAMES.DEAD_LETTER },
        ),
      ];

const payrollProcessors =
  process.env.NODE_ENV === 'test' ? [] : [PayrollQueueProcessor];

@Module({
  imports: [...payrollQueueModules],
  controllers: [PayrollController],
  providers: [PayrollService, ...payrollProcessors, AuditService],
})
export class PayrollModule {}
