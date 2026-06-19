import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 1. Визначаємо, чи це вже стандартна HTTP помилка
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : exception?.status || HttpStatus.INTERNAL_SERVER_ERROR; // перевіряємо чи є кастомний статус

    // 2. Витягуємо повідомлення
    let message = exception?.response?.message || exception?.message || 'Internal server error';

    // 3. Якщо мікросервіс прислав нам помилку в об'єкті, дістаємо її текст
    if (exception?.response && typeof exception.response === 'object') {
      message = exception.response.message || message;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: message,
    });
  }
}
