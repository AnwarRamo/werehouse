import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PayrollWorkerModule } from './payroll/payroll-worker.module';

async function bootstrap() {
  const logger = new Logger('PayrollWorker');
  const app = await NestFactory.createApplicationContext(PayrollWorkerModule);

  app.enableShutdownHooks();

  logger.log('Payroll worker started and listening for queued jobs');

  const shutdown = async (signal: string) => {
    logger.warn(`Received ${signal}, shutting down payroll worker`);
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

bootstrap().catch((error) => {
  const logger = new Logger('PayrollWorker');
  logger.error('Payroll worker failed to start', error instanceof Error ? error.stack : undefined);
  process.exit(1);
});
