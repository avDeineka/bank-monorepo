// accounts/src/accounts.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { DatabaseModule } from '@app/common';

@Module({
  imports: [
    DatabaseModule,
    // Реєструємо клієнта для зв'язку з мікросервісом логів
    ClientsModule.register([
      {
        name: 'LOGGER_SERVICE', // Ця назва буде використовуватись в @Inject() у сервісі
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3002, // Порт слухає наш Logger
        },
      },
    ]),
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule { }
