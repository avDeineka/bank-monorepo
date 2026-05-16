// apps/accounts/src/repositories/accounts.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { AppError, CreateAccountDto, TransferDto } from '@app/common';

@Injectable()
export class AccountsRepository {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  async create(data: CreateAccountDto, trx?: Knex.Transaction) {
    const qb = trx || this.knex;
    return qb('accounts').insert(data);
  }

  async createWithTransaction(data: CreateAccountDto) {
    return this.knex.transaction(async (trx) => {
      await this.create(data, trx);
    });
  }

  async findByUserId(user_id: number) {
    return this.knex('accounts')
      .select('id', 'currency', 'balance', 'iban', 'created_at')
      .where({ user_id })
      .orderBy('currency', 'asc');
  }

  async transferMoney(fromUserId: number, data: TransferDto, traceId: string | null) {
    const { fromAccountId, toAccountId, amount, currency } = data;

    return this.knex.transaction(async (trx) => {
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
      if (sender.currency !== currency || recipient.currency !== currency) {
        throw new AppError('Currency mismatch', 422, 'CURRENCY_MISMATCH');
      }

      await trx('accounts')
        .where({ id: fromAccountId })
        .decrement('balance', amount);

      await trx('accounts')
        .where({ id: toAccountId })
        .increment('balance', amount);

      const [insertedTransfer] = await trx('transfers')
        .insert({
          trace_id: traceId,
          from_account_id: sender.id,
          to_account_id: recipient.id,
          amount: data.amount,
          currency: data.currency,
          purpose: data.purpose || null,
          status: 'COMPLETED',
        })
        .returning('*');

      return insertedTransfer;
    });
  }
}
