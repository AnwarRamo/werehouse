import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type MemoryCacheEntry = {
  value: string;
  expiresAt: number;
};

@Injectable()
export class ShortCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ShortCacheService.name);
  private readonly keyPrefix = 'api:short-cache:';
  private readonly memory = new Map<string, MemoryCacheEntry>();

  private readonly cacheEnabled: boolean;
  private readonly redisUrl: string;

  private redisClient: Redis | null = null;
  private redisReady = false;

  constructor(private readonly config: ConfigService) {
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development').toLowerCase();
    this.cacheEnabled = this.config.get<boolean>('CACHE_ENABLED', nodeEnv !== 'test');
    this.redisUrl = this.config.get<string>('REDIS_URL', '').trim();
  }

  async onModuleInit() {
    if (!this.cacheEnabled || !this.redisUrl) {
      return;
    }

    let client: Redis | null = null;

    try {
      client = new Redis(this.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
      });

      client.on('error', () => {
        // Prevent unhandled ioredis error event noise.
      });

      await client.connect();
      this.redisClient = client;
      this.redisReady = true;
      this.logger.log('Short response cache is using Redis backend.');
    } catch (error) {
      client?.disconnect();
      this.redisClient = null;
      this.redisReady = false;
      this.logger.warn(
        `Redis short cache init failed. Falling back to in-memory cache only. Reason: ${this.describeError(
          error,
        )}`,
      );
    }
  }

  async onModuleDestroy() {
    if (!this.redisClient) {
      return;
    }

    try {
      await this.redisClient.quit();
    } catch {
      this.redisClient.disconnect();
    } finally {
      this.redisClient = null;
      this.redisReady = false;
    }
  }

  async getOrSetJson<T>(key: string, ttlSeconds: number, producer: () => Promise<T>): Promise<T> {
    const ttl = Math.max(1, Math.floor(ttlSeconds));
    if (!this.cacheEnabled) {
      return producer();
    }

    const now = Date.now();
    this.pruneExpired(now);

    const memoryHit = this.memory.get(key);
    if (memoryHit && memoryHit.expiresAt > now) {
      try {
        return JSON.parse(memoryHit.value) as T;
      } catch {
        this.memory.delete(key);
      }
    }

    if (this.redisReady && this.redisClient) {
      try {
        const cached = await this.redisClient.get(this.redisKey(key));
        if (cached) {
          this.memory.set(key, {
            value: cached,
            expiresAt: now + ttl * 1000,
          });
          return JSON.parse(cached) as T;
        }
      } catch (error) {
        this.disableRedis(`read failed: ${this.describeError(error)}`);
      }
    }

    const value = await producer();

    try {
      const serialized = JSON.stringify(value);
      this.memory.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttl * 1000,
      });

      if (this.redisReady && this.redisClient) {
        try {
          await this.redisClient.set(this.redisKey(key), serialized, 'EX', ttl);
        } catch (error) {
          this.disableRedis(`write failed: ${this.describeError(error)}`);
        }
      }
    } catch {
      // Ignore serialization failures and return fresh response.
    }

    return value;
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    if (!this.cacheEnabled || !prefix) {
      return;
    }

    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) {
        this.memory.delete(key);
      }
    }

    if (!this.redisReady || !this.redisClient) {
      return;
    }

    try {
      let cursor = '0';
      const match = this.redisKey(`${prefix}*`);

      do {
        const [nextCursor, keys] = await this.redisClient.scan(cursor, 'MATCH', match, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.disableRedis(`prefix invalidation failed: ${this.describeError(error)}`);
    }
  }

  private pruneExpired(now = Date.now()) {
    for (const [key, entry] of this.memory.entries()) {
      if (entry.expiresAt <= now) {
        this.memory.delete(key);
      }
    }
  }

  private redisKey(key: string) {
    return `${this.keyPrefix}${key}`;
  }

  private disableRedis(reason: string) {
    if (!this.redisReady) {
      return;
    }

    this.redisReady = false;
    this.redisClient?.disconnect();
    this.redisClient = null;
    this.logger.warn(`Short response cache switched to memory fallback. ${reason}`);
  }

  private describeError(error: unknown) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'unknown error';
  }
}