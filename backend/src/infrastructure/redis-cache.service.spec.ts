import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from './redis-cache.service';
import { RedisService } from './redis.service';

describe('RedisCacheService', () => {
  it('namespaces, serializes, expires, and invalidates cached values', async () => {
    const connection = {
      get: jest.fn().mockResolvedValue('{"value":42}'),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };
    const service = new RedisCacheService(
      { connection } as unknown as RedisService,
      {
        get: jest.fn((key: string) =>
          key === 'CACHE_PREFIX' ? 'test' : undefined,
        ),
      } as unknown as ConfigService,
    );

    await expect(service.get<{ value: number }>('key')).resolves.toEqual({
      value: 42,
    });
    await service.set('key', { value: 7 }, 30);
    await service.del('key');
    expect(connection.get).toHaveBeenCalledWith('test:key');
    expect(connection.set).toHaveBeenCalledWith(
      'test:key',
      '{"value":7}',
      'EX',
      30,
    );
    expect(connection.del).toHaveBeenCalledWith('test:key');
  });
});
