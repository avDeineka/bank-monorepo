// apps/rater/src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { getRaterProtoPath } from '@app/common';
import { RaterModule } from './rater.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(RaterModule, {
    transport: Transport.GRPC,
    options: {
      package: 'rater',
      protoPath: getRaterProtoPath(),
      url: '0.0.0.0:3004', // порт, який ми виділили в docker-compose
    },
  });
  app.enableShutdownHooks();

  await app.listen();
  console.log('🚀 Rater gRPC microservice is running on port 3004');
}
bootstrap();
