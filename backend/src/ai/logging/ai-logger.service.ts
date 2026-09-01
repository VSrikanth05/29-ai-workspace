import { Injectable, Logger } from '@nestjs/common';
import { sanitizeForLog } from '../../common/errors/app.exception';

@Injectable()
export class AiLoggerService {
  private readonly logger = new Logger('AiCore');
  event(event: string, fields: Record<string, unknown> = {}) {
    this.logger.log(sanitizeForLog(JSON.stringify({ event, ...fields })));
  }
  error(event: string, fields: Record<string, unknown> = {}) {
    this.logger.error(sanitizeForLog(JSON.stringify({ event, ...fields })));
  }
}
