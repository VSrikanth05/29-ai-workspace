import { Logger } from '@nestjs/common';

export class AppLogger extends Logger {
  logRequest(method: string, url: string) {
    this.log(`${method} ${url}`);
  }

  logError(error: string) {
    this.error(error);
  }

  logInfo(message: string) {
    this.log(message);
  }

  logWarning(message: string) {
    this.warn(message);
  }
}
