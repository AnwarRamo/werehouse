import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

const startupLogger = new Logger('Bootstrap');

process.on('uncaughtException', (err) => {
  console.error('[Bootstrap] Uncaught Exception:', err?.stack || err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Bootstrap] Unhandled Rejection:', reason instanceof Error ? reason.stack : reason);
  process.exit(1);
});

async function bootstrap() {
  // ── Phase 1: environment sanity check ──────────────────────────────────────
  console.log('[Bootstrap] Starting NestJS application...');
  console.log('[Bootstrap] Node.js version :', process.version);
  console.log('[Bootstrap] NODE_ENV         :', process.env.NODE_ENV ?? '(not set)');
  console.log('[Bootstrap] PORT             :', process.env.PORT ?? '(not set, will default to 5001)');
  console.log('[Bootstrap] DATABASE_URL set :', !!process.env.DATABASE_URL);
  console.log('[Bootstrap] REDIS_URL set    :', !!process.env.REDIS_URL);
  console.log('[Bootstrap] JWT_SECRET set   :', !!process.env.JWT_SECRET);

  if (!process.env.DATABASE_URL) {
    console.error('[Bootstrap] FATAL: DATABASE_URL is not set. Cannot start.');
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    console.error('[Bootstrap] FATAL: JWT_SECRET is not set. Cannot start.');
    process.exit(1);
  }

  // ── Phase 2: NestJS module initialisation ──────────────────────────────────
  console.log('[Bootstrap] Calling NestFactory.create() — module graph loading...');
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  try {
    app = await NestFactory.create(AppModule, {
      bufferLogs: false,
    });
  } catch (err) {
    console.error('[Bootstrap] FATAL: NestFactory.create() threw an error.');
    console.error('[Bootstrap] This usually means a module failed to initialise');
    console.error('[Bootstrap] (bad env var, missing dependency, Redis/DB unreachable at startup).');
    console.error('[Bootstrap] Error details:', err instanceof Error ? err.stack : err);
    process.exit(1);
  }
  console.log('[Bootstrap] NestFactory.create() succeeded — all modules initialised.');

  // ── Phase 3: app configuration ─────────────────────────────────────────────
  const config = app.get(ConfigService);
  const prisma = app.get(PrismaService);

  app.enableShutdownHooks();
  await prisma.enableShutdownHooks(app);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const corsOrigin = config.get<string>('CORS_ORIGIN', '');
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((v) => v.trim()) : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Phase 4: bind to port ──────────────────────────────────────────────────
  const port = config.get<number>('PORT', 5001);
  console.log(`[Bootstrap] Calling app.listen(${port})...`);
  try {
    await app.listen(port);
  } catch (err) {
    console.error(`[Bootstrap] FATAL: app.listen(${port}) failed.`);
    console.error('[Bootstrap] Error details:', err instanceof Error ? err.stack : err);
    process.exit(1);
  }

  startupLogger.log(`Application is running on port ${port}`);
  startupLogger.log(`Global prefix: /api`);
  startupLogger.log(`Environment: ${config.get<string>('NODE_ENV', 'development')}`);
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] FATAL: Unhandled error escaped bootstrap():', err instanceof Error ? err.stack : err);
  process.exit(1);
});
