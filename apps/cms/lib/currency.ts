export type CurrencyCode = "INR" | "USD";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  countryCode: string;
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", countryCode: "us", flag: "🇺🇸" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", countryCode: "in", flag: "🇮🇳" },
};

export const STORE_CURRENCY = "INR" as const;
export const STORE_CURRENCY_LOCALE = "en-IN" as const;

export function isCurrencyCode(code: unknown): code is CurrencyCode {
  return code === "INR" || code === "USD";
}

export function storeCurrency(code: unknown): CurrencyCode {
  return isCurrencyCode(code) ? code : STORE_CURRENCY;
}

export const currencyOptions = [CURRENCIES.INR, CURRENCIES.USD].map(({ code, name, symbol }) => ({
  value: code,
  label: `${name} (${code} ${symbol})`,
}));

/** Historical order rows keep their recorded currency for accounting accuracy. */
export function normalizeRecordedCurrency(currency?: string | null): string {
  const code = currency?.trim().toUpperCase();
  return code && /^[A-Z]{3}$/.test(code) ? code : STORE_CURRENCY;
}

/** Format a recorded amount without silently converting its accounting value. */
export function formatRecordedMoney(amount: number, currency?: string | null): string {
  return new Intl.NumberFormat(currency?.toUpperCase() === "USD" ? "en-US" : STORE_CURRENCY_LOCALE, {
    style: "currency",
    currency: normalizeRecordedCurrency(currency),
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatStoreMoney(amount: number): string {
  return formatRecordedMoney(amount, STORE_CURRENCY);
}

export function formatCurrency(amount: number, currencyCode: CurrencyCode = STORE_CURRENCY): string {
  return formatRecordedMoney(amount, currencyCode);
}
