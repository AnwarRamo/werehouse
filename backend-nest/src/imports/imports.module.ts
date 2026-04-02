import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportsQueueProcessor } from './imports.queue.processor';
import { QUEUE_NAMES } from '../queues/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.IMPORTS },
      { name: QUEUE_NAMES.DEAD_LETTER },
    ),
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportsQueueProcessor],
})
export class ImportsModule {}
