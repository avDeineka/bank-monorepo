// libs/common/src/interceptors/rmq-trace.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { traceStorage } from '../trace-storage';

@Injectable()
export class RmqTraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 1. Витягуємо дані RabbitMQ
    const rmqContext = context.switchToRpc().getContext();
    const headers = rmqContext.getMessage().properties.headers;
    
    // 2. Шукаємо наш trace-id
    const traceId = headers?.['x-trace-id'];

    if (!traceId) {
      return next.handle();
    }

    // 3. ЗАПУСКАЄМО КОНТЕКСТ ДЛЯ ВСІЄЇ ПОДАЛЬШОЇ ОБРОБКИ
    return new Observable((observer) => {
      traceStorage.run({ traceId }, () => {
        next.handle().subscribe(observer);
      });
    });
  }
}