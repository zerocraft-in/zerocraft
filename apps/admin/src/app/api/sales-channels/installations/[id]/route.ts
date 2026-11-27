import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrganization } from "@/lib/auth/session";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statusSchema = z.object({
  status: z.enum(["active", "paused", "error", "disconnected"]),
  externalAccountId: z.string().optional(),
  externalAccountName: z.string().optional(),
  externalAccountMetadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
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

  let body: { status: string; externalAccountId?: string; externalAccountName?: string; externalAccountMetadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid status update request." },
      { status: 400 },
    );
  }

  const installationId = (await params).id;

  // Call the SECURITY DEFINER RPC to update the installation status.
  // This validates that the installation belongs to the caller's organization
  // and the caller has sales_channels.manage permission.
  const { error: updateError } = await supabase.rpc(
    "update_channel_installation_status",
    {
      p_installation_id: installationId,
      p_status: parsed.data.status,
      p_external_account_id: parsed.data.externalAccountId || null,
      p_external_account_name: parsed.data.externalAccountName || null,
      p_external_account_metadata: parsed.data.externalAccountMetadata,
    },
  );

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message || "Unable to update channel installation." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
