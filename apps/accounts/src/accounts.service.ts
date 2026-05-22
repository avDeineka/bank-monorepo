// accounts/src/accounts.service.ts
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { CreateAccountDto, TransferDto } from '@app/common';
import { SERVICES, PATTERNS, AppError, AuditLoggerService, AppLogger, getErrorMessage, rpc, traceStorage } from '@app/common';
import { AccountsRepository } from './repositories/accounts.repository';

interface CrossRateResponse {
  rate: number;
}
interface RaterServiceClient {
  getCrossRate(data: { base: string; quote: string }): Observable<CrossRateResponse>;
}
@Injectable()
export class AccountsService implements OnModuleInit {

  private raterService!: RaterServiceClient; 
  private readonly auditLogger: AuditLoggerService;
  
  constructor(
    private readonly accountsRepo: AccountsRepository,
    private readonly logger: AppLogger,
    @Inject(SERVICES.AUTH) private readonly authClient: ClientProxy,
    @Inject(SERVICES.LOGGER) private readonly loggerClient: ClientProxy,
    @Inject('RATER_PACKAGE') private readonly client: ClientGrpc,
  ) {
    this.logger.setContext(AccountsService.name);
    this.auditLogger = new AuditLoggerService(SERVICES.ACCOUNTS, this.loggerClient);
  }
  
  onModuleInit() {
    this.raterService = this.client.getService<RaterServiceClient>('RaterService');
  }

  async createAccount(data: CreateAccountDto) {
    try {
      await this.accountsRepo.createWithTransaction(data);
      this.logger.log(`✅ Account created for user ${data.user_id} with currency ${data.currency}`);
      this.auditLogger.log('ACCOUNT_CREATED', data, data.user_id);

      return { status: 'success' };
    } catch (error) {
      const errorMessage = getErrorMessage (error);
      this.logger.error(`❌ SAGA Triggered, Accounts failed ${errorMessage}`);
      this.auditLogger.log('NEW_ACCOUNT_FAILED', data, data.user_id);
      rpc.emit(this.authClient, PATTERNS.ACCOUNT.CREATE_FAILED, {
        userId: data.user_id,
        reason: errorMessage
      });
      throw error;
    }
  }

  async getAccounts(user_id: number) {
    return this.accountsRepo.findByUserId(user_id);
  }
  
  async transferMoney(fromUserId: number, data: TransferDto) {
    let { fromAccountId, toAccountId, amount, currency } = data;
    const traceId = traceStorage.getStore()?.traceId || null;
    try {
      if (amount <= 0) {
        throw new AppError('The amount must be greater than zero', 400, 'INVALID_AMOUNT');
      }
      if (fromAccountId === toAccountId) {
        throw new AppError('Cannot transfer to the same account', 400, 'SAME_ACCOUNT');
      }
      const transfer = await this.accountsRepo.transferMoney(fromUserId, data, traceId);
      
      this.auditLogger.log('TRANSFER_COMPLETED', { from: fromAccountId, to: toAccountId, amount, currency }, fromUserId);

      this.logger.log(`✅ Transfer completed: ${fromAccountId} -> ${toAccountId} : ${amount} ${currency}`);
      return { status: 'success', transfer };
    
    } catch (rawError) {
      const error = rawError instanceof Error ? rawError : new Error(String(rawError));
      this.auditLogger.log('TRANSFER_FAILED', { from: fromAccountId, to: toAccountId, amount, currency, message: error.message }, fromUserId);
      throw error;
    }
  }

  async getRateFromRater(base: string, quote: string): Promise<number> {
    try {
      // response автоматично має тип CrossRateResponse
      const response = await firstValueFrom(
        this.raterService.getCrossRate({ base, quote })
      );
      return response.rate;
    } catch (error: any) {
      // Якщо rater впав або валюти немає, gRPC кине помилку сюди
      throw new Error(`gRPC rate fetch failed: ${error.message}`);
    }
  }
}
