import { ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { AppException, ErrorCode } from '../errors/app.exception';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('returns the stable envelope and redacts secrets from structured logs', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn();
    const response = { status, setHeader };
    const request = {
      method: 'POST',
      url: '/chat/sessions/session-1/messages',
      headers: { 'x-request-id': 'request-123' },
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const exception = new AppException(
      ErrorCode.AI_PROVIDER_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
      'The provider is unavailable.',
      new Error(
        'request failed?key=top-secret Authorization=Bearer token-value',
      ),
    );

    new HttpExceptionFilter().catch(exception, host);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 503,
        code: ErrorCode.AI_PROVIDER_UNAVAILABLE,
        requestId: 'request-123',
      }),
    );
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'request-123');
    const logged = String(log.mock.calls[0][0]);
    expect(logged).toContain('http_request_failed');
    expect(logged).not.toContain('top-secret');
    expect(logged).not.toContain('token-value');
  });
});
