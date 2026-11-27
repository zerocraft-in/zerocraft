import { requireCommercePermission } from "@/lib/commerce-auth";
export const dynamic = "force-dynamic";
export async function GET() {
 const access = await requireCommercePermission("dashboard.read");
 if (!access.ok) return access.response;
 const tables = await Promise.all([
  ["orders","Orders","/store/orders"], ["products","Products","/store/products"], ["categories","Categories","/store/categories"], ["content_records","Content","/store/content"],
 ].map(async ([name,label,href]) => { const result = await access.supabase.from(name).select("id",{count:"exact",head:true}); return {name,label,href,count:result.error ? null : result.count,lastActivity:null,available:!result.error,reason:result.error ? "Unavailable" : null}; }));
 const [summary, pending, fulfilled, recent, stock] = await Promise.all([
  access.supabase.rpc("order_summary"),
  access.supabase.from("orders").select("id",{count:"exact",head:true}).eq("status","pending"),
  access.supabase.from("orders").select("id",{count:"exact",head:true}).in("status",["completed","shipped"]),
  access.supabase.from("orders").select("id,order_number,status,created_at").order("created_at",{ascending:false}).limit(8),
  access.supabase.from("inventory_levels").select("on_hand,reserved,reorder_point"),
 ]);
 const orderSummary = summary.data as { count?: number; paidByCurrency?: Record<string,number> } | null;
 return Response.json({tables,commerce:{available:!summary.error,totalOrders:orderSummary?.count ?? tables[0].count,pendingOrders:pending.error ? null : pending.count,fulfilledOrders:fulfilled.error ? null : fulfilled.count,paidByCurrency:orderSummary?.paidByCurrency || {}},pendingOrders:pending.count,recent:(recent.data || []).map(order=>({id:order.id,title:order.order_number,detail:`Order · ${order.status}`,href:"/store/orders",date:order.created_at})),lowStock:stock.error ? null : stock.data.filter(level=>level.on_hand-level.reserved<=level.reorder_point).length,checkedAt:new Date().toISOString()}, {headers:{"Cache-Control":"private, no-store"}});
}
