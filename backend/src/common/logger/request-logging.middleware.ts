import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { sanitizeForLog } from '../errors/app.exception';

const logger = new Logger('HTTP');
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export function requestLoggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const supplied = request.headers['x-request-id'];
  const requestId =
    typeof supplied === 'string' && REQUEST_ID_PATTERN.test(supplied)
      ? supplied
      : randomUUID();
  const startedAt = process.hrtime.bigint();
  request.headers['x-request-id'] = requestId;
  response.setHeader('X-Request-Id', requestId);

  response.once('finish', () => {
    logger.log(
      JSON.stringify({
        event: 'http_request_completed',
        requestId,
        method: request.method,
        path: sanitizeForLog(request.originalUrl),
        statusCode: response.statusCode,
        durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
        contentLength: response.getHeader('content-length'),
      }),
    );
  });
  next();
}
