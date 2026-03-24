import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create (AppModule);

  // Цей рядок вмикає глобальну валідацію для всіх пост-запитів!
  // Без цього рядка декоратори в DTO будуть просто "коментарями"
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Відсікає всі поля, яких немає в DTO (захист від isAdmin: true)
    forbidNonWhitelisted: true, // Викидає помилку, якщо є зайві поля
    transform: true, // Автоматично перетворює типи (наприклад, рядок "5" у number 5)
  }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
