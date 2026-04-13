import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class TokenRevocationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenRevocationService.name);
  private readonly revokedTokens = new Map<string, number>();
  private readonly fallbackTtlMs = 24 * 60 * 60 * 1000;
  private readonly keyPrefix = 'auth:revoked:';
  private readonly redisUrl: string;
  private readonly requireRedis: boolean;
  private readonly redisConnectionEnabled: boolean;
  private readonly isTestEnv: boolean;

  private redisClient: Redis | null = null;
  private redisReady = false;

  constructor(private readonly config: ConfigService) {
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development').toLowerCase();
    this.isTestEnv = nodeEnv === 'test';
    const strictMode = this.config.get<boolean>('TOKEN_REVOCATION_STRICT', false);
    this.requireRedis = nodeEnv === 'production' && strictMode;

    const queuesEnabled = this.config.get<boolean>(
      'QUEUES_ENABLED',
      nodeEnv === 'production',
    );

    this.redisConnectionEnabled = this.requireRedis || queuesEnabled;
    this.redisUrl = this.redisConnectionEnabled
      ? this.config.get<string>('REDIS_URL', '').trim()
      : '';
  }

  async onModuleInit() {
    if (this.isTestEnv) {
      return;
    }

    if (!this.redisConnectionEnabled) {
      this.logger.log(
        'Redis token revocation connection is disabled for this environment; using in-memory fallback only.',
      );
      return;
    }

    if (!this.redisUrl) {
      if (this.requireRedis) {
        throw new Error(
          'REDIS_URL is required in production because token revocation is fail-closed.',
        );
      }

      this.logger.warn(
        'REDIS_URL is not configured; token revocation will use in-memory fallback only.',
      );
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
        // Prevent unhandled ioredis error event noise during failed initial connection attempts.
      });

      await client.connect();
      this.redisClient = client;
      this.redisReady = true;
      this.logger.log('Redis-backed token revocation is enabled.');
    } catch (error) {
      // Ensure failed connection attempts do not leave reconnect handles open.
      client?.disconnect();

      if (this.requireRedis) {
        throw new Error(
          `Failed to initialize required Redis token revocation store: ${this.describeError(error)}`,
        );
      }

      this.logger.warn(
        `Failed to initialize Redis token revocation store. Falling back to in-memory mode. Reason: ${this.describeError(
          error,
        )}`,
      );
      this.redisClient = null;
      this.redisReady = false;
    }
  }

  async onModuleDestroy() {
    if (!this.redisClient) return;

    try {
      await this.redisClient.quit();
    } catch {
      // Ignore shutdown errors for best-effort cleanup.
      this.redisClient.disconnect();
    } finally {
      this.redisClient = null;
      this.redisReady = false;
    }
  }

  async revoke(token: string, expUnixSeconds?: number) {
    if (!token) return;

    this.cleanupExpired();

    const expiresAt =
      typeof expUnixSeconds === 'number' && Number.isFinite(expUnixSeconds)
        ? Math.max(expUnixSeconds * 1000, Date.now() + 1000)
        : Date.now() + this.fallbackTtlMs;

    const hash = this.hash(token);
    const ttlSeconds = Math.max(Math.ceil((expiresAt - Date.now()) / 1000), 1);

    if (this.redisReady && this.redisClient) {
      try {
        await this.redisClient.set(this.redisKey(hash), '1', 'EX', ttlSeconds);
        return;
      } catch (error) {
        this.disableRedis(`write failed: ${this.describeError(error)}`);
        if (this.requireRedis) {
          this.throwRevocationStoreUnavailable();
        }
      }
    }

    if (this.requireRedis) {
      this.throwRevocationStoreUnavailable();
    }

    this.revokedTokens.set(hash, expiresAt);
  }

  async isRevoked(token: string) {
    if (!token) return false;

    this.cleanupExpired();
    const hash = this.hash(token);

    if (this.redisReady && this.redisClient) {
      try {
        const exists = await this.redisClient.exists(this.redisKey(hash));
        if (exists === 1) {
          return true;
        }
      } catch (error) {
        this.disableRedis(`read failed: ${this.describeError(error)}`);
        if (this.requireRedis) {
          this.throwRevocationStoreUnavailable();
        }
      }
    }

    if (this.requireRedis) {
      this.throwRevocationStoreUnavailable();
    }

    return this.revokedTokens.has(hash);
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private redisKey(tokenHash: string) {
    return `${this.keyPrefix}${tokenHash}`;
  }

  private disableRedis(reason: string) {
    if (!this.redisReady) return;
    this.redisReady = false;

    if (this.redisClient) {
      this.redisClient.disconnect();
      this.redisClient = null;
    }

    const modeMessage = this.requireRedis
      ? 'fail-closed mode is active.'
      : 'using in-memory fallback.';
    this.logger.warn(`Redis token revocation became unavailable; ${modeMessage} ${reason}`);
  }

  private throwRevocationStoreUnavailable(): never {
    throw new ServiceUnavailableException('Token revocation store is unavailable');
  }

  private describeError(error: unknown) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'unknown error';
  }

  private cleanupExpired(now = Date.now()) {
    for (const [tokenHash, expiresAt] of this.revokedTokens.entries()) {
      if (expiresAt <= now) {
        this.revokedTokens.delete(tokenHash);
      }
    }
  }
}
