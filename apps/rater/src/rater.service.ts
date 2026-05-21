// apps/rater/src/rater.service.ts
import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExchangeRateApiStrategy } from './strategies/exchange-rate-api.strategy';
import { FrankfurterApiStrategy } from './strategies/frankfurter.strategy';

@Injectable()
export class RaterService implements OnModuleInit {
  private readonly logger = new Logger(RaterService.name);
  private readonly providers: any[];
  private currentProviderName = 'None';

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: any,
    private readonly primaryProvider: ExchangeRateApiStrategy,
    private readonly fallbackProvider: FrankfurterApiStrategy,
  ) {
    // Реєструємо масив стратегій у порядку пріоритету
    this.providers = [this.primaryProvider, this.fallbackProvider];
  }

  async onModuleInit() {
    this.logger.log('🚀 Rater Microservice initializing...');
    // Запускаємо асинхронну перевірку окремо, щоб не блокувати старт самого NestJS додатка
    this.bootstrapCache();
  }

  /**
   * Метод ініціалізації кешу при старті (просто обгортка для читабельності)
   */
  async bootstrapCache() {
    this.logger.log('🔄 Starting exchange rates synchronization on startup...');
    try {
      await this.syncRates();
    } catch (error) {
      this.logger.error('🚨 Initial startup sync failed completely.');
    }
  }

  /**
   * Головний уніфікований метод оновлення даних.
   * Проходить по черзі провайдерів, поки один із них не віддасть актуальні курси.
   */
  async syncRates(): Promise<Record<string, string>> {
    for (const provider of this.providers) {
      try {
        this.logger.log(`Trying to fetch rates via [${provider.name}]...`);
        const rates = await provider.fetchRates();

        if (rates && Object.keys(rates).length > 0) {
          // Зберігаємо в Redis
          await this.redis.hset('rates', rates);

          // Запам'ятовуємо успішного провайдера
          this.currentProviderName = provider.name;

          this.logger.log(`✅ Rates successfully updated in Redis using [${provider.name}].`);
          return rates; // Успіх! Повертаємо дані та виходимо
        }
      } catch (error: any) {
        this.logger.warn(`❌ Provider [${provider.name}] failed: ${error.message}. Trying next one...`);
      }
    }

    // Якщо цикл закінчився, а return не спрацював — значить, лягли всі провайдери
    this.logger.error('🚨 CRITICAL: All rate providers failed! Redis cache is stale.');
    throw new Error('All exchange rate providers are currently unavailable');
  }

  /**
   * Крон, який тепер теж захищений фолбеком
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCronUpdate() {
    this.logger.log('⏰ Scheduled Cron triggered: Syncing exchange rates...');
    try {
      await this.syncRates();
    } catch {
      // Крон просто логує помилку, не ламаючи додаток
      this.logger.error('⏰ Scheduled Cron sync failed completely, will retry next hour.');
    }
  }

  /**
   * Чистий метод для майбутнього сервісу конвертації
   */
  async getLiveRates(): Promise<Record<string, string>> {
    return this.redis.hgetall('rates');
  }

  /**
   * Повертає ім'я провайдера, який ОСТАННІМ успішно записав дані в Redis
   */
  getCurrentProvider(): string {
    return this.currentProviderName;
  }
}