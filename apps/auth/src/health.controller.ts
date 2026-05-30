// apps/auth/src/health.controller.ts
import { Knex } from 'knex';
import { Controller, Inject, OnApplicationShutdown } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { HealthCheckService } from '@nestjs/terminus';
import { PATTERNS, getMemoryHealthIndicator } from '@app/common';

@Controller() // Чистий, без префіксів
export class HealthController implements OnApplicationShutdown {
  constructor(
    private health: HealthCheckService,
    @Inject('KNEX_CONNECTION') private readonly knex: Knex,
  ) { }

  @MessagePattern({ cmd: PATTERNS.SYSTEM.HEALTH })
  check() {
    return this.health.check([
      // 1. Специфічний чек для Accounts — Postgres
      async () => {
        try {
          await this.knex.raw('SELECT 1');
          return { database: { status: 'up' } };
        } catch (err: any) {
          return { database: { status: 'down', message: err?.message || err } };
        }
      },
      // 2. Спільний чек пам'яті з libs/common
      () => getMemoryHealthIndicator(),
    ]);
  }

  async onApplicationShutdown(signal: string) {
    console.log(`\n🛑 [Auth] Received ${signal}. Closing resources gracefully...`);
    // Якщо треба буде примусово щось закрити в auth, код пиши сюди
  }
}
