export type CatalogMoney = {
  currency: string;
  amount: number;
  amountPaise: number | null;
};

export function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

export function resolveCurrencyCode(...values: unknown[]) {
  for (const value of values) {
    const currency = normalizeCurrencyCode(value);
    if (currency) return currency;
  }
  return null;
}

function finiteNumber(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveCatalogMoney(input: {
  currency?: unknown;
  price?: unknown;
  pricePaise?: unknown;
}): CatalogMoney {
  const currency = normalizeCurrencyCode(input.currency);
  if (!currency) throw new Error("Catalog item is missing a valid currency.");

  if (currency === "INR") {
    const amountPaise = finiteNumber(input.pricePaise);
    if (amountPaise == null || !Number.isInteger(amountPaise) || amountPaise < 0) {
      throw new Error("INR catalog item is missing a valid paise amount.");
    }
    return { currency, amountPaise, amount: amountPaise / 100 };
  }

  const amount = finiteNumber(input.price);
  if (amount == null || amount < 0) throw new Error(`Catalog item has an invalid ${currency} amount.`);
  return { currency, amount, amountPaise: null };
}
