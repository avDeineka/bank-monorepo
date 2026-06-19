import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GatewayExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Логуємо для відладки, щоб бачити, що прилітає з RabbitMQ
    console.error('🚨 [Gateway Exception]:', exception);

    // 1. Дефолтні значення
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR; // 500
    let message = 'Internal server error';

    // 2. Якщо мікросервіс повернув об'єкт помилки через RpcException
    // NestJS серіалізує RpcException в об'єкт, який часто лежить в exception.error або прямо в exception
    const errorSource = exception?.error || exception;

    if (errorSource && typeof errorSource === 'object') {
      message = errorSource.message || message;
      
      // Перевіряємо, чи є там валідний код статусу
      if (errorSource.statusCode && Number.isInteger(errorSource.statusCode)) {
        statusCode = errorSource.statusCode;
      } else if (errorSource.status && Number.isInteger(errorSource.status)) {
        statusCode = errorSource.status;
      }
    } else if (exception?.message) {
      message = exception.message;
    }

    // Якщо повідомлення прийшло масивом (валідація DTO)
    if (Array.isArray(message)) {
      message = message.join(', ');
    }

    // 3. Віддаємо чистий HTTP JSON без зависань!
    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
