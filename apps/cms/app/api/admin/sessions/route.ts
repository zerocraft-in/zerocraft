import { NextRequest } from "next/server";
import { requireCommercePermission } from "@/lib/commerce-auth";
import { createServiceClient } from "@/lib/supabase-service";
import { clearCommerceSessionCookie, requestDeviceMetadata, sessionCookieId, setCommerceSessionCookie, type CommerceSessionRow } from "@/lib/commerce-sessions";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sessionFields = "id,user_id,device_label,device_type,browser,operating_system,user_agent,ip_address,first_seen_at,last_seen_at,revoked_at";

function denied(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

function secureRequest(request: Request) { return new URL(request.url).protocol === "https:"; }

async function accessFor(request: NextRequest) {
  const access = await requireCommercePermission("settings.manage");
  if (!access.ok) return access;
  if (access.role !== "admin" && access.role !== "manager") return { ok: false as const, response: denied("Only admins and managers can manage sessions.", 403) };
  return access;
}

async function audit(service: Awaited<ReturnType<typeof createServiceClient>>, actorId: string, action: string, sessionId?: string) {
  await service.from("audit_logs").insert({ actor_id: actorId, action, entity_type: "commerce_session", entity_id: sessionId || null, metadata: { source: "device_management" } });
}

export async function GET(request: NextRequest) {
  const access = await accessFor(request);
  if (!access.ok) return access.response;
  try {
    const service = await createServiceClient();
    let id = sessionCookieId(request);
    const metadata = requestDeviceMetadata(request);
    const now = new Date().toISOString();
    let { data: existing, error: existingError } = await service.from("staff_sessions").select(sessionFields).eq("id", id).eq("user_id", access.user.id).maybeSingle();
    if (existingError) throw existingError;
    if (existing?.revoked_at) {
      const response = denied("This session has been revoked. Sign in again to continue.", 401);
      return clearCommerceSessionCookie(response, secureRequest(request));
    }
    // The CMS frame and a page can initialize in parallel on a fresh browser.
    // Reuse a very recent matching session so that startup cannot register the
    // same device twice while both requests are setting the cookie.
    if (!existing) {
      let recentQuery = service.from("staff_sessions").select(sessionFields).eq("user_id", access.user.id).eq("user_agent", metadata.userAgent).is("revoked_at", null).gte("last_seen_at", new Date(Date.now() - 2 * 60 * 1000).toISOString()).order("last_seen_at", { ascending: false }).limit(1);
      recentQuery = metadata.ipAddress ? recentQuery.eq("ip_address", metadata.ipAddress) : recentQuery.is("ip_address", null);
      const { data: recent, error: recentError } = await recentQuery.maybeSingle();
      if (recentError) throw recentError;
      if (recent) {
        id = recent.id;
        existing = recent;
      }
    }
    if (existing) {
      const { error } = await service.from("staff_sessions").update({ last_seen_at: now, updated_at: now, user_agent: metadata.userAgent, ip_address: metadata.ipAddress }).eq("id", id).eq("user_id", access.user.id);
      if (error) throw error;
    } else {
      const { error } = await service.from("staff_sessions").insert({ id, user_id: access.user.id, device_label: metadata.deviceLabel, device_type: metadata.deviceType, browser: metadata.browser, operating_system: metadata.operatingSystem, user_agent: metadata.userAgent, ip_address: metadata.ipAddress, first_seen_at: now, last_seen_at: now, updated_at: now });
      if (error) throw error;
    }
    const { data: sessions, error } = await service.from("staff_sessions").select(sessionFields).eq("user_id", access.user.id).order("last_seen_at", { ascending: false });
    if (error) throw error;
    const response = Response.json({ currentSessionId: id, sessions: (sessions || []).map((session) => ({ ...(session as CommerceSessionRow), isCurrent: session.id === id })) }, { headers: { "Cache-Control": "private, no-store" } });
    return setCommerceSessionCookie(response, id, secureRequest(request));
  } catch (error) {
    console.error("Commerce sessions read failed", error);
    return denied("Session registry is unavailable. Apply the studio sessions migration first.", 503);
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return denied("Invalid request origin.", 403);
  const access = await accessFor(request);
  if (!access.ok) return access.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return denied("A session id is required.");
  try {
    const service = await createServiceClient();
    const { data, error } = await service.from("staff_sessions").update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", access.user.id).is("revoked_at", null).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return denied("Session not found or already revoked.", 404);
    await audit(service, access.user.id, "studio.session_revoked", id);
    const current = sessionCookieId(request) === id;
    const response = Response.json({ revoked: true, current }, { headers: { "Cache-Control": "private, no-store" } });
    return current ? clearCommerceSessionCookie(response, secureRequest(request)) : response;
  } catch (error) {
    console.error("Commerce session revoke failed", error);
    return denied("The session could not be revoked.", 503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return denied("Invalid request origin.", 403);
  const access = await accessFor(request);
  if (!access.ok) return access.response;
  let body: { action?: unknown };
  try { body = await request.json(); } catch { return denied("Invalid session action."); }
  if (body.action !== "revoke_others") return denied("Unsupported session action.");
  try {
    const service = await createServiceClient();
    const current = sessionCookieId(request);
    const { error } = await service.from("staff_sessions").update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", access.user.id).neq("id", current).is("revoked_at", null);
    if (error) throw error;
    await audit(service, access.user.id, "studio.sessions_revoked_others");
    return Response.json({ revoked: true, currentSessionId: current }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Commerce other sessions revoke failed", error);
    return denied("Other sessions could not be revoked.", 503);
  }
}
