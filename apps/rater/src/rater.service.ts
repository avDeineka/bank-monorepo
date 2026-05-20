// apps/rater/src/rater.service.ts
import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { Redis } from 'ioredis';
import { IRateProvider } from './strategies/rate-provider.interface';
import { ExchangeRateApiStrategy } from './strategies/exchange-rate-api.strategy';

@Injectable()
export class RaterService implements OnModuleInit {
  private readonly logger = new Logger(RaterService.name);
  private providerStrategy: IRateProvider;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly httpService: HttpService,
  ) {
    // Ініціалізуємо поточну стратегію. 
    // Потім сюди можна додати фабрику, яка читатиме з config/env типу PROVIDER=MONO
    this.providerStrategy = new ExchangeRateApiStrategy(this.httpService);
  }

  // Стягуємо курси відразу при запуск мікросервісу, щоб не чекати першого крону
  async onModuleInit() {
    this.logger.log('🚀 RaterService initialized. Running initial rates sync...');
    await this.syncRates();
  }

  // Крон працює кожну годину. Для тестів можна поставити CronExpression.EVERY_MINUTE
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('⏰ Scheduled rates sync triggered...');
    await this.syncRates();
  }

  private async syncRates() {
    try {
      const rates = await this.providerStrategy.fetchRates();
      
      // Записуємо в Redis у Хеш-таблицю з ключем "rates"
      // Записує пари: rates -> { "USD": "1", "EUR": "0.915", ... }
      await this.redis.hset('rates', rates);
      
      this.logger.log(`✅ Rates successfully synced to Redis: ${JSON.stringify(rates)}`);
    } catch (error: any) {
      this.logger.error(`❌ Rates sync failed: ${error.message}`);
    }
  }

  // Метод для читання конкретного курсу (знадобиться для RPC контролера)
  async getRate(currency: string): Promise<number | null> {
    const rate = await this.redis.hget('rates', currency);
    return rate ? parseFloat(rate) : null;
  }
}
