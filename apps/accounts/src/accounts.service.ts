// accounts/src/accounts.service.ts
import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Knex } from 'knex';
import { TransferDto } from '@app/common';
import { SERVICES, PATTERNS } from '@app/common';

@Injectable()
export class AccountsService {
  constructor(
    @Inject('KNEX_CONNECTION') private readonly knex: Knex,
    // Цей рядок ОБОV'ЯЗКОВО має бути тут:
    @Inject(SERVICES.LOGGER) private readonly loggerClient: ClientProxy,
  ) { }

  async createProfile(data: { userId: number; name: string; phone?: string; preferred_currency?: string }) {
    try {
      await this.knex('profiles').insert({
        user_id: data.userId,
        name: data.name,
        phone: data.phone || null,
        preferred_currency: data.preferred_currency || 'USD',
      });
      console.log(`✅ Profile created for user ${data.userId}`);
    } catch (error) {
      console.error('❌ Failed to create profile:', error.message);
      // Тут можна додати логіку повтору або відкату (Saga pattern), 
      // але для навчання поки достатньо логу
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
      
      this.loggerClient.emit({ cmd: PATTERNS.LOGGER.LOG_EVENT }, {
        service: 'accounts',
        event: 'TRANSFER_COMPLETED',
        payload: { from: fromUserId, to: toUserId, amount, status: 'success' }
      });

      return { status: 'success', message: 'Money transferred' };
    } catch (error) {
      await this.logFailure (fromUserId, toUserId, amount, error.message);
      return { status: 'error', message: error.message };
    }
  }

  // Допоміжний метод для чистоти коду
  private async logFailure(from: number, to: number, amount: number, reason: string) {
    this.loggerClient.emit({ cmd: PATTERNS.LOGGER.LOG_EVENT }, {
      service: 'accounts',
      event: 'TRANSFER_FAILED',
      payload: { from, to, amount, reason, timestamp: new Date() }
    });
  }
}