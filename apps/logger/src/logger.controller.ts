// logger/src/logger.controller.ts
import { Controller, Inject, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Knex } from 'knex';
import { PATTERNS } from '@app/common';

@Controller()
export class LoggerController {
  constructor(@Inject('KNEX_CONNECTION') private readonly knex: Knex) {}

  private readonly logger = new Logger(LoggerController.name);

  @EventPattern (PATTERNS.SYSTEM.LOGGER) // EventPattern для .emit()
  async handleLogEvent(@Payload() data: any) {
    this.logger.log(`📝 logging event: ${data.event} ${JSON.stringify(data.payload)}`);

    try {
      await this.knex('audit_logs').insert({
        service: data.service,
        event: data.event,
        payload: JSON.stringify(data.payload), // Записуємо деталі як JSON
        created_at: new Date()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('❌ Failed to record log event', errorMessage);
    }
  }
}
