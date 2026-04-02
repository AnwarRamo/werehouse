import { Controller, Get, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
  }

  @Get('live')
  getLive() {
    return {
      status: 'ok',
      check: 'liveness',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReady() {
    const db = await this.checkDatabase();
    const redis = await this.checkRedis();

    return {
      status: db === 'up' && redis === 'up' ? 'ok' : 'degraded',
      check: 'readiness',
      timestamp: new Date().toISOString(),
      services: {
        database: db,
        redis,
      },
    };
  }

  @Get()
  async getHealth() {
    const db = await this.checkDatabase();
    const redis = await this.checkRedis();
    const status = db === 'up' && redis === 'up' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      framework: 'NestJS',
      services: {
        database: db,
        redis,
      },
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1 as ok`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }
      await this.redis.ping();
      return 'up';
    } catch {
      return 'down';
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
