import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import { getErrorMessage } from '../utils/postgres-error.interface';

@Catch() // Порожній Catch ловить абсолютно всі помилки
export class AllExceptionsRpcFilter implements RpcExceptionFilter<any> {
  
  catch(exception: any, host: ArgumentsHost): Observable<any> {
    // 1. Отримуємо причесане повідомлення через твою функцію
    const message = getErrorMessage(exception);

    // 2. Формуємо стандартний об'єкт помилки для всього мікросервісу
    const errorResponse = {
      message,
      // Можна додати статус, якщо він є в оригінальній помилці, або 400 за замовчуванням
      statusCode: exception?.status || exception?.statusCode || 400,
      timestamp: new Date().toISOString(),
    };

    // 3. Повертаємо RpcException. NestJS сам запакує його для RabbitMQ
    return throwError(() => new RpcException(errorResponse));
  }
}