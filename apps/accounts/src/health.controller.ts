// apps/accounts/src/health.controller.ts
import { Knex } from 'knex';
import { Controller, Get, Inject } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { HealthCheckService, HealthCheck, MemoryHealthIndicator } from '@nestjs/terminus';
import { PATTERNS } from '@app/common/constants/patterns';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    @Inject('KNEX_CONNECTION') private readonly knex: Knex, // Інжектуємо твій Knex
  ) {}

  //@Get()
  //@HealthCheck() // Цей декоратор автоматично мапить HTTP статус (200 або 503)
  @MessagePattern({ cmd: PATTERNS.SYSTEM.HEALTH })
  check() {
    return this.health.check([
      // 1. Перевірка бази даних Postgres (Кастомний індикатор)
      async () => {
        try {
          // Робимо ультра-швидкий запит у БД
          await this.knex.raw('SELECT 1');
          return { database: { status: 'up' } };
        } catch (err: any) {
          return { database: { status: 'down', message: err?.message || err } };
        }
      },

      // 2. Перевірка оперативної пам'яті (Heap) — не більше 150 МБ
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }
}