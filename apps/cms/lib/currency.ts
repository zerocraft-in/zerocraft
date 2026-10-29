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

export const STORE_CURRENCY = "INR" as const;
export const STORE_CURRENCY_LOCALE = "en-IN" as const;

export function normalizeRecordedCurrency(currency?: string | null): CurrencyCode {
  const code = currency?.trim().toUpperCase();
  return code === "USD" || code === "EUR" || code === "INR" ? code : STORE_CURRENCY;
}

/** Format a recorded amount without silently converting its accounting value. */
export function formatRecordedMoney(amount: number, currency?: string | null): string {
  return new Intl.NumberFormat(STORE_CURRENCY_LOCALE, {
    style: "currency",
    currency: normalizeRecordedCurrency(currency),
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatStoreMoney(amount: number): string {
  return formatRecordedMoney(amount, STORE_CURRENCY);
}

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
