// accounts/src/accounts.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Knex } from 'knex';
import { CreateAccountDto, TransferDto } from '@app/common';
import { SERVICES, PATTERNS, AppError, AppLogger, traceStorage, getErrorMessage, rpc } from '@app/common';
import { AccountsRepository } from './repositories/accounts.repository';

@Injectable()
export class AccountsService {
  constructor(
    private readonly accountsRepo: AccountsRepository,
    @Inject('KNEX_CONNECTION') private readonly knex: Knex,
    private readonly logger: AppLogger,
    @Inject(SERVICES.AUTH) private readonly authClient: ClientProxy,
    @Inject(SERVICES.LOGGER) private readonly loggerClient: ClientProxy,
  ) {
    this.logger.setContext(AccountsService.name);
  }

  async createAccount(data: CreateAccountDto) {
    try {
      await this.knex.transaction(async (trx) => {
        await this.accountsRepo.create(data, trx);
      });

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
    return this.knex('accounts')
      .select('id', 'currency', 'balance', 'iban', 'created_at')
      .where({ user_id })
      .orderBy('currency', 'asc');
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
      const transfer = await this.knex.transaction(async (trx) => {
        // Впорядковуємо ID від меншого до більшого для запобігання Deadlock
        const lockOrder = [fromAccountId, toAccountId].sort((a, b) => a - b);

        // Блокуємо ОБИДВА рахунки одним махом у правильному порядку
        const lockedAccounts = await trx('accounts')
          .whereIn('id', lockOrder)
          .forUpdate();

        // Знаходимо відправника та отримувача з уже заблокованого масиву
        const sender = lockedAccounts.find(acc => acc.id === fromAccountId);
        const recipient = lockedAccounts.find(acc => acc.id === toAccountId);

        if (!sender) {
          throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
        }
        if (sender.user_id !== fromUserId) {
          throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
        }
        if (!sender || sender.balance < amount) {
          throw new AppError('Insufficient funds', 422, 'INSUFFICIENT_FUNDS');
        }

        if (!recipient) {
          throw new AppError('Recipient not found', 404, 'RECIPIENT_NOT_FOUND');
        }

        // 3. Перевіряємо валюту
        if (sender.currency !== currency || recipient.currency !== currency) {
          throw new AppError('Currency mismatch', 422, 'CURRENCY_MISMATCH');
        }

        // 4. Знімаємо
        await trx('accounts')
          .where({ id: fromAccountId })
          .decrement('balance', amount);

        // 5. Додаємо
        await trx('accounts')
          .where({ id: toAccountId })
          .increment('balance', amount);

        // 6. Фіксуємо в історії
        const [insertedTransfer] = await trx('transfers').insert({
          trace_id: traceId,
          from_account_id: sender.id,
          to_account_id: recipient.id,
          amount: data.amount,
          currency: data.currency,
          purpose: data.purpose || null,
          status: 'COMPLETED'
        }).returning('*');

        return insertedTransfer;
      });
      
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
