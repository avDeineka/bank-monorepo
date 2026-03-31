// accounts/src/accounts.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { DatabaseModule } from '@app/common';
import { SERVICES, RABBIT_CONFIG } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    // Реєструємо клієнта для зв'язку з мікросервісом логів
    ClientsModule.register([
      {
        name: SERVICES.LOGGER,
        transport: Transport.RMQ,
        options: {
          urls: [ RABBIT_CONFIG.URL ],
          queue: RABBIT_CONFIG.LOGGER_QUEUE,
          queueOptions: { durable: false }
        },
      },
    ]),
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule { }
