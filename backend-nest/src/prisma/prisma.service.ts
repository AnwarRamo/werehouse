import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

type PrismaQueryEventClient = {
  $on(eventType: 'query', callback: (event: Prisma.QueryEvent) => void): void;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;
  private readonly slowQueryThresholdMs: number;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    super({
      adapter: new PrismaPg(pool),
      log: [{ emit: 'event', level: 'query' }],
    });

    this.pool = pool;
    this.slowQueryThresholdMs = this.resolveSlowQueryThreshold();
    this.registerSlowQueryObserver();
  }

  private resolveSlowQueryThreshold() {
    const defaultThreshold = process.env.NODE_ENV === 'production' ? 200 : 800;
    const configured = Number(process.env.PRISMA_SLOW_QUERY_MS || defaultThreshold);
    if (!Number.isFinite(configured) || configured <= 0) {
      return defaultThreshold;
    }

    return Math.round(configured);
  }

  private registerSlowQueryObserver() {
    const eventClient = this as unknown as PrismaQueryEventClient;

    eventClient.$on('query', (event: Prisma.QueryEvent) => {
      if (event.duration < this.slowQueryThresholdMs) {
        return;
      }

      const compactQuery = event.query.replace(/\s+/g, ' ').trim();
      const maxQueryPreview = 280;
      const queryPreview =
        compactQuery.length > maxQueryPreview
          ? `${compactQuery.slice(0, maxQueryPreview)}...`
          : compactQuery;

      this.logger.warn(
        `[Slow Query] ${event.duration}ms (threshold: ${this.slowQueryThresholdMs}ms) ${queryPreview}`,
      );
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.once('beforeExit', async () => {
      await app.close();
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
