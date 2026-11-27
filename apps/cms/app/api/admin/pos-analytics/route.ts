import { isCurrencyCode, STORE_CURRENCY } from "@/lib/currency";
import { requireCommercePermission } from "@/lib/commerce-auth";

export const dynamic = "force-dynamic";

type AnalyticsOrder = {
  currency: string;
  status: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  total: number;
  created_at: string;
};

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const MAX_RANGE_DAYS = 366;

export async function GET(request: Request) {
  const access = await requireCommercePermission("orders.read");
  if (!access.ok) return access.response;

  const url = new URL(request.url);
  const currency = url.searchParams.get("currency") ?? STORE_CURRENCY;
  if (!isCurrencyCode(currency)) return Response.json({ error: "Unsupported reporting currency." }, { status: 400 });
  const startValue = url.searchParams.get("start");
  const endValue = url.searchParams.get("end");
  const start = startValue ? Date.parse(startValue) : Number.NaN;
  const end = endValue ? Date.parse(endValue) : Number.NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || end - start > MAX_RANGE_DAYS * 86400000) {
    return Response.json({ error: "Choose a valid date range of 366 days or less." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }

  const daily: Record<string, number> = {};
  let gross = 0;
  let discounts = 0;
  let refunds = 0;
  let orders = 0;
  let paidOrders = 0;
  let truncated = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await access.supabase
      .from("orders")
      .select("id,subtotal,discount,total,currency,status,payment_status,created_at")
      .eq("currency", currency)
      .gte("created_at", new Date(start).toISOString())
      .lt("created_at", new Date(end).toISOString())
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      return Response.json({ error: "Point of Sale analytics could not be loaded." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }

    const rows: AnalyticsOrder[] = data || [];
    for (const order of rows) {
      // Keep the boundary defensive in case a view or future query change bypasses the filter.
      if (String(order.currency || "").toUpperCase() !== currency) continue;
      orders += 1;
      const isPaid = order.payment_status === "paid";
      const isRefunded = order.status === "refunded" || order.payment_status === "refunded";
      const day = String(order.created_at).slice(0, 10);
      if (isPaid) {
        paidOrders += 1;
        const subtotal = Number(order.subtotal) || 0;
        gross += subtotal;
        discounts += Number(order.discount) || 0;
        daily[day] = (daily[day] || 0) + subtotal;
      }
      if (isRefunded) refunds += Number(order.total) || 0;
    }

    if (rows.length < PAGE_SIZE) break;
    if (page === MAX_PAGES - 1) truncated = true;
  }

  return Response.json({ currency, orders, paidOrders, gross, discounts, refunds, daily, truncated }, { headers: { "Cache-Control": "private, no-store" } });
}
