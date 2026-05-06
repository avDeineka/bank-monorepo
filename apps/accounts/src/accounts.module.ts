// accounts/src/accounts.module.ts
import { Module } from '@nestjs/common';
import { RmqModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/common';
import { SERVICES, RABBIT_CONFIG } from '@app/common';
import { LoggerModule } from '@app/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountsRepository } from './repositories/accounts.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    LoggerModule,
    // Реєструємо клієнтів для зв'язку з мікросервісами автентифікації і логів
    RmqModule.register(SERVICES.AUTH, RABBIT_CONFIG.AUTH_QUEUE),
    RmqModule.register(SERVICES.LOGGER, RABBIT_CONFIG.LOGGER_QUEUE),
  ],
  controllers: [AccountsController],
  providers: [
    AccountsService,
    AccountsRepository,
  ],
})
export class AccountsModule { }
