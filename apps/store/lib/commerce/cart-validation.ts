import { resolveCatalogMoney, resolveCurrencyCode } from "./money";
import { getVariantOption, normalizeVariantOptions } from "./variant-options";
import type { CartValidationItem } from "./cart";

export type ValidationError = { code: string; message: string };
export type ValidatedCartLine = CartValidationItem & {
  status: "valid" | "invalid";
  title: string | null;
  sku: string | null;
  variantLabel: string | null;
  currency: string | null;
  unitPrice: number | null;
  unitPricePaise: number | null;
  lineTotal: number | null;
  lineTotalPaise: number | null;
  availableQuantity: number | null;
  errors: ValidationError[];
  warnings: ValidationError[];
};

export type CartValidationResponse = {
  valid: boolean;
  currency: string | null;
  subtotal: number | null;
  subtotalPaise: number | null;
  lines: ValidatedCartLine[];
  errors: ValidationError[];
};

export type ValidationProduct = {
  id: string;
  title: string;
  status: string;
  product_type: "physical" | "digital" | string;
  price: number | string | null;
  price_paise: number | string | null;
  currency: string | null;
  currency_code: string | null;
  stock: number | null;
  image_url: string | null;
  variants?: ValidationVariant[];
};

export type ValidationVariant = {
  id: string;
  label: string;
  sku: string;
  options: Record<string, string> | null;
  price: number | string | null;
  price_paise: number | string | null;
  currency_code: string | null;
  stock: number | null;
  is_active: boolean;
};

export function validateCartLine(item: CartValidationItem, product: ValidationProduct | undefined, inventory: Map<string, number>): ValidatedCartLine {
  const result: ValidatedCartLine = {
    ...item,
    status: "invalid",
    title: product?.title ?? null,
    sku: null,
    variantLabel: null,
    currency: null,
    unitPrice: null,
    unitPricePaise: null,
    lineTotal: null,
    lineTotalPaise: null,
    availableQuantity: null,
    errors: [],
    warnings: [],
  };
  if (!product) {
    result.errors.push({ code: "PRODUCT_NOT_FOUND", message: "This product is no longer available." });
    return result;
  }
  if (product.status !== "active") {
    result.errors.push({ code: "PRODUCT_UNAVAILABLE", message: "This product is no longer published." });
    return result;
  }

  const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active);
  const variant = item.variantId
    ? activeVariants.find((candidate) => candidate.id === item.variantId)
    : activeVariants.length === 1 ? activeVariants[0] : undefined;
  if (item.variantId && !variant) {
    result.errors.push({ code: "VARIANT_INVALID", message: "The selected variant is no longer available." });
    return result;
  }
  if (activeVariants.length > 1 && !variant) {
    result.errors.push({ code: "VARIANT_REQUIRED", message: "Choose a valid product variant." });
    return result;
  }

  const source = variant ?? product;
  result.sku = variant?.sku ?? null;
  result.variantLabel = variant?.label ?? null;
  const currency = resolveCurrencyCode(variant?.currency_code, product.currency_code, product.currency);
  try {
    const money = resolveCatalogMoney({ currency, price: source.price, pricePaise: source.price_paise });
    result.currency = money.currency;
    result.unitPrice = money.amount;
    result.unitPricePaise = money.amountPaise;
    result.lineTotal = money.amount * item.quantity;
    result.lineTotalPaise = money.amountPaise == null ? null : money.amountPaise * item.quantity;
  } catch {
    result.errors.push({ code: "PRICE_INVALID", message: "The current price for this item is unavailable." });
    return result;
  }

  const options = normalizeVariantOptions(variant?.options);
  if (item.color && getVariantOption(options, "color") !== item.color) result.errors.push({ code: "OPTION_INVALID", message: "The selected color is no longer available." });
  if (item.size && getVariantOption(options, "size") !== item.size) result.errors.push({ code: "OPTION_INVALID", message: "The selected size is no longer available." });

  if (product.product_type === "digital") {
    result.availableQuantity = null;
  } else {
    result.availableQuantity = variant && inventory.has(variant.id) ? inventory.get(variant.id)! : source.stock ?? product.stock;
    if (result.availableQuantity == null) result.errors.push({ code: "INVENTORY_UNAVAILABLE", message: "Availability for this item could not be confirmed." });
    else if (result.availableQuantity < item.quantity) result.errors.push({ code: "INSUFFICIENT_INVENTORY", message: `Only ${result.availableQuantity} item${result.availableQuantity === 1 ? "" : "s"} remain available.` });
  }

  result.status = result.errors.length ? "invalid" : "valid";
  return result;
}
