export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host && (parsed.protocol === "https:" || (parsed.protocol === "http:" && parsed.hostname === "localhost"));
  } catch { return false; }
}
