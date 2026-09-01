import { HttpException, HttpStatus } from '@nestjs/common';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CHAT_SESSION_NOT_FOUND: 'CHAT_SESSION_NOT_FOUND',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  RAG_RETRIEVAL_FAILED: 'RAG_RETRIEVAL_FAILED',
  AI_PROVIDER_UNKNOWN: 'AI_PROVIDER_UNKNOWN',
  AI_PROVIDER_NOT_CONFIGURED: 'AI_PROVIDER_NOT_CONFIGURED',
  AI_PROVIDER_REQUEST_FAILED: 'AI_PROVIDER_REQUEST_FAILED',
  AI_PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',
  AI_PROVIDER_RATE_LIMITED: 'AI_PROVIDER_RATE_LIMITED',
  AI_PROVIDER_AUTHENTICATION_FAILED: 'AI_PROVIDER_AUTHENTICATION_FAILED',
  AI_PROVIDER_INVALID_RESPONSE: 'AI_PROVIDER_INVALID_RESPONSE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface NormalizedError {
  statusCode: number;
  code: ErrorCode;
  message: string;
}

const STATUS_CODES: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
};

export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: HttpStatus,
    message: string,
    cause?: unknown,
  ) {
    super(
      { code, message },
      status,
      cause instanceof Error ? { cause } : undefined,
    );
  }
}

export function databaseUnavailable(cause: unknown): AppException {
  return new AppException(
    ErrorCode.DATABASE_UNAVAILABLE,
    HttpStatus.SERVICE_UNAVAILABLE,
    'The database is temporarily unavailable.',
    cause,
  );
}

export function normalizeException(exception: unknown): NormalizedError {
  const statusCode =
    exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  const response =
    exception instanceof HttpException ? exception.getResponse() : null;
  let code = STATUS_CODES[statusCode] ?? ErrorCode.INTERNAL_ERROR;
  let message = 'Internal Server Error';

  if (typeof response === 'string') {
    message = response;
  } else if (response && typeof response === 'object') {
    if ('message' in response) {
      const responseMessage = (response as { message: string | string[] })
        .message;
      message = Array.isArray(responseMessage)
        ? responseMessage.join(', ')
        : responseMessage;
    }
    if ('code' in response && typeof response.code === 'string') {
      code = response.code as ErrorCode;
    }
  }

  return { statusCode, code, message };
}

export function sanitizeForLog(value: string): string {
  return value
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:key|token|secret|password)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(
      /("?(?:apiKey|token|secret|password|authorization)"?\s*[:=]\s*)[^,\s}]+/gi,
      '$1[REDACTED]',
    );
}
