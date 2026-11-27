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

  const { data: connections, error } = await supabase
    .from("supabase_connections")
    .select(
      `
      id,
      account_name,
      connection_status,
      supabase_organization_id,
      supabase_organization_slug
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to load connections." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    connections: (connections ?? []).map((c) => ({
      id: c.id,
      accountName: c.account_name,
      organization: {
        id: c.supabase_organization_id ?? "",
        name: c.account_name ?? "Supabase",
        slug: c.supabase_organization_slug ?? "",
      },
      connectionStatus: c.connection_status,
    })),
  });
}
