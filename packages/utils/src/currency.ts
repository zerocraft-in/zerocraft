import { CURRENCY, CURRENCY_SYMBOL, DEFAULT_LOCALE } from "./constants";

export function formatInr(amount: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: CURRENCY,
    ...options,
  }).format(amount);
}

export function formatInrRaw(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString(DEFAULT_LOCALE)}`;
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
