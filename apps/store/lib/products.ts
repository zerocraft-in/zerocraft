/** Store-wide configuration. Catalog records are loaded from Supabase. */
export const FREE_SHIP = 999;
export const SHIP_FEE = 79;
export const COUPON = "FIRSTSHOW10";

export function formatMoney(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** @deprecated Prefer formatMoney when the product currency is available. */
export const inr = (amount: number) => formatMoney(amount, "INR");
