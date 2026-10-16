import { normalizeCurrencyCode } from "./money";

export function formatCatalogPrice(amount: number, currency?: string | null) {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  if (normalizedCurrency == null || !Number.isFinite(amount)) return "Price unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCatalogPaise(amountPaise: number | string | null | undefined, currency?: string | null) {
  const amount = typeof amountPaise === "number" ? amountPaise : Number(amountPaise);
  if (!Number.isInteger(amount)) return "Price unavailable";
  return formatCatalogPrice(amount / 100, currency);
}
