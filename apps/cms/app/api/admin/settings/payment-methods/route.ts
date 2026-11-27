import { requireCommercePermission } from "@/lib/commerce-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireCommercePermission("settings.manage");
  if (!access.ok) return access.response;

  const { data, error } = await access.supabase
    .from("payment_methods")
    .select("method_code,display_name,merchant_name")
    .eq("enabled", true)
    .order("display_name");

  if (error) {
    return Response.json(
      { error: "Enabled payment methods could not be loaded." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return Response.json(
    { methods: data || [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
