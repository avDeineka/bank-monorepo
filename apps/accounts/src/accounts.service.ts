// accounts/src/accounts.service.ts
import { Injectable, Inject, OnModuleInit, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { ClientGrpc } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
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
    @Inject(SERVICES.RATER) private readonly client: ClientGrpc,
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
    const { fromAccountId, toAccountId, amount } = data;
    const traceId = traceStorage.getStore()?.traceId || null;

    try {
      if (amount <= 0) {
        throw new AppError('The amount must be greater than zero', 400, 'INVALID_AMOUNT');
      }
      if (fromAccountId === toAccountId) {
        throw new AppError('Cannot transfer to the same account', 400, 'SAME_ACCOUNT');
      }

      // Швидкий перевірочний запит метаданих валют
      const [senderMeta, recipientMeta] = await Promise.all([
        this.accountsRepo.findById(fromAccountId),
        this.accountsRepo.findById(toAccountId),
      ]);

      if (!senderMeta || !recipientMeta) {
        throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
      }

      let rate = 1;
      if (senderMeta.currency !== recipientMeta.currency) {
        rate = await this.getRateFromRater(senderMeta.currency, recipientMeta.currency);
      }

      // Виконуємо єдину транзакцію в репозиторії
      const transfer = await this.accountsRepo.executeTransfer(fromUserId, data, rate, traceId);

      this.auditLogger.log('TRANSFER_COMPLETED', {
        from: fromAccountId,
        to: toAccountId,
        amount,
        currency: senderMeta.currency,
        rate
      }, fromUserId);

      this.logger.log(`✅ Transfer completed: ${fromAccountId} -> ${toAccountId} : ${amount} ${senderMeta.currency} (Rate: ${rate})`);

      return {
        status: 'success',
        transfer: {
          ...transfer,
          rate: Number(transfer.rate) // приводимо "1.161036" з бази назад до number для клієнта
        }
      };
    } catch (rawError) {
      const error = rawError instanceof Error ? rawError : new Error(String(rawError));
      this.auditLogger.log('TRANSFER_FAILED', { from: fromAccountId, to: toAccountId, amount, message: error.message }, fromUserId);
      throw error;
    }
  }

  async getTransfers (user_id: number, accountId: number) {
    const account = await this.accountsRepo.getAccountOwner(accountId);
    if (!account) {
      throw new RpcException({
        code: 'ACCOUNT_NOT_FOUND',
        message: `Account #${accountId} not found`,
        status: 'error',
        statusCode: 404,
      });

      // throw new NotFoundException(`Account #${accountId} not found`);
    }
    if (account.user_id !== user_id) {
      throw new RpcException({
        code: 'FORBIDDEN',
        message: `No permission to access account #${accountId}`,
        status: 'error',
        statusCode: 403,
      });
    }
    const transfers = await this.accountsRepo.getTransfers(user_id, accountId);
    return { success: true, data: transfers};
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
