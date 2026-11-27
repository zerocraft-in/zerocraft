import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  let body: {
    organizationId: string;
    storeName: string;
    storeSlug: string;
    region: string;
    connectionId: string;
    idempotencyKey: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (
    !body.organizationId ||
    !body.storeName ||
    !body.storeSlug ||
    !body.region ||
    !body.connectionId ||
    !body.idempotencyKey
  ) {
    return NextResponse.json(
      { ok: false, error: "All provisioning fields are required." },
      { status: 400 },
    );
  }

  // Enqueue the provisioning job via the SECURITY DEFINER RPC. The RPC
  // validates caller authorization, creates the draft store if needed, and
  // returns an idempotent job id.
  const { data: jobId, error: jobError } = await supabase.rpc(
    "enqueue_tenant_provisioning",
    {
      p_organization_id: body.organizationId,
      p_store_id: null,
      p_connection_id: body.connectionId || null,
      p_idempotency_key: body.idempotencyKey,
      p_store_name: body.storeName,
      p_project_name: body.storeSlug,
      p_region: body.region,
      p_template_name: "zerocraft-default-commerce",
      p_template_version: "1.0.0",
      p_metadata: {},
    },
  );

  if (jobError || !jobId) {
    return NextResponse.json(
      { ok: false, error: "Unable to start provisioning job." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    jobId: jobId as string,
  });
}
