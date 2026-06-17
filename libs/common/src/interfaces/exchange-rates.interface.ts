export interface ExchangeRateItem {
  currency: string;
  rate: number;
}

export interface ExchangeRatesResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}
