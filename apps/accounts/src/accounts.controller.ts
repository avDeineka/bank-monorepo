// accounts/src/accounts.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CreateAccountDto, TransferDto, getErrorMessage, PATTERNS } from '@app/common';
import { AccountsService } from './accounts.service';

@Controller()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}
  private readonly logger = new Logger(AccountsController.name);

  @MessagePattern({ cmd: PATTERNS.SYSTEM.PING })
  ping(@Payload() data: any) {
    this.logger.log(`ping receives ${data.hello}`);
    return { status: 'ok', pong: true };
  }

  @MessagePattern({ cmd: PATTERNS.ACCOUNT.CREATE })
  async createAccount(@Payload() data: CreateAccountDto) {
    try {
      this.logger.log(`Creating account for user ${data.user_id} in ${data.currency}`);
      return await this.accountsService.createAccount(data);
    } catch (error: any) {
      const message = getErrorMessage(error);
      this.logger.error(`Sending to Gateway: ${message}`);
      if (error.code === '23505') {
        this.logger.warn(`unique violation`);
      }
      throw new RpcException({
        code: 'CREATE_ACCOUNT_FAILED',
        message,
        status: 'error',
        statusCode: 409,
      });
    }
  }

  @MessagePattern({ cmd: PATTERNS.ACCOUNT.GET_ACCOUNTS })
  async getAccounts(@Payload() data: { userId: number }) {
    this.logger.log(`user ${data.userId} accounts are asked`);
    return this.accountsService.getAccounts(data.userId);
  }

  @MessagePattern({ cmd: PATTERNS.ACCOUNT.TRANSFER })
  async handleTransfer(@Payload() data: TransferDto) {
    return this.accountsService.transferMoney (data);
  }
}
