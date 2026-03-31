// logger//main.ts
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { RABBIT_CONFIG } from '@app/common';
import { LoggerModule } from "./logger.module";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    LoggerModule,
    {
      transport: Transport.RMQ,
      options: {
          urls: [ RABBIT_CONFIG.URL ],
          queue: RABBIT_CONFIG.LOGGER_QUEUE,
          queueOptions: { durable: false }
      },
    },
  );
  await app.listen();
  console.log("Logger Microservice is listening...");
}
bootstrap();