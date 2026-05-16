// accounts/src/accounts.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateAccountDto, TransferDto } from '@app/common';
import { SERVICES, PATTERNS, AppError, AppLogger, traceStorage, getErrorMessage, rpc } from '@app/common';
import { AccountsRepository } from './repositories/accounts.repository';

@Injectable()
export class AccountsService {
  constructor(
    private readonly accountsRepo: AccountsRepository,
    private readonly logger: AppLogger,
    @Inject(SERVICES.AUTH) private readonly authClient: ClientProxy,
    @Inject(SERVICES.LOGGER) private readonly loggerClient: ClientProxy,
  ) {
    this.logger.setContext(AccountsService.name);
  }

  async createAccount(data: CreateAccountDto) {
    try {
      await this.accountsRepo.createWithTransaction(data);

      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.ACCOUNTS,
        event: 'ACCOUNT_CREATED',
        payload: data,
      });

      return { status: 'success' };
    } catch (error) {
      const errorMessage = getErrorMessage (error);
      this.logger.error(`❌ SAGA Triggered, Accounts failed ${errorMessage}`);
      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.ACCOUNTS,
        event: 'NEW_ACCOUNT_FAILED',
        payload: data,
      });
      rpc.emit(this.authClient, PATTERNS.ACCOUNT.CREATE_FAILED, {
        userId: data.user_id,
        reason: errorMessage
      });
      throw error;
    }
  }

  async getAccounts(user_id: number) {
    return this.accountsRepo.findByUserId(user_id);
  }
  
  async transferMoney(fromUserId: number, data: TransferDto) {
    let { fromAccountId, toAccountId, amount, currency } = data;
    try {
      if (amount <= 0) {
        throw new AppError('The amount must be greater than zero', 400, 'INVALID_AMOUNT');
      }
      if (fromAccountId === toAccountId) {
        throw new AppError('Cannot transfer to the same account', 400, 'SAME_ACCOUNT');
      }
      const traceId = traceStorage.getStore()?.traceId || null;
      const transfer = await this.accountsRepo.transferMoney(fromUserId, data, traceId);
      
      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.ACCOUNTS,
        event: 'TRANSFER_COMPLETED',
        payload: { from: fromAccountId, to: toAccountId, amount, status: 'success' }
      });

      this.logger.log(`✅ Transfer completed: ${fromAccountId} -> ${toAccountId} : ${amount} ${currency}`);
      return { status: 'success', transfer };
    
    } catch (rawError) {
      const error = rawError instanceof Error ? rawError : new Error(String(rawError));
      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.ACCOUNTS,
        event: 'TRANSFER_FAILED',
        payload: { from: fromAccountId, to: toAccountId, amount, currency, status: 'error', message: error.message }
      });
      throw error;
    }
  }

}
