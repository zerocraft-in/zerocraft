import { NextResponse } from "next/server";
import { audit, requireStudioAccess } from "@/lib/studio-api";
import { listStudioObjects } from "@/lib/studio-r2-server";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const result = await requireStudioAccess("integrations.manage");
  if ("response" in result) return result.response;
  const { provider } = await context.params;
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  const action = body?.action;
  if (!['verify', 'disconnect'].includes(String(action))) return NextResponse.json({ error: "Choose verify or disconnect." }, { status: 400 });

  if (action === "verify") {
    if (provider !== "cloudflare_r2") return NextResponse.json({ error: "Verification is not available for this integration yet." }, { status: 400 });
    try {
      const { objects, bucket } = await listStudioObjects();
      const { error } = await result.supabase.rpc("mark_integration_verified", { p_provider: provider, p_metadata: { bucket, object_count: objects.length, checked_at: new Date().toISOString() } });
      if (error) return NextResponse.json({ error: error.message }, { status: 503 });
      await audit(result.supabase, result.user.id, "integration.verified", "integration", provider, { bucket, object_count: objects.length });
      return NextResponse.json({ ok: true, bucket, objectCount: objects.length });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Cloudflare R2 verification failed." }, { status: 503 });
    }
  }

  const { error } = await result.supabase.rpc("disconnect_integration", { p_provider: provider });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit(result.supabase, result.user.id, "integration.disconnected", "integration", provider);
  return NextResponse.json({ ok: true });
}
