// gateway/payments.module.ts
import { Module } from '@nestjs/common';
import { RmqModule } from '@app/common';
import { SERVICES, RABBIT_CONFIG } from '@app/common';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    RmqModule.register(SERVICES.ACCOUNTS, RABBIT_CONFIG.ACCOUNTS_QUEUE),
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}