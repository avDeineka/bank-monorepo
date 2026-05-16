// libs/common/src/logger/app-logger.service.ts
import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import { traceStorage } from '../trace-storage';

@Injectable()
export class AppLogger extends ConsoleLogger {
  
  log(message: any, context?: string) {
    this.printMessage(message, 'log', context);
  }

  error(message: any, stack?: string, context?: string) {
    this.printMessage(message, 'error', context, stack);
  }

  warn(message: any, context?: string) {
    this.printMessage(message, 'warn', context);
  }

  private printMessage(message: any, level: 'log' | 'error' | 'warn', context?: string, stack?: string) {
    const store = traceStorage.getStore();
    const traceId = store?.traceId ? `[trace:${store.traceId}] ` : '';
    
    // Формуємо фінальне повідомлення з трейсом
    const formattedMessage = `${traceId}${message}`;

    if (level === 'error' && stack) {
      super.error(formattedMessage, stack, context);
    } else {
      super[level](formattedMessage, context);
    }
  }
}