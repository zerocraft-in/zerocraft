import { createHash } from "node:crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/apps/studio/utils/supabase/server";
import { isCustomerCustomizationPath } from "@/lib/storage/server";
import { canonicalCheckoutPayload, type CheckoutRequest } from "./checkout";

export type CheckoutResult = {
  orderId: string;
  orderNumber: string;
  status: string;
  currency: string;
  total: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  items: unknown[];
  createdAt: string;
  replayed: boolean;
};

export class CheckoutError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

function transactionalCheckoutEnabled() {
  return process.env.ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED === "true";
}

async function verifyCustomizationReferences(supabase: Awaited<ReturnType<typeof createClient>>, request: CheckoutRequest, userId: string) {
  for (const item of request.items) {
    if (!item.customizationReference) continue;
    if (!isCustomerCustomizationPath(item.customizationReference, userId)) throw new CheckoutError("CUSTOMIZATION_OWNERSHIP", "A customization does not belong to this customer.");
    const { data: ownership, error: ownershipError } = await supabase
      .from("store_customizations")
      .select("id,product_id,status")
      .eq("object_path", item.customizationReference)
      .eq("customer_id", userId)
      .eq("product_id", item.productId)
      .eq("status", "ready")
      .maybeSingle();
    if (ownershipError || !ownership) throw new CheckoutError("CUSTOMIZATION_OWNERSHIP", "This customization is not registered for the selected product.");
    const slash = item.customizationReference.indexOf("/");
    const objectPath = item.customizationReference.slice(slash + 1);
    const { data, error } = await supabase.storage.from("customer-customizations").list(userId, { search: objectPath.split("/").at(-1), limit: 20 });
    if (error || !data?.some((entry) => entry.name === objectPath.split("/").at(-1))) throw new CheckoutError("CUSTOMIZATION_MISSING", "A customization file is no longer available.");
  }
}

export async function executeTransactionalCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
  if (!transactionalCheckoutEnabled()) throw new CheckoutError("CHECKOUT_PENDING_DEPLOYMENT", "Secure checkout is not enabled until its approved database migration is deployed.", 503);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new CheckoutError("UNAUTHORIZED", "Sign in before checkout.", 401);
  await verifyCustomizationReferences(supabase, request, user.id);
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceUrl || !serviceKey) throw new CheckoutError("CHECKOUT_UNAVAILABLE", "Secure checkout is temporarily unavailable.", 503);
  const serviceClient = createServiceClient(serviceUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const fingerprint = createHash("sha256").update(canonicalCheckoutPayload(request)).digest("hex");
  const { data, error } = await serviceClient.rpc("create_transactional_checkout", {
    p_customer_id: user.id,
    p_idempotency_key: request.idempotencyKey,
    p_request_fingerprint: fingerprint,
    p_checkout: { items: request.items, address: request.address, delivery: request.delivery, paymentMethod: request.paymentMethod },
  });
  if (error || !data || typeof data !== "object") {
    const message = error?.message ?? "Checkout could not be completed.";
    if (message.includes("IDEMPOTENCY_CONFLICT")) throw new CheckoutError("IDEMPOTENCY_CONFLICT", "This checkout key was already used for a different request.", 409);
    if (message.includes("OUT_OF_STOCK")) throw new CheckoutError("OUT_OF_STOCK", "One or more items are no longer available.", 409);
    if (message.includes("CHECKOUT_INVALID")) throw new CheckoutError("CHECKOUT_INVALID", "The checkout contents are no longer valid.", 400);
    throw new CheckoutError("CHECKOUT_UNAVAILABLE", "Secure checkout is temporarily unavailable.", 503);
  }
  const result = data as Record<string, unknown>;
  return {
    orderId: String(result.order_id),
    orderNumber: String(result.order_number),
    status: String(result.status),
    currency: String(result.currency),
    total: Number(result.total),
    subtotal: Number(result.subtotal),
    discount: Number(result.discount),
    shippingFee: Number(result.shipping_fee ?? result.shippingFee),
    tax: Number(result.tax),
    items: Array.isArray(result.items) ? result.items : [],
    createdAt: String(result.created_at),
    replayed: Boolean(result.replayed),
  };
}
