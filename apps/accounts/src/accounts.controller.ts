// accounts/src/accounts.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CreateAccountDto, TransferDto, getErrorMessage, PATTERNS, AppError } from '@app/common';
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
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Sending to Gateway: ${message}`);
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
  async handleTransfer(@Payload() data: { fromUserId: number } & TransferDto) {
    try {
      const { fromUserId, ...transferData } = data;
      return await this.accountsService.transferMoney(fromUserId, transferData);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      this.logger.error(`Error occurred while transferring: ${message}`);
      throw new RpcException({
        code: 'TRANSFER_FAILED',
        message,
        status: 'error',
        statusCode,
      });
    }
  }
}
