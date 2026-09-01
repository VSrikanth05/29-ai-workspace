import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { sanitizeForLog } from '../errors/app.exception';

export class JsonLogger extends ConsoleLogger {
  constructor(levels?: LogLevel[]) {
    super({ logLevels: levels, timestamp: false });
  }

  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    _pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
  ): string {
    const context = contextMessage.replace(/^\s*\[|\]\s*$/g, '');
    const payload =
      typeof message === 'string' && message.startsWith('{')
        ? this.tryParse(message)
        : { message: this.safeMessage(message) };
    return `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level: logLevel,
      context: context || undefined,
      ...payload,
      formattedLevel: formattedLogLevel.trim() || undefined,
    })}\n`;
  }

  private tryParse(message: string): Record<string, unknown> {
    try {
      return JSON.parse(message) as Record<string, unknown>;
    } catch {
      return { message: sanitizeForLog(message) };
    }
  }

  private safeMessage(message: unknown): string {
    if (message instanceof Error) return sanitizeForLog(message.message);
    if (typeof message === 'string') return sanitizeForLog(message);
    try {
      return sanitizeForLog(JSON.stringify(message));
    } catch {
      return 'Unserializable log message';
    }
  }
}
