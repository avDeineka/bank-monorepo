// gateway/payments.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ACCOUNTS_SERVICE', // Ім'я, за яким ми будемо звертатися
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3001, // мікросервіс account слухатиме тут
        },
      },
    ]),
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}