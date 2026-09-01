import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infrastructure/redis.service';

describe('HealthController', () => {
  function controller(options: {
    database?: boolean;
    redis?: boolean;
    redisConfigured?: boolean;
    redisRequired?: boolean;
  }) {
    const prisma = {
      $queryRaw:
        options.database === false
          ? jest.fn().mockRejectedValue(new Error('down'))
          : jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const redis = {
      isConfigured: options.redisConfigured ?? true,
      ping: jest.fn().mockResolvedValue(options.redis ?? true),
    };
    const config = {
      get: jest.fn((key: string) =>
        key === 'REDIS_REQUIRED' && options.redisRequired ? 'true' : undefined,
      ),
    };
    return new HealthController(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      config as unknown as ConfigService,
    );
  }

  it('preserves liveness and reports ready dependencies', async () => {
    const health = controller({});
    expect(health.live()).toMatchObject({ status: 'ok' });
    await expect(health.ready()).resolves.toMatchObject({
      status: 'ready',
      checks: { database: 'ok', redis: 'ok' },
    });
  });

  it('fails readiness when the database or required Redis is unavailable', async () => {
    await expect(
      controller({ database: false }).ready(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      controller({ redis: false, redisRequired: true }).ready(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('allows Redis to be absent in synchronous compatibility mode', async () => {
    await expect(
      controller({ redisConfigured: false, redisRequired: false }).ready(),
    ).resolves.toMatchObject({
      status: 'ready',
      checks: { redis: 'not_configured' },
    });
  });
});
