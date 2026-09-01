import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get<string>('REDIS_URL'));
  }

  get connection(): Redis | null {
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn(
        'Redis is not configured; cache and async jobs are disabled.',
      );
      return;
    }

    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      connectionName: 'document-assistant-api',
    });
    client.on('error', (error) =>
      this.logger.error(
        JSON.stringify({ event: 'redis_error', message: error.message }),
      ),
    );

    try {
      await client.connect();
      this.client = client;
      this.logger.log(JSON.stringify({ event: 'redis_connected' }));
    } catch (error) {
      client.disconnect();
      if (this.config.get<string>('REDIS_REQUIRED') === 'true') throw error;
      this.logger.warn(
        JSON.stringify({
          event: 'redis_unavailable',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  async ping(): Promise<boolean> {
    return this.client ? (await this.client.ping()) === 'PONG' : false;
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client) await this.client.quit();
  }
}
