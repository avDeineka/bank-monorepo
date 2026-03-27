// shared/database/database.module.ts
import { Module, Global } from '@nestjs/common';
import { knex } from 'knex';

@Global() // Робимо його глобальним, щоб не імпортувати в кожному модулі
@Module({
  providers: [
    {
      provide: 'KNEX_CONNECTION',
      // Використовуємо useFactory для асинхронної ініціалізації
      useFactory: () => {
        const url = process.env.DATABASE_URL;
        if (!url) {
          console.error('DATABASE_URL is missing!');
        }
        return knex({
          client: 'pg',
          connection: url,
        });
      },
    },
  ],
  exports: ['KNEX_CONNECTION'],
})
export class DatabaseModule {}