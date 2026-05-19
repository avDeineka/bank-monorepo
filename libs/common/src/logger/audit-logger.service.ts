// libs/common/src/logger/audit-logger.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES, PATTERNS } from '@app/common';
import { traceStorage } from '../trace-storage';
import { rpc } from '../utils/rpc.utils';

@Injectable()
export class AuditLoggerService {
  constructor(
    private readonly contextService: string, // Назва сервісу (AUTH, ACCOUNTS...)
    private readonly loggerClient: ClientProxy
  ) {}

  log(event: string, payload: any, userId: number | null = null) {
    const traceId = traceStorage.getStore()?.traceId || null;

    rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
      service: this.contextService,
      user_id: userId,
      event,
      payload,
      trace_id: traceId,
    });
  }
}
