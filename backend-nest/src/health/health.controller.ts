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

  @Get()
  async getHealth() {
    await this.prisma.$queryRaw`SELECT 1 as ok`;

    let redisStatus: 'up' | 'down' = 'down';
    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }
      await this.redis.ping();
      redisStatus = 'up';
    } catch {
      redisStatus = 'down';
    }

    const status = redisStatus === 'up' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      framework: 'NestJS',
      services: {
        database: 'up',
        redis: redisStatus,
      },
    };
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
