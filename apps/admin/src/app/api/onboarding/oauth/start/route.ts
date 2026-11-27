import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { startSupabaseOAuth } from "@/lib/provisioner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession();

  if (authError || !session?.access_token) {
    return NextResponse.json(
      { ok: false, error: "Unauthenticated" },
      { status: 401 },
    );
  }

  let body: { organizationId: string; returnTo: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!body.organizationId || !body.returnTo) {
    return NextResponse.json(
      { ok: false, error: "organizationId and returnTo are required." },
      { status: 400 },
    );
  }

  try {
    const result = await startSupabaseOAuth({
      organizationId: body.organizationId,
      userAccessToken: session.access_token,
      returnTo: body.returnTo,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: "Unable to start Supabase connection." },
      { status: 500 },
    );
  }
}
