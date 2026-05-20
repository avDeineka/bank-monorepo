// apps/rater/src/rater.service.ts
import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RaterService implements OnModuleInit {
  private readonly logger = new Logger(RaterService.name);

  // Конструктор залишається твоїм (Redis, ProviderStrategy тощо)
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: any,
    @Inject('PROVIDER_STRATEGY') private readonly providerStrategy: any
  ) { }

  async onModuleInit() {
    this.logger.log('🚀 Rater Microservice initializing...');
    // Запускаємо асинхронну перевірку окремо, щоб не блокувати старт самого NestJS додатка
    this.bootstrapCache();
  }

  /**
   * Горда авто-ініціалізація при старті
   */
  private async bootstrapCache() {
    const maxAttempts = 5;
    let delay = 2000; // 2 секунди

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 1. Перевіряємо, чи є взагалі дані в Redis
        const cachedRates = await this.redis.hgetall('rates');

        if (!cachedRates || Object.keys(cachedRates).length === 0) {
          this.logger.warn('⚠️ Cache is completely empty. Fetching initial rates right now...');
          await this.syncRates();
        } else {
          this.logger.log('✅ Cache already contains data. Sitting back and waiting for the Cron schedule.');
        }

        // Якщо все пройшло успішно — виходимо з циклу ретраїв
        return;

      } catch (error: any) {
        this.logger.error(
          `❌ Connection to Redis failed (Attempt ${attempt}/${maxAttempts}): ${error.message}`
        );

        if (attempt === maxAttempts) {
          this.logger.error('💥 Critical: Could not initialize Rater cache after maximum retries.');
          return;
        }

        // Чекаємо перед наступною спробою, даючи Redis час піднятися
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5; // Експоненційне збільшення затримки
      }
    }
  }

  /**
   * Ізольований метод синхронізації
   */
  async syncRates() {
    try {
      const rates = await this.providerStrategy.fetchRates();
      await this.redis.hset('rates', rates);
      this.logger.log('♻️ Rates successfully updated in Redis.');
      return rates;
    } catch (error: any) {
      this.logger.error(`❌ External API sync failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Оновлення суто за розкладом
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCronUpdate() {
    this.logger.log('⏰ Scheduled Cron triggered: Syncing exchange rates...');
    try {
      await this.syncRates();
    } catch {
      // Крон просто логує помилку, не ламаючи додаток
      this.logger.error('⏰ Scheduled Cron sync failed, will retry next hour.');
    }
  }

  /**
   * Чистий метод для майбутнього сервісу конвертації
   */
  async getLiveRates(): Promise<Record<string, string>> {
    return this.redis.hgetall('rates');
  }
}