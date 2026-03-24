// accounts/main.ts
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { LoggerModule } from "./logger.module";

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    LoggerModule,
    {
      transport: Transport.TCP,
      options: { host: "127.0.0.1", port: 3002, },
    },
  );
  await app.listen();
  console.log("Logger Microservice is listening...");
}
bootstrap();