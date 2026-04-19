// users.module.ts
import { Module, Type } from '@nestjs/common';
import { RmqModule } from '@app/common';
import { SERVICES, RABBIT_CONFIG } from '@app/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    RmqModule.register (SERVICES.ACCOUNTS, RABBIT_CONFIG.ACCOUNTS_QUEUE),
    RmqModule.register (SERVICES.LOGGER, RABBIT_CONFIG.LOGGER_QUEUE),
  ],
  controllers: [UsersController],
  providers: [
    /*{
      provide: SERVICES.ACCOUNTS,
      useFactory: () => {
        const client = new TraceableRmqClient({
          urls: [process.env.RABBITMQ_URL],
          queue: RABBIT_CONFIG.ACCOUNTS_QUEUE,
          queueOptions: { durable: true },
        });
        // Важливо: NestJS клієнти потребують явного підключення
        client.connect();
        return client;
      },
    },*/
    UsersService,
  ],
  exports: [
    UsersService, // ЦЕ КРИТИЧНО! Без цього сервіс буде "невидимим" зовні
    //SERVICES.ACCOUNTS
  ],
})
export class UsersModule {}