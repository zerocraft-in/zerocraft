import { createClient } from "@zerocraft/supabase/server";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function studioClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, denied: jsonError("Studio access required.", 403) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!["admin", "manager", "staff"].includes(profile?.role || "")) return { supabase: null, user: null, denied: jsonError("Studio access required.", 403) };
  return { supabase, user, denied: null };
}

export async function GET() {
  const { supabase, user, denied } = await studioClient();
  if (denied || !supabase) return denied;
  const [locations, levels] = await Promise.all([
    supabase.from("store_inventory_locations").select("id,name,code,is_active,created_at").order("name"),
    supabase.from("store_inventory_levels").select("location_id,variant_id,on_hand,reserved,reorder_point,updated_at,location:store_inventory_locations(id,name,code),variant:store_product_variants(id,label,sku,price,price_paise,currency_code,product:store_products(id,title,status,product_type))").order("updated_at", { ascending: false }),
  ]);
  if (locations.error || levels.error) return jsonError("Inventory tables are unavailable or access is denied.", 503);
  return Response.json({ locations: locations.data || [], levels: levels.data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const { supabase, user, denied } = await studioClient();
  if (denied || !supabase) return denied;
  let body: { name?: unknown; code?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid inventory location request."); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!name || name.length > 120 || !/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(code)) return jsonError("Enter a location name and a code using 2–32 letters, numbers, hyphens, or underscores.");
  const { data, error } = await supabase.from("store_inventory_locations").insert({ name, code, is_active: true }).select("id,name,code,is_active,created_at").single();
  if (error) return jsonError(error.code === "23505" ? "That inventory location name or code already exists." : "The inventory location could not be created.", error.code === "23505" ? 409 : 400);
  void supabase.from("store_audit_logs").insert({ actor_id: user.id, action: "inventory.location_created", entity_type: "inventory_location", entity_id: data?.id, metadata: { name, code } });
  return Response.json({ location: data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const { supabase, user, denied } = await studioClient();
  if (denied || !supabase) return denied;
  let body: { locationId?: unknown; variantId?: unknown; onHand?: unknown; reorderPoint?: unknown; isActive?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid inventory update request."); }
  if (typeof body.locationId !== "string") return jsonError("An inventory location is required.");
  if (typeof body.isActive === "boolean" && body.variantId == null) {
    const { data, error } = await supabase.from("store_inventory_locations").update({ is_active: body.isActive }).eq("id", body.locationId).select("id,name,code,is_active,created_at").single();
    if (error) return jsonError("The inventory location could not be updated.", 400);
    void supabase.from("store_audit_logs").insert({ actor_id: user.id, action: "inventory.location_status_changed", entity_type: "inventory_location", entity_id: data?.id, metadata: { isActive: body.isActive } });
    return Response.json({ location: data }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (typeof body.variantId !== "string" || !Number.isInteger(body.onHand) || Number(body.onHand) < 0 || !Number.isInteger(body.reorderPoint) || Number(body.reorderPoint) < 0) return jsonError("Enter valid on-hand and reorder-point quantities.");
  const { data, error } = await supabase.rpc("studio_adjust_inventory", {
    p_location_id: body.locationId,
    p_variant_id: body.variantId,
    p_on_hand: body.onHand,
    p_reorder_point: body.reorderPoint,
  });
  if (error) {
    if (error.code === "P0001" && error.message?.includes("INVENTORY_RESERVED")) return jsonError("On-hand stock cannot be lower than reserved stock.", 409);
    if (error.code === "22023") return jsonError("Enter valid on-hand and reorder-point quantities.");
    return jsonError("The inventory level could not be updated atomically.", 400);
  }
  void supabase.from("store_audit_logs").insert({ actor_id: user.id, action: "inventory.level_adjusted", entity_type: "inventory_level", entity_id: body.variantId, metadata: { locationId: body.locationId, onHand: body.onHand, reorderPoint: body.reorderPoint } });
  return Response.json({ level: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const { supabase, user, denied } = await studioClient();
  if (denied || !supabase) return denied;
  let body: { locationId?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid inventory location request."); }
  if (typeof body.locationId !== "string") return jsonError("An inventory location is required.");
  const { count } = await supabase.from("store_inventory_levels").select("location_id", { count: "exact", head: true }).eq("location_id", body.locationId);
  if ((count || 0) > 0) return jsonError("This location still has inventory levels. Deactivate it instead of deleting it.", 409);
  const { error } = await supabase.from("store_inventory_locations").delete().eq("id", body.locationId);
  if (error) return jsonError("The inventory location could not be deleted.", 400);
  void supabase.from("store_audit_logs").insert({ actor_id: user.id, action: "inventory.location_deleted", entity_type: "inventory_location", entity_id: body.locationId, metadata: {} });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
