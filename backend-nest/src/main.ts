import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  const port = config.get<number>('PORT', 5001);
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
