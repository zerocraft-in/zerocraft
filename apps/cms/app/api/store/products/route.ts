import { requireCommercePermission, getCommercePermissions } from "@/lib/commerce-auth";
import { isSameOrigin } from "@/lib/request-origin";
import { isCurrencyCode } from "@/lib/currency";
import { revalidatePath } from "next/cache";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const fail = (error: string, status = 400) => Response.json({ error }, { status, headers });

export async function GET(request: Request) {
  const access = await requireCommercePermission("catalog.read");
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") || 30);
  const currency = url.searchParams.get("currency") || "INR";
  if (![1, 7, 30].includes(days) || !isCurrencyCode(currency)) return fail("Invalid analytics period or currency.");
  const { supabase } = access;
  const permissions = await getCommercePermissions(access);
  const [categories, collections, analytics] = await Promise.all([
    supabase.from("categories").select("id,name").is("deleted_at", null).order("name"),
    supabase.from("collections").select("id,name,status").order("name"),
    permissions.includes("orders.read") ? supabase.rpc("product_inventory_analytics", { p_days: days, p_currency: currency }) : Promise.resolve({ data: null, error: null }),
  ]);
  if (categories.error || collections.error) return fail("Product filters could not be loaded.", 503);
  const products: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 500) {
    const batch = await supabase.from("products").select("*,variants(*,inventory_levels(on_hand,reserved)),collection_products(collection_id)").is("deleted_at", null).order("title").order("id").range(offset, offset + 499);
    if (batch.error) return fail("Product management schema could not be loaded. Apply the catalog management migration.", 503);
    products.push(...batch.data);
    if (batch.data.length < 500) break;
  }
  return Response.json({ products, categories: categories.data, collections: collections.data, canManage: permissions.includes("catalog.manage"), analytics: analytics.error ? null : analytics.data, analyticsError: analytics.error ? "Analytics could not be loaded." : !permissions.includes("orders.read") ? "Order access is required to view sales analytics." : null }, { headers });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return fail("Invalid request origin.", 403);
  const access = await requireCommercePermission("catalog.manage");
  if (!access.ok) return access.response;
  let body;
  try { body = await request.json(); } catch { return fail("Invalid request body."); }
  const actions = ["status", "delete", "unlist", "list", "add_tags", "remove_tags", "include_channels", "exclude_channels", "include_catalogs", "exclude_catalogs", "add_collections", "remove_collections", "edit"];
  if (!body || typeof body !== "object" || !actions.includes(body.action) || !Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 500 || new Set(body.ids).size !== body.ids.length || body.ids.some((id: unknown) => typeof id !== "string" || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) || (body.values !== undefined && (!Array.isArray(body.values) || body.values.some((value: unknown) => typeof value !== "string")))) return fail("Choose a valid action and 1–500 products.");
  const { data, error } = await access.supabase.rpc("manage_product_selection", { p_ids: body.ids, p_action: body.action, p_values: body.values || [], p_edits: body.edits || [] });
  if (error) return fail(error.code === "P0001" ? error.message : error.code === "42501" ? "You cannot update these products." : "Products could not be updated. Reload and retry.", error.code === "42501" ? 403 : 400);
  revalidatePath("/store", "layout");
  revalidatePath("/api/store/catalog");
  return Response.json({ updated: data }, { headers });
}
