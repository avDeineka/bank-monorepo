// accounts/src/accounts.controller.ts
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { TransferDto } from '@app/common';
import { PATTERNS } from '@app/common';
import { AccountsService } from './accounts.service';

@Controller()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @MessagePattern({ cmd: PATTERNS.ACCOUNTS.PING })
  ping(@Payload() data: any) {
    return { status: 'ok', pong: true };
  }

  @EventPattern(PATTERNS.ACCOUNTS.CREATE_PROFILE)
  async handleCreateProfile(@Payload() data: any) {
    return this.accountsService.handleRegistration(data);
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