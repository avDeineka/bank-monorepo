// apps/accounts/src/repositories/accounts.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class AccountsRepository {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  async create(data: any, trx?: Knex.Transaction) {
    const qb = trx || this.knex;
    return qb('accounts').insert(data);
  }
}