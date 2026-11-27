import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireOrganization } from "@/lib/auth/session";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const settingsSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
});

export async function GET(
  _request: Request,
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

  const installationId = (await params).id;

  const { data: settings, error } = await supabase
    .schema("sales_channels")
    .from("channel_settings")
    .select("setting_key, setting_value")
    .eq("installation_id", installationId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to load channel settings." },
      { status: 500 },
    );
  }

  // Convert array of {setting_key, setting_value} to a flat object.
  const settingsObj: Record<string, unknown> = {};
  (settings ?? []).forEach((s) => {
    settingsObj[s.setting_key] = s.setting_value;
  });

  return NextResponse.json({
    ok: true,
    settings: settingsObj,
  });
}

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

  let body: { settings: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid settings request." },
      { status: 400 },
    );
  }

  const installationId = (await params).id;

  // Upsert each setting.
  const settingsEntries = Object.entries(parsed.data.settings);
  for (const [key, value] of settingsEntries) {
    const { error } = await supabase
      .schema("sales_channels")
    .from("channel_settings")
      .upsert(
        {
          installation_id: installationId,
          setting_key: key,
          setting_value: value,
        },
        { onConflict: "installation_id,setting_key" },
      );

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Unable to update setting ${key}.` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
  });
}
