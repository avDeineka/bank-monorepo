// accounts/src/accounts.module.ts
import { Module } from '@nestjs/common';
import { RmqModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/common';
import { SERVICES, RABBIT_CONFIG } from '@app/common';
import { AppLogger } from './logger/app-logger.service'
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { ProfilesRepository } from './repositories/profiles.repository';
import { AccountsRepository } from './repositories/accounts.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    // Реєструємо клієнтів для зв'язку з мікросервісами автентифікації і логів
    RmqModule.register(SERVICES.AUTH, RABBIT_CONFIG.AUTH_QUEUE),
    RmqModule.register(SERVICES.LOGGER, RABBIT_CONFIG.LOGGER_QUEUE),
  ],
  controllers: [AccountsController],
  providers: [
    AccountsService,
    ProfilesRepository,
    AccountsRepository,
    AppLogger,
  ],
  exports: [AppLogger],
})
export class AccountsModule { }
