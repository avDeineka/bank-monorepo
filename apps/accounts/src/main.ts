// accounts/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RABBIT_CONFIG } from '@app/common';
import { TraceIdInterceptor } from './interceptors/trace-id.interceptor';
import { AppLogger } from './logger/app-logger.service'
import { AccountsModule } from './accounts.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AccountsModule,
    {
      transport: Transport.RMQ,
      options: {
          urls: [ RABBIT_CONFIG.URL ],
          queue: RABBIT_CONFIG.ACCOUNTS_QUEUE,
          queueOptions: { durable: false }
      },
    },
  );
  const logger = app.get(AppLogger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new TraceIdInterceptor());
  await app.listen();
  console.log('🚀 Accounts Microservice is listening...');
}
bootstrap();