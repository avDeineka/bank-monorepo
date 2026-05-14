// accounts/src/accounts.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Knex } from 'knex';
import { CreateAccountDto, TransferDto } from '@app/common';
import { SERVICES, PATTERNS, AppLogger, getErrorMessage, rpc } from '@app/common';
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
      .select('id', 'currency', 'balance')
      .where({ user_id })
      .orderBy('currency', 'asc');
  }
  
  async transferMoney(data: TransferDto) {
    let { fromUserId, toUserId, amount } = data;
    try {
      if (amount <= 0) {
        await this.logFailure(fromUserId, toUserId, amount, 'INVALID_AMOUNT');
        throw new Error('The amount must be greater than zero');
      }
      await this.knex.transaction(async (trx) => {
        // 1. Блокуємо та перевіряємо відправника
        const sender = await trx('accounts')
          .where({ user_id: fromUserId })
          .first()
          .forUpdate();

        if (!sender || sender.balance < amount) {
          throw new Error('Insufficient funds or account not found');
        }

        // 2. Знімаємо
        await trx('accounts')
          .where({ user_id: fromUserId })
          .decrement('balance', amount);

        // 3. Перевіряємо отримувача
        const recipient = await trx('accounts')
          .where({ user_id: toUserId })
          .first();

        if (!recipient) {
          throw new Error('Recipient not found');
        }

        // 4. Додаємо
        await trx('accounts')
          .where({ user_id: toUserId })
          .increment('balance', amount);
      });
      
      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.ACCOUNTS,
        event: 'TRANSFER_COMPLETED',
        payload: { from: fromUserId, to: toUserId, amount, status: 'success' }
      });

      return { status: 'success', message: 'Money transferred' };
    } catch (rawError) {
      const error = rawError instanceof Error ? rawError : new Error(String(rawError));
      await this.logFailure(fromUserId, toUserId, amount, error.message);
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
