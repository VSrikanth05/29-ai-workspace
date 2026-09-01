import {
  Controller,
  Get,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infrastructure/redis.service';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../infrastructure/metrics.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  @Get()
  check() {
    return {
      status: 'ok',
      message: 'AI Document Assistant Backend is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    const checks: Record<string, string> = {};
    const databaseStarted = process.hrtime.bigint();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'unavailable';
    }
    this.metrics?.databaseDuration.observe(
      { outcome: checks.database },
      Number(process.hrtime.bigint() - databaseStarted) / 1e9,
    );

    if (this.redis.isConfigured) {
      checks.redis = (await this.redis.ping()) ? 'ok' : 'unavailable';
      this.metrics?.redisOperations.inc({
        operation: 'ping',
        outcome: checks.redis === 'ok' ? 'success' : 'failure',
      });
    } else {
      checks.redis = 'not_configured';
    }
    const production = this.config.get<string>('NODE_ENV') === 'production';
    checks.storage = production
      ? this.storageConfigured()
        ? 'configured'
        : 'unavailable'
      : 'not_required';
    checks.llm = production
      ? this.llmConfigured()
        ? 'configured'
        : 'unavailable'
      : 'not_required';

    const redisRequired = this.config.get<string>('REDIS_REQUIRED') === 'true';
    const ready =
      checks.database === 'ok' &&
      (!redisRequired || checks.redis === 'ok') &&
      (!production ||
        (checks.storage === 'configured' && checks.llm === 'configured'));
    const payload = {
      status: ready ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };
    if (!ready) throw new ServiceUnavailableException(payload);
    return payload;
  }

  private storageConfigured() {
    return this.config.get<string>('STORAGE_PROVIDER') === 'r2'
      ? [
          'R2_ACCOUNT_ID',
          'R2_ACCESS_KEY_ID',
          'R2_SECRET_ACCESS_KEY',
          'R2_BUCKET_NAME',
        ].every((name) => Boolean(this.config.get(name)))
      : [
          'SUPABASE_URL',
          'SUPABASE_SERVICE_ROLE_KEY',
          'SUPABASE_STORAGE_BUCKET',
        ].every((name) => Boolean(this.config.get(name)));
  }
  private llmConfigured() {
    return [
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'ANTHROPIC_API_KEY',
      'OPENROUTER_API_KEY',
    ].some((name) => Boolean(this.config.get(name)));
  }
}
