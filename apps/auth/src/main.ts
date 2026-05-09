// auth/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RABBIT_CONFIG } from '@app/common';
import { AppLogger } from '@app/common';
import { RmqTraceInterceptor } from '@app/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [RABBIT_CONFIG.URL],
        queue: RABBIT_CONFIG.AUTH_QUEUE,
        queueOptions: { durable: false }
      },
    },
  );
  const logger = app.get(AppLogger);
  app.useLogger(logger);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  app.useGlobalInterceptors(new RmqTraceInterceptor());
  await app.listen();
  console.log('🚀 Auth Microservice is listening...');
}
bootstrap();
