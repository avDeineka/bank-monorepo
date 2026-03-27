// accounts/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AccountsModule } from './accounts.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AccountsModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0', // process.env.ACCOUNTS_HOST || '127.0.0.1',
        port: 3001, // порт, вказаний в Gateway
      },
    },
  );
  await app.listen();
  console.log('Accounts Microservice is listening...');
}
bootstrap();