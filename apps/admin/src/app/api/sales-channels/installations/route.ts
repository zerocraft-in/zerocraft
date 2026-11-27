import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrganization } from "@/lib/auth/session";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const installSchema = z.object({
  storeId: z.string().uuid(),
  channelKey: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
});

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

  const { data: installations, error } = await supabase
    .schema("sales_channels")
    .from("channel_installations")
    .select(`
      id,
      organization_id,
      store_id,
      channel_id,
      status,
      external_account_id,
      external_account_name,
      external_account_metadata,
      installed_by,
      installed_at,
      connected_at,
      disconnected_at,
      last_synced_at,
      last_error_code,
      created_at,
      updated_at,
      channels (
        id,
        key,
        name,
        description,
        category,
        provider_key,
        icon,
        capabilities,
        configuration_schema,
        status,
        is_available
      ),
      stores (
        id,
        name,
        slug,
        status
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to load channel installations." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    installations: installations ?? [],
  });
}

export async function POST(request: Request): Promise<Response> {
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

  // Resolve the active organization from the verified session.
  let context;
  try {
    context = await requireOrganization();
  } catch {
    return NextResponse.json(
      { ok: false, error: "No active organization membership." },
      { status: 403 },
    );
  }

  if (!context.activeOrganization) {
    return NextResponse.json(
      { ok: false, error: "No active organization." },
      { status: 403 },
    );
  }

  let body: { storeId: string; channelKey: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = installSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid channel installation request." },
      { status: 400 },
    );
  }

  // Call the SECURITY DEFINER RPC to install the channel.
  // This validates organization membership, sales_channels.manage permission,
  // store ownership, and channel availability atomically.
  const { data: installationId, error: installError } = await supabase.rpc(
    "install_channel",
    {
      p_organization_id: context.activeOrganization.id,
      p_store_id: parsed.data.storeId,
      p_channel_key: parsed.data.channelKey,
    },
  );

  if (installError || !installationId) {
    return NextResponse.json(
      { ok: false, error: installError?.message || "Unable to install channel." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    installationId: installationId as string,
  });
}
