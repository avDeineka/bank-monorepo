// accounts/src/interceptors/trace-id.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { traceStorage } from '../trace-storage';

@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const rpcContext = context.switchToRpc().getContext();
    //
    const message = rpcContext.getMessage();
    console.log('Incoming Rpc Headers:', message?.properties.headers);

    // Витягуємо заголовок з RabbitMQ повідомлення
    const traceId = rpcContext.getMessage().properties.headers['x-trace-id'];

    if (traceId) {
      // Запускаємо контекст для всього, що буде відбуватися в Accounts
      return traceStorage.run({ traceId }, () => next.handle());
    }

    return next.handle();
  }
}