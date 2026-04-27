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

// How often to ping Neon to prevent it from sleeping (ms)
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000; // every 4 minutes

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;
  private readonly slowQueryThresholdMs: number;
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Keep connections alive — critical for Neon serverless
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
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

  /**
   * Connect with retry logic — handles Neon cold-start delays.
   */
  async onModuleInit() {
    const maxRetries = 5;
    const retryDelayMs = 3_000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connection established.');
        this.startKeepalive();
        return;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const message = error instanceof Error ? error.message : String(error);

        if (isLastAttempt) {
          this.logger.error(
            `Database connection failed after ${maxRetries} attempts: ${message}`,
          );
          throw error;
        }

        this.logger.warn(
          `Database connection attempt ${attempt}/${maxRetries} failed: ${message}. Retrying in ${retryDelayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  /**
   * Sends a lightweight ping to Neon every 4 minutes so it never
   * enters sleep mode while the backend is running.
   */
  private startKeepalive() {
    this.keepaliveTimer = setInterval(async () => {
      try {
        await this.pool.query('SELECT 1');
        this.logger.debug('[Keepalive] Neon ping OK');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[Keepalive] Neon ping failed: ${message}`);
      }
    }, KEEPALIVE_INTERVAL_MS);

    // Don't block process exit
    if (this.keepaliveTimer.unref) {
      this.keepaliveTimer.unref();
    }

    this.logger.log(
      `[Keepalive] Started — pinging Neon every ${KEEPALIVE_INTERVAL_MS / 1000}s to prevent sleep.`,
    );
  }

  async enableShutdownHooks(app: INestApplication) {
    process.once('beforeExit', async () => {
      await app.close();
    });
  }

  async onModuleDestroy() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    await this.$disconnect();
    await this.pool.end();
  }
}
