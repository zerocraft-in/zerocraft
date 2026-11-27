import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * OAuth callback endpoint for the Supabase connection flow.
 *
 * The tenant-provisioner Worker redirects here after exchanging the
 * authorization code. Query params:
 *   - oauth=connected  → provisioning can proceed (single org auto-finalized)
 *   - oauth=select&state=… → user must choose a Supabase organization
 *   - oauth=error&reason=…   → OAuth failed
 *
 * The `state` value is the raw (unhashed) state returned by the Worker. The
 * admin app uses it to look up the pending session via the Worker's
 * /oauth/pending endpoint (shared-secret protected).
 */

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const oauth = searchParams.get("oauth");
  const state = searchParams.get("state");
  const reason = searchParams.get("reason");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const wizardBase = `${baseUrl}/onboarding`;

  if (oauth === "error") {
    return NextResponse.redirect(
      `${wizardBase}?oauth=error&reason=${encodeURIComponent(reason ?? "unknown")}`,
    );
  }

  if (oauth === "connected") {
    // Single organization was auto-finalized by the Worker. Go straight to
    // the provisioning step; the connection is already active.
    return NextResponse.redirect(`${wizardBase}?oauth=connected`);
  }

  if (oauth === "select" && state) {
    // Multiple organizations were granted. Let the user pick one.
    return NextResponse.redirect(`${wizardBase}?oauth=select&state=${encodeURIComponent(state)}`);
  }

  // Unknown callback; send back to the start of the wizard.
  return NextResponse.redirect(`${wizardBase}?oauth=error&reason=unknown_callback`);
}
