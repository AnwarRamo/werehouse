import { Controller, Get, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController implements OnModuleDestroy {
  private readonly redisEnabled: boolean;
  private readonly redis: Redis | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redisEnabled = this.config.get<boolean>('QUEUES_ENABLED', true);
    this.redis = this.redisEnabled
      ? new Redis(this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379'), {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableReadyCheck: false,
        })
      : null;
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
    const redisHealthy = redis === 'up' || redis === 'disabled';

    return {
      status: db === 'up' && redisHealthy ? 'ok' : 'degraded',
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
    const redisHealthy = redis === 'up' || redis === 'disabled';
    const status = db === 'up' && redisHealthy ? 'ok' : 'degraded';

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

  private async checkRedis(): Promise<'up' | 'down' | 'disabled'> {
    if (!this.redisEnabled || !this.redis) {
      return 'disabled';
    }

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
    if (!this.redis) {
      return;
    }

    await this.redis.quit();
  }
}
