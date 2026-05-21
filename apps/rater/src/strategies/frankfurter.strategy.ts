// apps/rater/src/strategies/frankfurter.strategy.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { IRateProvider } from './rate-provider.interface';

@Injectable()
export class FrankfurterApiStrategy implements IRateProvider {
  readonly name = 'Frankfurter-API';

  constructor(private readonly httpService: HttpService) {}

  async fetchRates(): Promise<Record<string, number>> {
    // Безкоштовне API, не потребує ключів
    const { data } = await this.httpService.axiosRef.get('https://api.frankfurter.app/latest?from=USD');
    return data.rates;
  }
}