export const MAX_CART_LINES = 30;
export const MAX_CART_QUANTITY = 20;

export type CartIdentityInput = {
  productId: string;
  variantId?: string | null;
  customizationReference?: string | null;
};

export function getCartLineId({ productId, variantId, customizationReference }: CartIdentityInput) {
  return [productId, variantId || "base", customizationReference || "none"]
    .map((part) => encodeURIComponent(part))
    .join("::");
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export type CartValidationItem = {
  lineId?: string;
  productId: string;
  variantId?: string;
  customizationReference?: string;
  quantity: number;
  color?: string;
  size?: string;
};

export function parseCartValidationPayload(input: unknown): { items: CartValidationItem[] } | { error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Cart validation payload is invalid." };
  const body = input as Record<string, unknown>;
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_CART_LINES) return { error: "Cart must contain between 1 and 30 lines." };

  const items: CartValidationItem[] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "A cart line is invalid." };
    const item = raw as Record<string, unknown>;
    const allowed = new Set(["lineId", "productId", "variantId", "customizationReference", "quantity", "color", "size"]);
    if (Object.keys(item).some((key) => !allowed.has(key))) return { error: "Cart lines contain unsupported fields." };
    if (!isUuid(item.productId) || (item.variantId !== undefined && !isUuid(item.variantId))) return { error: "A product or variant identifier is invalid." };
    if (!Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > MAX_CART_QUANTITY) return { error: "Cart quantities must be whole numbers from 1 to 20." };
    for (const field of ["lineId", "customizationReference", "color", "size"]) {
      if (item[field] !== undefined && (typeof item[field] !== "string" || item[field].length > 500)) return { error: "A cart line contains invalid text." };
    }
    items.push({
      lineId: item.lineId as string | undefined,
      productId: item.productId as string,
      variantId: item.variantId as string | undefined,
      customizationReference: item.customizationReference as string | undefined,
      quantity: item.quantity as number,
      color: item.color as string | undefined,
      size: item.size as string | undefined,
    });
  }
  return { items };
}
