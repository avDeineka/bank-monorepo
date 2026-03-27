// shared/database/database.module.ts
import { Module, Global } from '@nestjs/common';
import { knex } from 'knex';

@Global() // Робимо його глобальним, щоб не імпортувати в кожному модулі
@Module({
  providers: [
    {
      provide: 'KNEX_CONNECTION',
      useValue: knex({
        client: 'pg',
        connection: process.env.DATABASE_URL || {
          host: process.env.DB_HOST || '127.0.0.1',
          user: 'postgres',
          password: 'QweAsd234',
          database: 'postgres',
        },
      }),
    },
  ],
  exports: ['KNEX_CONNECTION'],
})
export class DatabaseModule {}