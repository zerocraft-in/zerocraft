export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    const isLocalHost = hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname === "[::1]"
      || hostname.endsWith(".localhost")
      || hostname.endsWith(".127.0.0.1");
    return parsed.host === host && (parsed.protocol === "https:" || (parsed.protocol === "http:" && isLocalHost));
  } catch { return false; }
}
