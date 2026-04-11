// accounts/src/accounts.controller.ts
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { TransferDto } from '@app/common';
import { PATTERNS } from '@app/common';
import { AccountsService } from './accounts.service';

interface PostgresError extends Error {
  code?: string;
  detail?: string;
  table?: string;
  constraint?: string;
}

@Controller()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @MessagePattern({ cmd: PATTERNS.ACCOUNTS.PING })
  ping(@Payload() data: any) {
    return { status: 'ok', pong: true };
  }

  @MessagePattern({ cmd: PATTERNS.ACCOUNTS.CREATE_PROFILE })
  async handleCreateProfile(@Payload() data: any) {
    try {
      return await this.accountsService.handleRegistration (data);
    } catch (error: any) {
      // Якщо це помилка Postgres (unique constraint), витягуємо чистий текст
      const message = error.detail || error.message;
      console.log('Sending to Gateway:', message);
      if (error.code === '23505') {} // Unique violation
      // Кидаємо ОБ'ЄКТ, це краще для серіалізації в RabbitMQ
      throw new RpcException({ message, status: 'error' });
    }
  }

  @MessagePattern({ cmd: PATTERNS.ACCOUNTS.GET_BALANCE })
  async get_balance(@Payload() data: { userId: number }) {
    return this.accountsService.getBalance (data.userId);
  }

  @MessagePattern({ cmd: PATTERNS.ACCOUNTS.DO_TRANSFER })
  async handleTransfer(@Payload() data: TransferDto) {
    return this.accountsService.transferMoney (data);
  }
}