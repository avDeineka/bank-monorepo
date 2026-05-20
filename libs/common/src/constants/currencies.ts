export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF' ] as const;

export type SupportedCurrency = (typeof CURRENCIES)[number];
