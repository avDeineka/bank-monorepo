// apps/rater/src/strategies/exchange-rate-api.strategy.ts
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CURRENCIES } from '@app/common';
import { IRateProvider } from './rate-provider.interface';

@Injectable()
export class ExchangeRateApiStrategy implements IRateProvider {
  private readonly logger = new Logger(ExchangeRateApiStrategy.name);
  private readonly targetCurrencies = CURRENCIES;

  constructor(private readonly httpService: HttpService) {}

  async fetchRates(): Promise<Record<string, number>> {
    const apiKey = process.env.EXCHANGE_API_KEY;
    if (!apiKey) {
      throw new Error('EXCHANGE_API_KEY is not defined in environment variables');
    }

    // Робимо USD базовою валютою для простоти розрахунків
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;

    try {
      const { data } = await firstValueFrom(this.httpService.get(url));
      if (data.result !== 'success') {
        throw new Error(`API returned error status: ${data.result}`);
      }
      const rates: Record<string, number> = {};
      // Фільтруємо лише ті валюти, які нам потрібні
      for (const currency of this.targetCurrencies) {
        if (data.conversion_rates[currency] !== undefined) {
          rates[currency] = data.conversion_rates[currency];
        } else {
          this.logger.warn(`Currency ${currency} missing in API response`);
        }
      }
      console.log('Rates:', rates);
      return rates;
    } catch (error: any) {
      this.logger.error(`Failed to fetch rates from ExchangeRate-API: ${error.message || error}`);
      throw error;
    }
  }
}
