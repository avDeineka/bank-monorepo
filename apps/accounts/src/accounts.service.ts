// accounts/src/accounts.service.ts
import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Knex } from 'knex';
import { TransferDto } from '@app/common';
import { SERVICES, PATTERNS } from '@app/common';
import { ProfilesRepository } from './repositories/profiles.repository';
import { AccountsRepository } from './repositories/accounts.repository';

@Injectable()
export class AccountsService {
  constructor(
    private readonly profilesRepo: ProfilesRepository,
    private readonly accountsRepo: AccountsRepository,
    @Inject('KNEX_CONNECTION') private readonly knex: Knex,
    // Ці рядки ОБОV'ЯЗКОВО має бути тут:
    @Inject(SERVICES.AUTH) private readonly authClient: ClientProxy,
    @Inject(SERVICES.LOGGER) private readonly loggerClient: ClientProxy,
  ) { }

  async handleRegistration (data: any) {
    try {
      // ДОДАЄМО await, щоб почекати виконання або помилки
      await this.knex.transaction(async (trx) => {
        // 1. Створюємо профіль
        await this.profilesRepo.create({
          user_id: data.userId,
          name: data.name,
          phone: data.phone,
          preferred_currency: data.preferred_currency
        }, trx);

        // 2. Створюємо рахунок
        await this.accountsRepo.create({
          user_id: data.userId,
          currency: data.preferred_currency || 'USD',
          balance: 100,
        }, trx);
      });

      // Якщо все ок, можна повернути успіх
      this.loggerClient.emit (PATTERNS.LOGGER.LOG_EVENT, {
        service: SERVICES.AUTH,
        event: 'NEW_USER',
        payload: data,
      });
      return { status: 'success' };

    } catch (error) {
      // Тепер ми ПРИЗЕМЛИМОСЯ тут
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Registration in Accounts failed (SAGA Triggered):', errorMessage);
      this.loggerClient.emit (PATTERNS.LOGGER.LOG_EVENT, {
        service: SERVICES.AUTH,
        event: 'NEW_USER_FAILED',
        payload: data,
      });

      // Надсилаємо сигнал "відкату" в Auth
      this.authClient.emit(PATTERNS.AUTH.REGISTRATION_FAILED, {
        userId: data.userId,
        reason: errorMessage
      });
      // Важливо: не кидайте помилку далі, якщо хочете, щоб Nest вважав подію обробленою
    }
  }

  async getBalance(userId: number) {
    const account = await this.knex('accounts').where({ user_id: userId }).first();
    if (!account) return { balance: 0, currency: 'USD' };
    return { balance: account.balance, currency: account.currency };
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
      
      this.loggerClient.emit (PATTERNS.LOGGER.LOG_EVENT, {
        service: 'accounts',
        event: 'TRANSFER_COMPLETED',
        payload: { from: fromUserId, to: toUserId, amount, status: 'success' }
      });

      return { status: 'success', message: 'Money transferred' };
    } catch (rawError) {
      const error = rawError instanceof Error ? rawError : new Error(String(rawError));
      await this.logFailure (fromUserId, toUserId, amount, error.message);
      return { status: 'error', message: error.message };
    }
  }

  // Допоміжний метод для чистоти коду
  private async logFailure(from: number, to: number, amount: number, reason: string) {
    this.loggerClient.emit (PATTERNS.LOGGER.LOG_EVENT, {
      service: 'accounts',
      event: 'TRANSFER_FAILED',
      payload: { from, to, amount, reason, timestamp: new Date() }
    });
  }
}