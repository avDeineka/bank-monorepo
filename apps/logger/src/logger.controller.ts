// logger/src/logger.controller.ts
import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Knex } from 'knex';
import { PATTERNS } from '@app/common';

@Controller()
export class LoggerController {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  @EventPattern({ cmd: PATTERNS.LOGGER.LOG_EVENT }) // Використовуємо EventPattern для .emit()
  async handleLogEvent(@Payload() data: any) {
    console.log('📝 New logging event:', data.event);

    try {
      await this.knex('audit_logs').insert({
        service: data.service,
        event: data.event,
        payload: JSON.stringify(data.payload), // Записуємо деталі як JSON
        created_at: new Date()
      });
    } catch (error) {
      console.error('❌ Log recording error:', error.message);
    }
  }
}