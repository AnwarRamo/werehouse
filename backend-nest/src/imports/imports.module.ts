import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportsQueueProcessor } from './imports.queue.processor';
import { QUEUE_NAMES } from '../queues/queue.constants';

const importsQueueModules =
  process.env.NODE_ENV === 'test'
    ? []
    : [
        BullModule.registerQueue(
          { name: QUEUE_NAMES.IMPORTS },
          { name: QUEUE_NAMES.DEAD_LETTER },
        ),
      ];

const importsProcessors =
  process.env.NODE_ENV === 'test' ? [] : [ImportsQueueProcessor];

@Module({
  imports: [...importsQueueModules],
  controllers: [ImportsController],
  providers: [ImportsService, ...importsProcessors],
})
export class ImportsModule {}
