import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { RABBIT_CONFIG } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create (AppModule);

  // Цей рядок вмикає глобальну валідацію для всіх пост-запитів!
  // Без цього рядка декоратори в DTO будуть просто "коментарями"
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Відсікає всі поля, яких немає в DTO (захист від isAdmin: true)
    forbidNonWhitelisted: true, // Викидає помилку, якщо є зайві поля
    transform: true, // Автоматично перетворює типи (наприклад, рядок "5" у number 5)
  }));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [RABBIT_CONFIG.URL],
      queue: RABBIT_CONFIG.AUTH_QUEUE, // МАЄ ЗБІГАТИСЯ
      queueOptions: { durable: false },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Gateway & Auth listening on port 3000`);
}
bootstrap();
