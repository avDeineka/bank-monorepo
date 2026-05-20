// apps/rater/src/strategies/rate-provider.interface.ts
export interface IRateProvider {
  /**
   * Повертає курси валют відносно базової валюти (наприклад, USD).
   * Очікуваний результат: { EUR: 0.92, GBP: 0.78, CHF: 0.88, USD: 1 }
   */
  fetchRates(): Promise<Record<string, number>>;
}