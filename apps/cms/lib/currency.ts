export type CurrencyCode = "USD" | "INR" | "EUR";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  countryCode: string;
  rateVsUSD: number;
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", countryCode: "us", rateVsUSD: 1.0, flag: "🇺🇸" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", countryCode: "in", rateVsUSD: 83.5, flag: "🇮🇳" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", countryCode: "eu", rateVsUSD: 0.92, flag: "🇪🇺" },
};

export function convertFromUSD(amountInUSD: number, targetCurrency: CurrencyCode = "USD"): number {
  const currency = CURRENCIES[targetCurrency] || CURRENCIES.USD;
  return amountInUSD * currency.rateVsUSD;
}

export function formatCurrency(amountInUSD: number, currencyCode: CurrencyCode = "USD"): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const converted = amountInUSD * currency.rateVsUSD;

  if (currencyCode === "INR") {
    return `${currency.symbol}${Math.round(converted).toLocaleString("en-IN")}`;
  }

  return `${currency.symbol}${Math.round(converted).toLocaleString()}`;
}
