// gateway/payments.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES } from '@app/common';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.ACCOUNTS, // Ім'я, за яким ми будемо звертатися
        transport: Transport.TCP,
        options: {
          host: process.env.ACCOUNTS_HOST || '127.0.0.1',
          port: 3001, // мікросервіс account слухатиме тут
        },
      },
    ]),
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}