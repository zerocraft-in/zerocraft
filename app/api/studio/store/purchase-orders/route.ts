import { createClient } from "@/utils/supabase/server";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function studioClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, denied: jsonError("Studio access required.", 403) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!(["admin", "manager", "staff"] as string[]).includes(profile?.role || "")) return { supabase: null, denied: jsonError("Studio access required.", 403) };
  return { supabase, denied: null };
}

function orderNumber() {
  return `PO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function GET() {
  const { supabase, denied } = await studioClient();
  if (denied || !supabase) return denied;
  const [suppliers, locations, variants, orders] = await Promise.all([
    supabase.from("store_suppliers").select("id,name,email,phone,is_active").order("name"),
    supabase.from("store_inventory_locations").select("id,name,code,is_active").order("name"),
    supabase.from("store_product_variants").select("id,label,sku,product:store_products!inner(id,title,product_type)").eq("is_active", true).eq("store_products.product_type", "physical").order("sku"),
    supabase.from("store_purchase_orders").select("id,order_number,supplier_id,location_id,status,expected_at,notes,currency,created_at,updated_at,supplier:store_suppliers(id,name),location:store_inventory_locations(id,name,code),items:store_purchase_order_items(id,variant_id,quantity_ordered,quantity_received,unit_cost_paise,variant:store_product_variants(id,label,sku,product:store_products(id,title)))").order("created_at", { ascending: false }),
  ]);
  if (suppliers.error || locations.error || variants.error || orders.error) return jsonError("Purchase order tables are unavailable or access is denied.", 503);
  return Response.json({ suppliers: suppliers.data || [], locations: locations.data || [], variants: variants.data || [], orders: orders.data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const { supabase, denied } = await studioClient();
  if (denied || !supabase) return denied;
  let body: { entity?: unknown; name?: unknown; email?: unknown; phone?: unknown; supplierId?: unknown; locationId?: unknown; expectedAt?: unknown; notes?: unknown; items?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid purchase order request."); }
  if (body.entity === "supplier") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!name || name.length > 160) return jsonError("Enter a supplier name.");
    const { data, error } = await supabase.from("store_suppliers").insert({ name, email, phone, is_active: true }).select("id,name,email,phone,is_active").single();
    if (error) return jsonError(error.code === "23505" ? "That supplier already exists." : "The supplier could not be created.", error.code === "23505" ? 409 : 400);
    return Response.json({ supplier: data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  }
  const supplierId = typeof body.supplierId === "string" ? body.supplierId : "";
  const locationId = typeof body.locationId === "string" ? body.locationId : "";
  const items = Array.isArray(body.items) ? body.items : [];
  if (!supplierId || !locationId || !items.length) return jsonError("Select a supplier, receiving location, and at least one product.");
  const normalizedItems = items.map((item) => {
    const row = item as { variantId?: unknown; quantity?: unknown; unitCostPaise?: unknown };
    return { variant_id: row.variantId, quantity_ordered: row.quantity, unit_cost_paise: row.unitCostPaise ?? 0 };
  });
  if (normalizedItems.some((item) => typeof item.variant_id !== "string" || !Number.isInteger(item.quantity_ordered) || Number(item.quantity_ordered) < 1 || !Number.isInteger(item.unit_cost_paise) || Number(item.unit_cost_paise) < 0)) return jsonError("Enter valid quantities and unit costs.");
  const { data: order, error } = await supabase.from("store_purchase_orders").insert({ order_number: orderNumber(), supplier_id: supplierId, location_id: locationId, expected_at: typeof body.expectedAt === "string" && body.expectedAt ? body.expectedAt : null, notes: typeof body.notes === "string" ? body.notes.trim() : "", status: "draft", currency: "INR" }).select("id,order_number").single();
  if (error || !order) return jsonError("The purchase order could not be created.", 400);
  const { error: itemError } = await supabase.from("store_purchase_order_items").insert(normalizedItems.map((item) => ({ ...item, purchase_order_id: order.id })));
  if (itemError) {
    await supabase.from("store_purchase_orders").delete().eq("id", order.id);
    return jsonError(itemError.code === "23505" ? "A product can only appear once on an order." : "The purchase order items could not be saved.", 400);
  }
  return Response.json({ order }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const { supabase, denied } = await studioClient();
  if (denied || !supabase) return denied;
  let body: { id?: unknown; status?: unknown; expectedAt?: unknown; notes?: unknown; action?: unknown; receipts?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid purchase order update request."); }
  if (typeof body.id !== "string") return jsonError("A purchase order is required.");
  if (body.action === "receive") {
    const { data, error } = await supabase.rpc("studio_receive_purchase_order", { p_order_id: body.id, p_receipts: body.receipts });
    if (error) return jsonError(error.message.includes("cannot") || error.code === "22023" ? error.message : "The stock receipt could not be recorded.", error.code === "22023" ? 409 : 400);
    return Response.json({ receipt: data }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const allowed = ["draft", "ordered", "partial", "received", "cancelled"];
  if (typeof body.status !== "string" || !allowed.includes(body.status)) return jsonError("Invalid purchase order status.");
  const { data, error } = await supabase.from("store_purchase_orders").update({ status: body.status, expected_at: typeof body.expectedAt === "string" && body.expectedAt ? body.expectedAt : null, notes: typeof body.notes === "string" ? body.notes.trim() : "", updated_at: new Date().toISOString() }).eq("id", body.id).select("id,order_number,status,expected_at,notes,updated_at").single();
  if (error) return jsonError("The purchase order could not be updated.", 400);
  return Response.json({ order: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const { supabase, denied } = await studioClient();
  if (denied || !supabase) return denied;
  let body: { id?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid purchase order request."); }
  if (typeof body.id !== "string") return jsonError("A purchase order is required.");
  const { data: existing } = await supabase.from("store_purchase_orders").select("status").eq("id", body.id).maybeSingle();
  if (!existing) return jsonError("Purchase order not found.", 404);
  if (existing.status !== "draft") return jsonError("Only draft purchase orders can be deleted.", 409);
  const { error } = await supabase.from("store_purchase_orders").delete().eq("id", body.id);
  if (error) return jsonError("The purchase order could not be deleted.", 400);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
