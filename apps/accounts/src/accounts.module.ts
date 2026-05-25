// accounts/src/accounts.module.ts
import { join } from 'path'; 
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule, SERVICES, RABBIT_CONFIG } from '@app/common';
import { RmqModule, LoggerModule, getRaterProtoPath } from '@app/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountsRepository } from './repositories/accounts.repository';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TerminusModule,
    ClientsModule.register([
      {
        name: 'RATER_PACKAGE', // Токен, за яким ми будемо ін'єктувати клієнт в сервіс
        transport: Transport.GRPC,
        options: {
          // Вказуємо хост:порт контейнера rater (використовуй назву сервісу з docker-compose)
          url: process.env.RATER_GRPC_URL || 'rater:50051',
          package: 'rater', // має збігатися з package rater; у rater.proto
          protoPath: getRaterProtoPath(), // шлях до твого proto файлу
        },
      },
    ]),
    DatabaseModule,
    LoggerModule,
    // Реєструємо клієнтів для зв'язку з мікросервісами автентифікації і логів
    RmqModule.register(SERVICES.AUTH, RABBIT_CONFIG.AUTH_QUEUE),
    RmqModule.register(SERVICES.LOGGER, RABBIT_CONFIG.LOGGER_QUEUE),
  ],
  controllers: [
    AccountsController,
    HealthController,
  ],
  providers: [
    AccountsService,
    AccountsRepository,
  ],
})
export class AccountsModule { }
