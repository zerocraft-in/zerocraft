import Link from "next/link";
import { ArrowRight, BarChart3, MapPin, QrCode, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@zerocraft/ui/card";
import { Button } from "@zerocraft/ui/button";

export default async function PointOfSalePage() {
  const context = await requirePermission("sales_channels.view");
  const supabase = await createServerSupabaseClient();
  const [{ count: deviceCount }, { count: openSessionCount }] = await Promise.all([
    supabase.from("pos_devices").select("id", { count: "exact", head: true }).eq("organization_id", context.activeOrganization!.id),
    supabase.from("pos_register_sessions").select("id", { count: "exact", head: true }).eq("organization_id", context.activeOrganization!.id).eq("status", "open"),
  ]);
  return <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"><div className="flex items-center justify-between"><h1 className="text-2xl font-semibold tracking-tight">Point of Sale</h1><div className="flex gap-2"><Button variant="outline"><MapPin className="mr-2 size-4" />Locations</Button><Button variant="outline"><Users className="mr-2 size-4" />Staff</Button></div></div><Card className="overflow-hidden bg-[#020817] text-white"><CardContent className="flex min-h-48 items-center justify-center gap-8 p-8 text-center"><div><QrCode className="mx-auto mb-3 size-12" /><h2 className="text-2xl font-semibold">Sign in and start selling with POS</h2><p className="mt-2 text-sm text-slate-300">Register a device and open a cash session to begin.</p></div><div className="hidden size-28 items-center justify-center rounded-xl bg-white text-black sm:flex"><QrCode className="size-20" /></div></CardContent></Card><div><h2 className="mb-3 font-medium">Analytics</h2><Card><CardContent className="grid gap-4 p-5 sm:grid-cols-3"><Metric label="Registered devices" value={String(deviceCount ?? 0)} href="/settings/sales-channels/point-of-sale/devices" /><Metric label="Open register sessions" value={String(openSessionCount ?? 0)} href="/settings/sales-channels/point-of-sale/register-sessions" /><Metric label="Gross sales" value="₹0.00" /></CardContent></Card></div><div className="flex justify-center"><Link href="/settings/sales-channels/point-of-sale/settings" className="text-sm text-muted-foreground hover:text-foreground">Configure POS settings <ArrowRight className="ml-1 inline size-4" /></Link></div></div>;
}
function Metric({ label, value, href }: { label: string; value: string; href?: string }) { const content = <div className="rounded-lg border p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><BarChart3 className="size-4 text-muted-foreground" /></div><p className="mt-3 text-2xl font-semibold">{value}</p></div>; return href ? <Link href={href}>{content}</Link> : content; }
