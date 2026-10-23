import { MAX_CART_LINES, MAX_CART_QUANTITY, isUuid } from "./cart";

export const CHECKOUT_IDEMPOTENCY_KEY_MAX = 128;
export const CHECKOUT_BODY_MAX_BYTES = 32_000;

export interface CheckoutAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface CheckoutLineRequest {
  productId: string;
  variantId?: string;
  quantity: number;
  customizationReference?: string;
  color?: string;
  size?: string;
}

export interface CheckoutRequest {
  idempotencyKey: string;
  items: CheckoutLineRequest[];
  address: CheckoutAddress;
  delivery: "standard" | "express" | "overnight";
  paymentMethod: "cod" | "upi_qr" | "bank_transfer";
}

const ADDRESS_FIELDS = ["fullName", "street", "city", "state", "postalCode", "country", "phone"] as const;
const LINE_FIELDS = ["productId", "variantId", "quantity", "customizationReference", "color", "size"] as const;
const REQUEST_FIELDS = ["idempotencyKey", "items", "address", "delivery", "paymentMethod"] as const;

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseCheckoutRequest(value: unknown): { ok: true; data: CheckoutRequest } | { ok: false; error: string } {
  if (!isPlainObject(value) || !hasOnlyKeys(value, REQUEST_FIELDS)) return { ok: false, error: "Invalid checkout request." };
  if (!boundedText(value.idempotencyKey, CHECKOUT_IDEMPOTENCY_KEY_MAX) || !/^[A-Za-z0-9._:-]+$/.test(value.idempotencyKey.trim())) {
    return { ok: false, error: "Invalid checkout idempotency key." };
  }
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > MAX_CART_LINES) return { ok: false, error: "Add at least one valid cart line." };
  if (!isPlainObject(value.address) || !hasOnlyKeys(value.address, ADDRESS_FIELDS)) return { ok: false, error: "Complete the delivery address." };
  const address = value.address as Record<string, unknown>;
  for (const field of ADDRESS_FIELDS) {
    if (!boundedText(address[field], field === "phone" ? 40 : 160)) return { ok: false, error: "Complete the delivery address." };
  }
  if (!String(address.country).trim().match(/^[A-Za-z]{2,3}$/)) return { ok: false, error: "Use a valid delivery country." };
  if (!(["standard", "express", "overnight"] as const).includes(value.delivery as CheckoutRequest["delivery"])) return { ok: false, error: "Choose a supported delivery method." };
  if (!( ["cod", "upi_qr", "bank_transfer"] as const).includes(value.paymentMethod as CheckoutRequest["paymentMethod"])) return { ok: false, error: "The selected payment method is not supported." };

  const items: CheckoutLineRequest[] = [];
  for (const raw of value.items) {
    if (!isPlainObject(raw) || !hasOnlyKeys(raw, LINE_FIELDS) || !isUuid(raw.productId)) return { ok: false, error: "A cart line is invalid." };
    const line = raw as Record<string, unknown>;
    if (line.variantId !== undefined && !isUuid(line.variantId)) return { ok: false, error: "A cart variant is invalid." };
    if (!Number.isInteger(line.quantity) || Number(line.quantity) < 1 || Number(line.quantity) > MAX_CART_QUANTITY) return { ok: false, error: "A cart quantity is invalid." };
    for (const field of ["customizationReference", "color", "size"] as const) {
      if (line[field] !== undefined && line[field] !== "" && !boundedText(line[field], field === "customizationReference" ? 300 : 120)) return { ok: false, error: "A cart option is invalid." };
    }
    items.push({
      productId: String(line.productId),
      ...(line.variantId ? { variantId: String(line.variantId) } : {}),
      quantity: Number(line.quantity),
      ...(line.customizationReference ? { customizationReference: String(line.customizationReference).trim() } : {}),
      ...(line.color ? { color: String(line.color).trim() } : {}),
      ...(line.size ? { size: String(line.size).trim() } : {}),
    });
  }
  return {
    ok: true,
    data: {
      idempotencyKey: value.idempotencyKey.trim(),
      items,
      address: Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, String(address[field]).trim()])) as unknown as CheckoutAddress,
      delivery: value.delivery as CheckoutRequest["delivery"],
      paymentMethod: value.paymentMethod as CheckoutRequest["paymentMethod"],
    },
  };
}

export function canonicalCheckoutPayload(request: CheckoutRequest) {
  return JSON.stringify({
    items: request.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: item.quantity,
      customizationReference: item.customizationReference ?? null,
      color: item.color ?? null,
      size: item.size ?? null,
    })),
    address: request.address,
    delivery: request.delivery,
    paymentMethod: request.paymentMethod,
  });
}
