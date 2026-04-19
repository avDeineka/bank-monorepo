// logger/app-logger.service.ts
import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import { traceStorage } from '@app/common';

@Injectable(/*{ scope: Scope.TRANSIENT }*/) // за замовчуванням Singleton
export class AppLogger extends ConsoleLogger {

  // Допоміжний метод для отримання Trace ID
  private getMessageWithTrace(message: any): string {
    const store = traceStorage.getStore();
    const tracePrefix = store?.traceId ? `[trace:${store.traceId}] ` : '';
    return `${tracePrefix}${message}`;
  }

  // Перевантажуємо основні методи логування
  log(message: any, context?: string) {
    super.log(this.getMessageWithTrace(message), context);
  }

  error(message: any, stack?: string, context?: string) {
    super.error(this.getMessageWithTrace(message), stack, context);
  }

  warn(message: any, context?: string) {
    super.warn(this.getMessageWithTrace(message), context);
  }

  debug(message: any, context?: string) {
    super.debug(this.getMessageWithTrace(message), context);
  }

  verbose(message: any, context?: string) {
    super.verbose(this.getMessageWithTrace(message), context);
  }
}