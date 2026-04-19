// gateway/src/interceptors/rmq-trace.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { traceStorage } from '../trace-storage';

@Injectable()
export class RmqTraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const store = traceStorage.getStore();
    
    // Якщо ми в контексті запиту, додаємо ID до метаданих повідомлення
    if (store?.traceId) {
      const client = context.switchToRpc().getContext();
      // У RabbitMQ заголовки зазвичай передаються в properties
      if (client?.properties) {
        client.properties.headers = {
          ...client.properties.headers,
          'x-trace-id': store.traceId,
        };
      }
    }
    return next.handle();
  }
}