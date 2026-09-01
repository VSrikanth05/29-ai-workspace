import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { RedisCacheService } from './redis-cache.service';
import { RedisService } from './redis.service';
import { RequestMetricsInterceptor } from './request-metrics.interceptor';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { EnvironmentValidationService } from './environment-validation.service';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    RedisService,
    RedisCacheService,
    MetricsService,
    AuditService,
    EnvironmentValidationService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestMetricsInterceptor,
    },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [RedisService, RedisCacheService, MetricsService, AuditService],
})
export class InfrastructureModule {}
