// apps/accounts/src/repositories/accounts.repository.ts
import { Injectable, Inject, OnApplicationShutdown } from '@nestjs/common';
import { Knex } from 'knex';
import { AppError, CreateAccountDto, TransferDto } from '@app/common';

@Injectable()
export class AccountsRepository implements OnApplicationShutdown {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  async onApplicationShutdown(signal: string) {
    console.log(`\n🛑 [Accounts] Received ${signal}. Closing repository resources gracefully...`);

    // Тут можна виконати якісь специфічні кастомні очищення, якщо треба.
    // Пул Кнексу закриється сам, але якщо раптом ти захочеш закрити його примусово вручну:
    // await this.knex.destroy();
    // console.log(`🔌 [Accounts] Knex connection pool destroyed.`);
  }

  async create(data: CreateAccountDto, trx?: Knex.Transaction) {
    const qb = trx || this.knex;
    return qb('accounts').insert(data);
  }

  async createWithTransaction(data: CreateAccountDto) {
    return this.knex.transaction(async (trx) => {
      await this.create(data, trx);
    });
  }

  async findById(id: number) {
    return this.knex('accounts')
      .first('id','user_id', 'currency', 'balance', 'iban', 'created_at')
      .where({ id });
  }

  async findByUserId(user_id: number) {
    return this.knex('accounts')
      .select('id', 'currency', 'balance', 'iban', 'created_at')
      .where({ user_id })
      .orderBy('currency', 'asc');
  }

  async executeTransfer(
    fromUserId: number,
    data: TransferDto,
    rate: number, // 👈 Передаємо курс (для однакових валют це буде 1)
    traceId: string | null
  ) {
    const { fromAccountId, toAccountId, amount } = data;

    return this.knex.transaction(async (trx) => {
      // Безпечне блокування рядків для запобігання Deadlocks
      const lockOrder = [fromAccountId, toAccountId].sort((a, b) => a - b);
      const lockedAccounts = await trx('accounts')
        .whereIn('id', lockOrder)
        .forUpdate();

      const sender = lockedAccounts.find((acc) => acc.id === fromAccountId);
      const recipient = lockedAccounts.find((acc) => acc.id === toAccountId);

      if (!sender) {
        throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
      }
      if (sender.user_id !== fromUserId) {
        throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
      }
      if (sender.balance < amount) {
        throw new AppError('Insufficient funds', 422, 'INSUFFICIENT_FUNDS');
      }
      if (!recipient) {
        throw new AppError('Recipient not found', 404, 'RECIPIENT_NOT_FOUND');
      }

      // Розраховуємо суму до зарахування
      // Використовуємо Math.round, щоб уникнути дробів у копійках (якщо баланс у копійках-integer)
      const creditAmount = rate === 1 ? amount : Math.round(amount * rate);

      // Знімаємо оригінальну суму з рахунку відправника
      await trx('accounts')
        .where({ id: fromAccountId })
        .decrement('balance', amount);

      // Зараховуємо сконвертовану суму отримувачу
      await trx('accounts')
        .where({ id: toAccountId })
        .increment('balance', creditAmount);

      // Зберігаємо запис про трансфер
      const [insertedTransfer] = await trx('transfers')
        .insert({
          trace_id: traceId,
          from_account_id: sender.id,
          to_account_id: recipient.id,
          amount: data.amount,          // Оригінальна сума списання
          currency: sender.currency,    // Валюта списання
          rate: rate,                   // Зберігаємо курс, з яким пройшла транзакція
          purpose: data.purpose || null,
          status: 'COMPLETED',
        })
        .returning('*');

      return insertedTransfer;
    });
  }
}
