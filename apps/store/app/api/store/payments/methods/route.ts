import { createClient } from "@/apps/studio/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_payment_methods")
    .select(
      "method_code,display_name,merchant_name,upi_vpa,upi_qr_image_url,bank_name,bank_account_name,bank_account_number,bank_ifsc,instructions",
    )
    .eq("enabled", true)
    .order("display_name");
  if (error)
    return Response.json(
      { error: "Payment methods are temporarily unavailable." },
      { status: 503 },
    );
  return Response.json(
    { methods: data ?? [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
