import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Reports whether the Tenant Provisioning Worker is configured on the admin
 * side. Used by the onboarding wizard to decide whether to show the
 * Supabase account connection action or a configuration error.
 *
 * Never exposes the secret value itself.
 */
export async function GET(): Promise<Response> {
  const configured =
    Boolean(process.env.TENANT_PROVISIONER_URL?.trim()) &&
    Boolean(process.env.TENANT_PROVISIONER_SHARED_SECRET?.trim());

  return NextResponse.json({
    ok: true,
    provisionerConfigured: configured,
  });
}
