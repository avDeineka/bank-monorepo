// apps/rater/src/rater.service.ts
import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExchangeRateApiStrategy } from './strategies/exchange-rate-api.strategy';
import { FrankfurterApiStrategy } from './strategies/frankfurter.strategy';
import { IRateProvider } from './strategies/rate-provider.interface';

@Injectable()
export class RaterService implements OnModuleInit {
  private readonly logger = new Logger(RaterService.name);
  private readonly providers: IRateProvider[];
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
  async syncRates(): Promise<Record<string, number>> {
    for (const provider of this.providers) {
      try {
        this.logger.log(`Trying to fetch rates via [${provider.name}]...`);
        const rates = await provider.fetchRates();

        if (rates && Object.keys(rates).length > 0) {
          // Зберігаємо в Redis
          await this.redis.hset('rates', rates);
          // 🔥 Виставляємо час життя (TTL) для всього ключа 'rates' на 1 годину (3600 сек)
          await this.redis.expire('rates', 3600);

          // Запам'ятовуємо успішного провайдера
          this.currentProviderName = provider.name;

          this.logger.log(`✅ Rates successfully updated in Redis using [${provider.name}] (TTL: 1h).`);
          return rates;
        }
      } catch (error: any) {
        this.logger.warn(`❌ Provider [${provider.name}] failed: ${error.message}. Trying next one...`);
      }
    }
    throw new Error('All rate providers failed to sync.');
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
  async getRates(): Promise<Record<string, number>> {
    // 1. Пробуємо взяти курси з Redis
    const cachedRates = await this.redis.hgetall('rates');

    if (cachedRates && Object.keys(cachedRates).length > 0) {
      this.logger.log('🎯 Rates retrieved from Redis cache.');

      // Перетворюємо рядки з Redis назад у числа
      const parsedRates: Record<string, number> = {};
      for (const [key, value] of Object.entries(cachedRates)) {
        parsedRates[key] = parseFloat(value as string);
      }
      return parsedRates;
    }

    // 2. Якщо в Redis порожньо — запускаємо наш syncRates (який смикає провайдерів)
    this.logger.warn('⚠️ Redis cache is empty! Fetching live rates from providers...');
    return await this.syncRates();
  }

  /**
   * Повертає ім'я провайдера, який ОСТАННІМ успішно записав дані в Redis
   */
  getCurrentProvider(): string {
    return this.currentProviderName;
  }

  async calculateCrossRate(base: string, quote: string): Promise<number> {
    const rates = await this.getRates(); // Отримуємо Record<string, string> з Redis

    if (!rates || Object.keys(rates).length === 0) {
      throw new Error('Exchange rates cache is empty or unavailable');
    }

    // Переводимо в UpperCase про всяк випадок, бо юзери або сервіси можуть прислати "eur" замість "EUR"
    const baseAsset = base.toUpperCase();
    const quoteAsset = quote.toUpperCase();

    const baseRate = rates[baseAsset];
    const quoteRate = rates[quoteAsset];

    if (!baseRate || !quoteRate) {
      throw new Error(`Rate not found for one of the currencies: ${baseAsset} or ${quoteAsset}`);
    }

    // Якщо база і котирування однакові (наприклад, USD до USD), крос-курс завжди 1
    if (baseAsset === quoteAsset) return 1.0;

    // Математика крос-курсу через якірну валюту Redis (наприклад, USD)
    // Формула: (Курс Анкор->Quote) / (Курс Анкор->Base)
    const crossRate = quoteRate / baseRate;

    // Округляємо до 6 знаків (стандарт для форекс-котирувань)
    return parseFloat(crossRate.toFixed(6));
  }
}