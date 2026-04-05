// accounts/src/accounts.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RmqModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { ProfilesRepository } from './repositories/profiles.repository';
import { AccountsRepository } from './repositories/accounts.repository';
import { DatabaseModule } from '@app/common';
import { SERVICES, RABBIT_CONFIG } from '@app/common';

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
  ],
})
export class AccountsModule { }
