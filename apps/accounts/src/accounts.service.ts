// accounts/src/accounts.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateAccountDto, TransferDto } from '@app/common';
import { SERVICES, PATTERNS, AppError, AppLogger, getErrorMessage, rpc, traceStorage } from '@app/common';
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
    const traceId = traceStorage.getStore()?.traceId || null;
    console.log(`Creating account for user ${data.user_id} with currency ${data.currency} and traceId ${traceId}`);
    try {
      await this.accountsRepo.createWithTransaction(data);

      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.ACCOUNTS,
        user_id: data.user_id,
        event: 'ACCOUNT_CREATED',
        payload: data,
        trace_id: traceId,
      });

      return { status: 'success' };
    } catch (error) {
      const errorMessage = getErrorMessage (error);
      this.logger.error(`❌ SAGA Triggered, Accounts failed ${errorMessage}`);
      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.ACCOUNTS,
        user_id: data.user_id,
        event: 'NEW_ACCOUNT_FAILED',
        payload: data,
        trace_id: traceId,
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
    const traceId = traceStorage.getStore()?.traceId || null;
    try {
      if (amount <= 0) {
        throw new AppError('The amount must be greater than zero', 400, 'INVALID_AMOUNT');
      }
      if (fromAccountId === toAccountId) {
        throw new AppError('Cannot transfer to the same account', 400, 'SAME_ACCOUNT');
      }
      const transfer = await this.accountsRepo.transferMoney(fromUserId, data, traceId);
      
      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.ACCOUNTS,
        user_id: fromUserId,
        event: 'TRANSFER_COMPLETED',
        payload: { from: fromAccountId, to: toAccountId, amount, currency, status: 'success' },
        trace_id: traceId,
      });

      this.logger.log(`✅ Transfer completed: ${fromAccountId} -> ${toAccountId} : ${amount} ${currency}`);
      return { status: 'success', transfer };
    
    } catch (rawError) {
      const error = rawError instanceof Error ? rawError : new Error(String(rawError));
      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.ACCOUNTS,
        user_id: fromUserId,
        event: 'TRANSFER_FAILED',
        payload: { from: fromAccountId, to: toAccountId, amount, currency, status: 'error', message: error.message },
        trace_id: traceId,
      });
      throw error;
    }
  }

}
