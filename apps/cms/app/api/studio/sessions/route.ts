import { NextRequest } from "next/server";
import { requireStudioPermission } from "@/lib/studio-auth";
import { createServiceClient } from "@/lib/supabase-service";
import { clearStudioSessionCookie, requestDeviceMetadata, sessionCookieId, setStudioSessionCookie, type StudioSessionRow } from "@/lib/studio-sessions";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sessionFields = "id,user_id,device_label,device_type,browser,operating_system,user_agent,ip_address,first_seen_at,last_seen_at,revoked_at";

function denied(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

function secureRequest(request: Request) { return new URL(request.url).protocol === "https:"; }

async function accessFor(request: NextRequest) {
  const access = await requireStudioPermission("settings.manage");
  if (!access.ok) return access;
  if (access.role !== "admin" && access.role !== "manager") return { ok: false as const, response: denied("Only admins and managers can manage sessions.", 403) };
  return access;
}

async function audit(service: ReturnType<typeof createServiceClient>, actorId: string, action: string, sessionId?: string) {
  await service.from("store_audit_logs").insert({ actor_id: actorId, action, entity_type: "studio_session", entity_id: sessionId || null, metadata: { source: "device_management" } });
}

export async function GET(request: NextRequest) {
  const access = await accessFor(request);
  if (!access.ok) return access.response;
  try {
    const service = createServiceClient();
    const id = sessionCookieId(request);
    const metadata = requestDeviceMetadata(request);
    const now = new Date().toISOString();
    const { data: existing, error: existingError } = await service.from("studio_sessions").select(sessionFields).eq("id", id).eq("user_id", access.user.id).maybeSingle();
    if (existingError) throw existingError;
    if (existing?.revoked_at) {
      const response = denied("This session has been revoked. Sign in again to continue.", 401);
      return clearStudioSessionCookie(response, secureRequest(request));
    }
    if (existing) {
      const { error } = await service.from("studio_sessions").update({ last_seen_at: now, updated_at: now, user_agent: metadata.userAgent, ip_address: metadata.ipAddress }).eq("id", id).eq("user_id", access.user.id);
      if (error) throw error;
    } else {
      const { error } = await service.from("studio_sessions").insert({ id, user_id: access.user.id, device_label: metadata.deviceLabel, device_type: metadata.deviceType, browser: metadata.browser, operating_system: metadata.operatingSystem, user_agent: metadata.userAgent, ip_address: metadata.ipAddress, first_seen_at: now, last_seen_at: now, updated_at: now });
      if (error) throw error;
    }
    const { data: sessions, error } = await service.from("studio_sessions").select(sessionFields).eq("user_id", access.user.id).order("last_seen_at", { ascending: false });
    if (error) throw error;
    const response = Response.json({ currentSessionId: id, sessions: (sessions || []).map((session) => ({ ...(session as StudioSessionRow), isCurrent: session.id === id })) }, { headers: { "Cache-Control": "private, no-store" } });
    return setStudioSessionCookie(response, id, secureRequest(request));
  } catch (error) {
    console.error("Studio sessions read failed", error);
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
    const service = createServiceClient();
    const { data, error } = await service.from("studio_sessions").update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", access.user.id).is("revoked_at", null).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return denied("Session not found or already revoked.", 404);
    await audit(service, access.user.id, "studio.session_revoked", id);
    const current = sessionCookieId(request) === id;
    const response = Response.json({ revoked: true, current }, { headers: { "Cache-Control": "private, no-store" } });
    return current ? clearStudioSessionCookie(response, secureRequest(request)) : response;
  } catch (error) {
    console.error("Studio session revoke failed", error);
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
    const service = createServiceClient();
    const current = sessionCookieId(request);
    const { error } = await service.from("studio_sessions").update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", access.user.id).neq("id", current).is("revoked_at", null);
    if (error) throw error;
    await audit(service, access.user.id, "studio.sessions_revoked_others");
    return Response.json({ revoked: true, currentSessionId: current }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Studio other sessions revoke failed", error);
    return denied("Other sessions could not be revoked.", 503);
  }
}
