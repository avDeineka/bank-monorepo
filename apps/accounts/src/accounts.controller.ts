// accounts/src/accounts.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TransferDto } from '@app/common';
import { AccountsService } from './accounts.service';

@Controller()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @MessagePattern({ cmd: 'ping' })
  ping(@Payload() data: any) {
    return { status: 'ok', pong: true };
  }

  @MessagePattern({ cmd: 'get_balance' })
  async get_balance(@Payload() data: { userId: number }) {
    return this.accountsService.getBalance (data.userId);
  }

  @MessagePattern({ cmd: 'do_transfer' })
  async handleTransfer(@Payload() data: TransferDto) {
    return this.accountsService.transferMoney (data);
  }
}