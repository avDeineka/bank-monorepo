// gateway/payments.module.ts
import { Module } from '@nestjs/common';
//import { ClientsModule, Transport } from '@nestjs/microservices';
import { RmqModule } from '@app/common';
import { SERVICES, RABBIT_CONFIG } from '@app/common';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    RmqModule.register(SERVICES.ACCOUNTS, RABBIT_CONFIG.ACCOUNTS_QUEUE),
    /*ClientsModule.register([
      {
        name: SERVICES.ACCOUNTS,
        transport: Transport.RMQ,
        options: {
          urls: [RABBIT_CONFIG.URL],
          queue: RABBIT_CONFIG.ACCOUNTS_QUEUE,
          queueOptions: { durable: false }
        },
      },
    ]),*/
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}