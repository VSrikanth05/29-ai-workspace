import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const action = this.action(
      request.method,
      request.originalUrl.split('?')[0],
    );
    if (!action) return next.handle();
    return next.handle().pipe(
      tap({
        next: (result: unknown) => {
          const responseUser = this.object(this.object(result).user);
          this.record(request, action, this.text(responseUser.id));
        },
        error: (error: unknown) =>
          this.record(request, `${action}.failed`, undefined, error),
      }),
    );
  }
  private record(
    request: Request & { user?: RequestUser },
    action: string,
    responseUserId?: string,
    error?: unknown,
  ) {
    const body = this.object(request.body);
    const query = this.object(request.query);
    const params = this.object(request.params);
    void this.audit.record({
      action,
      userId: request.user?.userId ?? responseUserId,
      workspaceId:
        this.text(body.workspaceId) ??
        this.text(query.workspaceId) ??
        this.text(params.workspaceId),
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      requestId: this.text(request.headers['x-request-id']),
      metadata: {
        method: request.method,
        path: request.originalUrl.split('?')[0],
        resourceId: this.text(params.id) ?? this.text(params.sourceId),
        ...(error
          ? {
              outcome: 'failure',
              error: error instanceof Error ? error.name : 'UnknownError',
            }
          : { outcome: 'success' }),
      },
    });
  }
  private action(method: string, path: string): string | undefined {
    if (path === '/auth/login' && method === 'POST') return 'auth.login';
    if (path === '/auth/logout' && method === 'POST') return 'auth.logout';
    if (path === '/auth/register' && method === 'POST') return 'auth.register';
    if (path === '/workspaces' && method === 'POST') return 'workspace.create';
    if (path.startsWith('/collections') && method !== 'GET')
      return `collection.${method.toLowerCase()}`;
    if (path.startsWith('/tags') && method !== 'GET')
      return `tag.${method.toLowerCase()}`;
    if (path.startsWith('/share') && method !== 'GET')
      return `sharing.${method.toLowerCase()}`;
    if (path === '/preferences' && method === 'PATCH')
      return 'preference.update';
    if (path.includes('/restore') && method === 'POST') return 'output.restore';
    if (path.includes('/export') && method === 'GET') return 'output.export';
    if (path.startsWith('/outputs/') && method === 'DELETE')
      return 'output.delete';
    if (path.startsWith('/ai-studio/') && method === 'POST')
      return path.includes('/regenerate')
        ? 'output.regenerate'
        : 'output.generate';
    if (
      (path.includes('/sources/') || path.startsWith('/documents/')) &&
      method === 'DELETE'
    )
      return 'source.delete';
    return undefined;
  }
  private object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
  private text(value: unknown): string | undefined {
    return typeof value === 'string' && value ? value : undefined;
  }
}
