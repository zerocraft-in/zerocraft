import { getRequestStoreConfig } from "@zerocraft/supabase/store-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isSameOrigin } from "@/lib/request-origin";
import { createClient } from "@zerocraft/supabase/server";
import { isCustomerCustomizationPath } from "@/lib/storage/server";
import { parseCartValidationPayload } from "@/lib/commerce/cart";
import {
  validateCartLine,
  type ValidationProduct,
} from "@/lib/commerce/cart-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json({ error: "Send JSON." }, { status: 415 });
  if (Number(request.headers.get("content-length") || 0) > 20_000)
    return Response.json({ error: "Cart is too large." }, { status: 413 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid cart data." }, { status: 400 });
  }
  const parsed = parseCartValidationPayload(payload);
  if ("error" in parsed)
    return Response.json({ error: parsed.error }, { status: 400 });

  const { url: supabaseUrl, serviceKey } = await getRequestStoreConfig();
  if (!supabaseUrl || !serviceKey)
    return Response.json(
      { error: "Cart validation is not configured." },
      { status: 503 },
    );
  const supabase = createServiceClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const productIds = [...new Set(parsed.items.map((item) => item.productId))];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select(
      "id,title,status,product_type,price,price_paise,currency,currency_code,stock,image_url,variants(id,label,sku,options,price,price_paise,currency_code,stock,is_active)",
    )
    .in("id", productIds);
  if (productError)
    return Response.json(
      { error: "The catalog could not be checked." },
      { status: 503 },
    );

  const productById = new Map(
    ((products ?? []) as ValidationProduct[]).map((product) => [
      product.id,
      product,
    ]),
  );
  const variantIds = [
    ...new Set(
      parsed.items
        .map((item) => item.variantId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const inventory = new Map<string, number>();
  if (variantIds.length) {
    const { data: levels, error: inventoryError } = await supabase
      .from("inventory_levels")
      .select("variant_id,on_hand,reserved")
      .in("variant_id", variantIds);
    if (inventoryError)
      return Response.json(
        { error: "Inventory availability could not be checked." },
        { status: 503 },
      );
    for (const level of levels ?? [])
      inventory.set(
        level.variant_id,
        (inventory.get(level.variant_id) ?? 0) +
          Math.max(0, Number(level.on_hand) - Number(level.reserved)),
      );
  }

  let userId: string | null = null;
  if (parsed.items.some((item) => item.customizationReference)) {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  }

  const lines = parsed.items.map((item) => {
    const line = validateCartLine(
      item,
      productById.get(item.productId),
      inventory,
    );
    if (item.customizationReference) {
      if (
        !userId ||
        !isCustomerCustomizationPath(item.customizationReference, userId)
      ) {
        line.status = "invalid";
        line.errors.push({
          code: "CUSTOMIZATION_OWNERSHIP",
          message: "This customization must belong to the signed-in customer.",
        });
      } else {
        line.warnings.push({
          code: "CUSTOMIZATION_EXISTENCE_PENDING",
          message:
            "The customization reference will be checked again before checkout.",
        });
      }
    }
    return line;
  });

  const currencies = [
    ...new Set(
      lines
        .map((line) => line.currency)
        .filter((currency): currency is string => Boolean(currency)),
    ),
  ];
  if (currencies.length > 1) {
    for (const line of lines) {
      if (!line.errors.some((error) => error.code === "MIXED_CURRENCY"))
        line.errors.push({
          code: "MIXED_CURRENCY",
          message: "Checkout cannot combine products in different currencies.",
        });
      line.status = "invalid";
    }
  }
  const valid =
    lines.length > 0 &&
    lines.every((line) => line.status === "valid") &&
    currencies.length === 1;
  const currency = currencies.length === 1 ? currencies[0] : null;
  const subtotalPaise =
    valid && currency === "INR"
      ? lines.reduce((sum, line) => sum + (line.lineTotalPaise ?? 0), 0)
      : null;
  const subtotal = valid
    ? lines.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0)
    : null;
  return Response.json(
    {
      valid,
      currency,
      subtotal: subtotal == null ? null : Math.round(subtotal * 100) / 100,
      subtotalPaise,
      lines,
      errors:
        currencies.length > 1
          ? [
              {
                code: "MIXED_CURRENCY",
                message:
                  "Checkout cannot combine products in different currencies.",
              },
            ]
          : [],
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
