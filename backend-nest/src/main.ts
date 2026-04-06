import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

async function bootstrap() {
  console.log('Bootstrap starting...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('REDIS_URL set:', !!process.env.REDIS_URL);
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const prisma = app.get(PrismaService);
  const isProduction = config.get<string>('NODE_ENV', 'development') === 'production';
  const trustProxy = config.get<boolean>('TRUST_PROXY', isProduction);
  const appInstance = app.getHttpAdapter().getInstance();

  if (trustProxy && typeof appInstance?.set === 'function') {
    appInstance.set('trust proxy', 1);
  }

  if (typeof appInstance?.disable === 'function') {
    appInstance.disable('x-powered-by');
  }

  app.enableShutdownHooks();
  await prisma.enableShutdownHooks(app);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const corsOrigin = config.get<string>('CORS_ORIGIN', '');
  const fallbackDevOrigins = [/^http:\/\/localhost:\d+$/i, /^http:\/\/127\.0\.0\.1:\d+$/i];
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : isProduction
        ? false
        : fallbackDevOrigins,
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

  const port = config.get<number>('PORT', 5001);
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
