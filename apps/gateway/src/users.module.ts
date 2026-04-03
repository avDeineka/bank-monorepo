// users.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RmqModule } from '@app/common';
import { SERVICES, RABBIT_CONFIG } from '@app/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    RmqModule.register(SERVICES.ACCOUNTS, RABBIT_CONFIG.ACCOUNTS_QUEUE),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // ЦЕ КРИТИЧНО! Без цього сервіс буде "невидимим" зовні
})
export class UsersModule {}