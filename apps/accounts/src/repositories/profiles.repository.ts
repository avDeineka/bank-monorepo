// apps/accounts/src/repositories/profiles.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class ProfilesRepository {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  // trx — опціональний аргумент. Якщо він є, використовуємо його.
  async create(data: any, trx?: Knex.Transaction) {
    const qb = trx || this.knex;
    return qb('profiles').insert(data);
  }

  async findByUserId(userId: number) {
    return this.knex('profiles').where({ user_id: userId }).first();
  }
}