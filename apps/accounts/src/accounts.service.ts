// accounts/src/accounts.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Knex } from 'knex';
import { CreateAccountDto, TransferDto } from '@app/common';
import { SERVICES, PATTERNS, AppLogger, traceStorage, getErrorMessage, rpc } from '@app/common';
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
    let { fromAccountId, toAccountId, amount, currency, purpose } = data;
    try {
      if (amount <= 0) {
        await this.logFailure(fromAccountId, toAccountId, amount, 'INVALID_AMOUNT');
        throw new Error('The amount must be greater than zero');
      }
      const traceId = traceStorage.getStore()?.traceId || null;
      const transfer = await this.knex.transaction(async (trx) => {
        // 1. Блокуємо та перевіряємо відправника
        const sender = await trx('accounts')
          .where({ user_id: fromUserId, id: fromAccountId })
          .first()
          .forUpdate();

        if (!sender || sender.balance < amount) {
          throw new Error('Insufficient funds or account not found');
        }

        // 2. Перевіряємо отримувача
        const recipient = await trx('accounts')
          .where({ id: toAccountId })
          .first();

        if (!recipient) {
          throw new Error('Recipient not found');
        }

        // 3. Перевіряємо валюту
        if (sender.currency !== currency || recipient.currency !== currency) {
          throw new Error('Currency mismatch');
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
        const [transfer] = await trx('transfers').insert({
          trace_id: traceId,
          from_account_id: sender.id,
          to_account_id: recipient.id,
          amount: data.amount,
          currency: data.currency,
          purpose: data.purpose || null,
          status: 'COMPLETED'
        }).returning('*');
      });
      
      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.ACCOUNTS,
        event: 'TRANSFER_COMPLETED',
        payload: { from: fromAccountId, to: toAccountId, amount, status: 'success' }
      });

      this.logger.log(`✅ Transfer completed: ${fromAccountId} -> ${toAccountId} : ${amount} ${currency}`);
      console.log(transfer); // Додано для дебагу
      return { status: 'success', transfer };
    
    } catch (rawError) {
      const error = rawError instanceof Error ? rawError : new Error(String(rawError));
      await this.logFailure(fromAccountId, toAccountId, amount, error.message);
      return { status: 'error', message: error.message };
    }
  }

  // Допоміжний метод для чистоти коду
  private async logFailure(from: number, to: number, amount: number, reason: string) {
    rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
      service: SERVICES.ACCOUNTS,
      event: 'TRANSFER_FAILED',
      payload: { from, to, amount, reason, timestamp: new Date() }
    });
  }
}
