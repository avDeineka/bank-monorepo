import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { RABBIT_CONFIG, AppLogger } from '@app/common';
import { AppModule } from './app.module';
import { GatewayExceptionFilter } from './filters/gateway-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Це дозволить логеру чекати на ініціалізацію модулів
  });
  app.enableShutdownHooks();

  const logger = app.get(AppLogger);
  app.useLogger(logger); // Тепер AppLogger — головний у домі

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
      queue: RABBIT_CONFIG.GATEWAY_QUEUE,
      queueOptions: { durable: false },
    },
  });

  await app.startAllMicroservices();
  app.enableCors({
    origin: 'http://localhost:3000', // URL нашого Next.js фронтенду
    credentials: true,               // Критично важливо для кук, які ми підключимо далі
  });
  app.useGlobalFilters(new GatewayExceptionFilter());
  await app.listen(process.env.PORT ?? 2999);
  console.log(`🚀 Gateway service is listening...`);
}
bootstrap();
