import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { normalizeException, sanitizeForLog } from '../errors/app.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, code, message } = normalizeException(exception);

    const suppliedRequestId = request.headers['x-request-id'];
    const requestId =
      typeof suppliedRequestId === 'string' &&
      /^[A-Za-z0-9._-]{1,100}$/.test(suppliedRequestId)
        ? suppliedRequestId
        : randomUUID();
    const safePath = sanitizeForLog(request.url);
    response.setHeader('X-Request-Id', requestId);

    const error = exception instanceof Error ? exception : undefined;
    const cause = error?.cause instanceof Error ? error.cause : undefined;
    this.logger.error(
      JSON.stringify({
        event: 'http_request_failed',
        requestId,
        method: request.method,
        path: safePath,
        statusCode,
        code,
        errorName: error?.name ?? 'UnknownError',
        errorMessage: sanitizeForLog(error?.message ?? String(exception)),
        stack: error?.stack ? sanitizeForLog(error.stack) : undefined,
        causeName: cause?.name,
        causeMessage: cause?.message
          ? sanitizeForLog(cause.message)
          : undefined,
        causeStack: cause?.stack ? sanitizeForLog(cause.stack) : undefined,
      }),
    );

    response.status(statusCode).json({
      success: false,
      statusCode,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: safePath,
      requestId,
    });
  }
}
