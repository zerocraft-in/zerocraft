import { requireCommerceAccess, requireCommercePermission } from "@/lib/commerce-auth";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function responseError(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function getLowStock(access: Extract<Awaited<ReturnType<typeof requireCommerceAccess>>, { ok: true }>) {
  const { data, error } = await access.supabase
    .from("inventory_levels")
    .select("location_id,variant_id,on_hand,reserved,reorder_point,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).filter((level) => Number(level.on_hand) - Number(level.reserved) <= Number(level.reorder_point));
}

export async function GET() {
  const access = await requireCommercePermission("inventory.read");
  if (!access.ok) return access.response;
  try {
    const levels = await getLowStock(access);
    return Response.json({ alerts: levels, count: levels.length }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return responseError("Low-stock data is unavailable or the migration is not deployed.", 503);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return responseError("Invalid request origin.", 403);
  const access = await requireCommercePermission("inventory.manage");
  if (!access.ok) return access.response;
  try {
    const levels = await getLowStock(access);
    const activeKeys = new Set(levels.map((level) => `${level.location_id}:${level.variant_id}`));
    for (const level of levels) {
      const key = `${level.location_id}:${level.variant_id}`;
      const [{ data: location }, { data: variant }] = await Promise.all([
        access.supabase.from("locations").select("id,name,code").eq("id", level.location_id).maybeSingle(),
        access.supabase.from("variants").select("id,label,sku,product_id").eq("id", level.variant_id).maybeSingle(),
      ]);
      if (!variant) throw new Error("Inventory variant could not be loaded.");
      const { data: product } = await access.supabase.from("products").select("id,title,status").eq("id", variant.product_id).maybeSingle();
      const title = product?.title || "Inventory item";
      const label = variant?.label || "Default variant";
      const locationName = location?.name || "Inventory location";
      const { error: alertError } = await access.supabase.from("stock_alerts").upsert({
        location_id: level.location_id,
        variant_id: level.variant_id,
        last_on_hand: level.on_hand,
        last_reserved: level.reserved,
        last_reorder_point: level.reorder_point,
        status: "active",
        last_detected_at: new Date().toISOString(),
        resolved_at: null,
      }, { onConflict: "location_id,variant_id" });
      if (alertError) throw alertError;
      const notification = {
        title: `Low stock: ${title}`,
        message: `${label} at ${locationName} has ${Math.max(0, Number(level.on_hand) - Number(level.reserved))} available units, at or below the reorder point of ${level.reorder_point}.`,
        category: "system",
        type: "warning",
        read: false,
        link: "/store/inventory",
        recipient_id: access.user.id,
        dedupe_key: `low-stock:${key}:${access.user.id}`,
        metadata: { locationId: level.location_id, variantId: level.variant_id, onHand: level.on_hand, reserved: level.reserved, reorderPoint: level.reorder_point },
      };
      const { data: existingNotification, error: notificationLookupError } = await access.supabase
        .from("notifications")
        .select("id")
        .eq("dedupe_key", notification.dedupe_key)
        .maybeSingle();
      if (notificationLookupError) throw notificationLookupError;
      const { error: notificationError } = existingNotification
        ? await access.supabase.from("notifications").update(notification).eq("id", existingNotification.id)
        : await access.supabase.from("notifications").insert(notification);
      if (notificationError) throw notificationError;
    }
    const { data: activeAlerts } = await access.supabase.from("stock_alerts").select("id,location_id,variant_id,status").eq("status", "active");
    for (const alert of activeAlerts || []) {
      const key = `${alert.location_id}:${alert.variant_id}`;
      if (!activeKeys.has(key)) {
        const { error: resolveError } = await access.supabase.from("stock_alerts").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", alert.id);
        if (resolveError) throw resolveError;
        const { error: notificationResolveError } = await access.supabase.from("notifications").update({ read: true }).like("dedupe_key", `low-stock:${key}:%`).eq("recipient_id", access.user.id);
        if (notificationResolveError) throw notificationResolveError;
      }
    }
    return Response.json({ ok: true, count: levels.length }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Low-stock sync failed", error instanceof Error ? error.message : JSON.stringify(error));
    return responseError("Low-stock alerts could not be synchronized. Apply the observability migration first.", 503);
  }
}
