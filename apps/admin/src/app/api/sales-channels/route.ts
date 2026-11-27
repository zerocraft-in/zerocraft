import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthenticated" },
      { status: 401 },
    );
  }

  const { data: channels, error } = await supabase
    .schema("sales_channels")
    .from("channels")
    .select("id, key, name, description, category, provider_key, icon, capabilities, configuration_schema, status, is_available, created_at, updated_at")
    .eq("is_available", true)
    .order("name");

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to load sales channels." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    channels: channels ?? [],
  });
}
