import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly prefix: string;
  private readonly defaultTtl: number;

  constructor(
    private readonly redis: RedisService,
    config: ConfigService,
    @Optional() private readonly metrics?: MetricsService,
  ) {
    this.prefix = config.get<string>('CACHE_PREFIX') ?? 'aida';
    this.defaultTtl = Number(config.get<string>('CACHE_TTL_SECONDS')) || 60;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.redis.connection?.get(this.key(key));
      if (!value) {
        this.metrics?.cacheOperations.inc({ operation: 'miss' });
        return undefined;
      }
      this.metrics?.cacheOperations.inc({ operation: 'hit' });
      return JSON.parse(value) as T;
    } catch (error) {
      this.failure('get', error);
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = this.defaultTtl) {
    try {
      await this.redis.connection?.set(
        this.key(key),
        JSON.stringify(value),
        'EX',
        ttlSeconds,
      );
      this.metrics?.cacheOperations.inc({ operation: 'write' });
    } catch (error) {
      this.failure('set', error);
    }
  }

  async del(...keys: string[]) {
    if (!keys.length) return;
    try {
      await this.redis.connection?.del(...keys.map((key) => this.key(key)));
      this.metrics?.cacheOperations.inc({ operation: 'invalidate' });
    } catch (error) {
      this.failure('delete', error);
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    const client = this.redis.connection;
    if (!client) return;
    try {
      let cursor = '0';
      do {
        const [next, keys] = await client.scan(
          cursor,
          'MATCH',
          this.key(`${prefix}*`),
          'COUNT',
          100,
        );
        cursor = next;
        if (keys.length) await client.del(...keys);
      } while (cursor !== '0');
      this.metrics?.cacheOperations.inc({ operation: 'invalidate' });
    } catch (error) {
      this.failure('scan-delete', error);
    }
  }

  private key(key: string): string {
    return `${this.prefix}:${key}`;
  }
  private failure(operation: string, error: unknown) {
    this.metrics?.cacheOperations.inc({ operation: 'error' });
    this.metrics?.redisOperations.inc({ operation, outcome: 'failure' });
    this.logger.warn(
      JSON.stringify({
        event: 'cache_failure',
        operation,
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  }
}
