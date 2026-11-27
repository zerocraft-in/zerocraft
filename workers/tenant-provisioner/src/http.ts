const NO_STORE = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer"
} as const;

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...NO_STORE,
      ...extraHeaders
    }
  });
}

export function problem(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

export function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { location, ...NO_STORE }
  });
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function requireSharedSecret(
  request: Request,
  expected: string | undefined
): Response | null {
  if (!expected) {
    return problem(500, "MISCONFIGURED", "PROVISIONER_SHARED_SECRET is not set");
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token || !safeEqual(token, expected)) {
    return problem(401, "UNAUTHORIZED", "Invalid service credential");
  }

  return null;
}

export async function readJson<T>(request: Request): Promise<T | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Only https URLs on the admin origin or an explicitly allowlisted origin may
 * be used as an OAuth return target. Prevents open redirects.
 */
export function validateReturnTo(raw: string, adminAppUrl: string, allowlist = ""): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;

  const allowedOrigins = new Set<string>();
  try {
    allowedOrigins.add(new URL(adminAppUrl).origin);
  } catch {
    return null;
  }

  for (const item of allowlist.split(",")) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    try {
      allowedOrigins.add(new URL(trimmed).origin);
    } catch {
      // Ignore malformed entries rather than widening access.
    }
  }

  return allowedOrigins.has(parsed.origin) ? parsed : null;
}

export function appendQuery(url: URL, params: Record<string, string>): URL {
  const next = new URL(url.toString());
  for (const [key, value] of Object.entries(params)) {
    next.searchParams.set(key, value);
  }
  return next;
}

export function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const redacted = raw
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[redacted-jwt]")
    .replace(/sbp_[A-Za-z0-9]+/g, "[redacted-token]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]");
  return redacted.slice(0, 2000);
}
