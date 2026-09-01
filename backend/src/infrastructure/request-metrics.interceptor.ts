import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, finalize } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class RequestMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const duration = Number(process.hrtime.bigint() - startedAt) / 1e9;
        const matchedRoute = request.route as { path?: unknown } | undefined;
        const route =
          typeof matchedRoute?.path === 'string'
            ? `${request.baseUrl}${matchedRoute.path}`
            : 'unmatched';
        const labels = {
          method: request.method,
          route,
          status: String(response.statusCode),
        };
        this.metrics.httpRequests.inc(labels);
        this.metrics.httpDuration.observe(labels, duration);
      }),
    );
  }
}
