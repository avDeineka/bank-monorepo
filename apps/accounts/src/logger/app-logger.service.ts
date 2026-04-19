// accounts/src/logger/app-logger.service.ts
import { ConsoleLogger, Injectable } from '@nestjs/common';
import { traceStorage } from '../trace-storage';

@Injectable()
export class AppLogger extends ConsoleLogger {
  private getMessageWithTrace(message: any): string {
    const store = traceStorage.getStore();
    const tracePrefix = store?.traceId ? `[trace:${store.traceId}] ` : '';
    
    const content = typeof message === 'object' 
      ? JSON.stringify(message) 
      : message;

    return `${tracePrefix}${content}`;
  }

  log(message: any, context?: string) {
    super.log(this.getMessageWithTrace(message), context);
  }

  error(message: any, stack?: string, context?: string) {
    super.error(this.getMessageWithTrace(message), stack, context);
  }

  warn(message: any, context?: string) {
    super.warn(this.getMessageWithTrace(message), context);
  }
}