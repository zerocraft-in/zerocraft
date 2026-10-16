import { createClient } from "@/utils/supabase/server";
import { isSameOrigin } from "@/lib/request-origin";
import { encryptIntegrationSecret } from "@/lib/studio-integration-secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Provider = "gemini" | "supabase";

async function actor() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { user: null, role: null };
  const { data } = await session.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { user, role: data?.role || null };
}

function adminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Server-side Supabase admin access is not configured.");
  return { url: url.replace(/\/$/, ""), serviceKey };
}

async function requestSupabase(url: string, key: string) {
  return fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
}

async function verify(provider: Provider, credentials: Record<string, string>) {
  if (provider === "gemini") {
    const model = credentials.model;
    const apiKey = credentials.apiKey;
    if (!apiKey || apiKey.length > 4096 || !/^[a-zA-Z0-9_.-]{2,100}$/.test(model || "")) {
      return { ok: false, message: "Enter a valid Gemini API key and model ID." };
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with OK." }] }], generationConfig: { maxOutputTokens: 8, temperature: 0 } }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return { ok: false, message: "Gemini rejected the connection. Check the key, model, and project quota." };
    return { ok: true, message: "Gemini connection verified." };
  }

  const url = credentials.url;
  const serviceKey = credentials.serviceRoleKey;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { ok: false, message: "Enter a valid Supabase project URL." }; }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co") || !serviceKey || serviceKey.length > 8192) {
    return { ok: false, message: "Use an HTTPS Supabase project URL and a valid server-side secret key." };
  }
  const activeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!activeUrl || new URL(activeUrl).origin !== parsed.origin) {
    return { ok: false, message: "This setup currently manages the Supabase project configured for Studio. Change NEXT_PUBLIC_SUPABASE_URL in deployment settings before connecting a different project." };
  }
  const response = await requestSupabase(parsed.origin, serviceKey);
  if (!response.ok) return { ok: false, message: "Supabase rejected the connection. Check the project URL and secret key." };
  return { ok: true, message: "Supabase project connection verified." };
}

export async function GET() {
  const { user, role } = await actor();
  if (!user || !["admin", "manager", "staff"].includes(role || "")) {
    return Response.json({ error: "Studio access required." }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }
  let databaseConnected = false;
  try {
    const response = await requestSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");
    databaseConnected = response.ok;
  } catch { /* the connection card below reports the environment state */ }

  let stored: { provider: Provider; display_name: string; status: string; last_verified_at: string | null; updated_at: string; enabled?: boolean; encrypted_credentials?: string | null }[] = [];
  let migrationRequired = false;
  try {
    const { url, serviceKey } = adminConfig();
    const response = await fetch(`${url}/rest/v1/studio_integrations?select=provider,display_name,status,last_verified_at,updated_at,enabled,encrypted_credentials&order=provider.asc`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) stored = await response.json();
    else migrationRequired = response.status === 404 || response.status === 400;
  } catch { migrationRequired = true; }

  return Response.json({
    integrations: stored.map(({ encrypted_credentials, ...entry }) => ({ ...entry, has_saved_credentials: Boolean(encrypted_credentials) })),
    migrationRequired,
    encryptionConfigured: Boolean(process.env.STUDIO_CREDENTIALS_ENCRYPTION_KEY),
    core: {
      supabase: { ready: databaseConnected && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), detail: databaseConnected ? "Project and admin connection verified" : "Using configured project connection" },
      gemini: {
        ready: Boolean(stored.find((entry) => entry.provider === "gemini")?.enabled !== false && (stored.some((entry) => entry.provider === "gemini" && entry.status === "connected" && entry.encrypted_credentials) || process.env.GEMINI_API_KEY)),
        configured: Boolean(stored.some((entry) => entry.provider === "gemini" && entry.status === "connected" && entry.encrypted_credentials) || process.env.GEMINI_API_KEY),
        model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
        source: stored.some((entry) => entry.provider === "gemini" && entry.status === "connected" && entry.encrypted_credentials) ? "vault" : process.env.GEMINI_API_KEY ? "environment" : "none",
      },
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { user, role } = await actor();
  if (!user || role !== "admin") return Response.json({ error: "Only a Studio administrator can manage provider connections." }, { status: 403 });
  let body: { provider?: Provider; enabled?: boolean };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (body.provider !== "gemini" || typeof body.enabled !== "boolean") return Response.json({ error: "Choose a valid provider state." }, { status: 400 });
  try {
    const { url, serviceKey } = adminConfig();
    const response = await fetch(`${url}/rest/v1/studio_integrations?on_conflict=provider`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ provider: "gemini", display_name: "Google Gemini", status: "connected", enabled: body.enabled, updated_by: user.id, updated_at: new Date().toISOString() }),
      cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return Response.json({ error: response.status === 400 ? "Apply the latest Studio integrations vault migration to enable connection controls." : "Could not update Gemini state." }, { status: 503 });
    return Response.json({ ok: true, enabled: body.enabled }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "The secure integrations vault is unavailable." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { user, role } = await actor();
  if (!user || role !== "admin") return Response.json({ error: "Only a Studio administrator can manage provider connections." }, { status: 403 });

  let body: { provider?: Provider; credentials?: Record<string, unknown>; confirmed?: boolean };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body.confirmed) return Response.json({ error: "Confirm the provider connection before saving credentials." }, { status: 400 });
  if (body.provider !== "gemini" && body.provider !== "supabase") return Response.json({ error: "This provider is not available yet." }, { status: 400 });

  let credentials: Record<string, string>;
  if (body.provider === "gemini") {
    credentials = { apiKey: String(body.credentials?.apiKey || "").trim(), model: String(body.credentials?.model || "").trim() };
  } else {
    credentials = { url: String(body.credentials?.url || "").trim(), serviceRoleKey: String(body.credentials?.serviceRoleKey || "").trim() };
  }

  const verification = await verify(body.provider, credentials).catch(() => ({ ok: false, message: "Could not reach the provider. Check the URL and try again." }));
  if (!verification.ok) return Response.json({ error: verification.message }, { status: 422 });

  try {
    const encrypted = encryptIntegrationSecret(credentials);
    const { url, serviceKey } = adminConfig();
    const response = await fetch(`${url}/rest/v1/studio_integrations?on_conflict=provider`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        provider: body.provider,
        display_name: body.provider === "gemini" ? "Google Gemini" : "Supabase",
        status: "connected",
        encrypted_credentials: encrypted,
        enabled: true,
        last_verified_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return Response.json({ error: "Provider verified, but the secure integration vault is unavailable. Apply the Studio integrations migration first." }, { status: 503 });
    return Response.json({ ok: true, message: verification.message }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Secure credential storage is not configured on this server." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { user, role } = await actor();
  if (!user || role !== "admin") return Response.json({ error: "Only a Studio administrator can manage provider connections." }, { status: 403 });
  let body: { provider?: Provider; confirmed?: boolean };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body.confirmed || (body.provider !== "gemini" && body.provider !== "supabase")) return Response.json({ error: "Confirm a valid provider disconnection." }, { status: 400 });
  try {
    const { url, serviceKey } = adminConfig();
    const response = await fetch(`${url}/rest/v1/studio_integrations?provider=eq.${body.provider}`, {
      method: "DELETE",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "return=minimal" },
      cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return Response.json({ error: "Could not remove this provider connection." }, { status: 503 });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "The secure integration vault is unavailable." }, { status: 503 });
  }
}
