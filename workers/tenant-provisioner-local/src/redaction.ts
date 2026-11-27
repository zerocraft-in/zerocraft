/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Secret redaction helpers.
 *
 * Everything that may be written to a log, a job error or a step message goes
 * through redactSecrets(). The patterns intentionally cover the credential
 * shapes used by the platform and by Supabase.
 */

const MAX_MESSAGE_LENGTH = 2000;

export function redactSecrets(value: string): string {
  return value
    // Supabase personal access tokens.
    .replace(/\bsbp_[A-Za-z0-9_-]{8,}\b/g, "[redacted-supabase-token]")
    // Supabase secret API keys.
    .replace(/\bsb_secret_[A-Za-z0-9_-]{8,}\b/g, "[redacted-secret-key]")
    // JWTs (publishable/anon keys and OAuth access tokens).
    .replace(
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
      "[redacted-jwt]"
    )
    // Bearer headers.
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    // Key/value credentials in error text or JSON.
    .replace(
      /("?(?:password|db_pass|api_key|apikey|access_token|refresh_token|secret)"?\s*[:=]\s*)("?)([^"'\s,}]+)\2/gi,
      "$1[redacted]"
    )
    .slice(0, MAX_MESSAGE_LENGTH);
}

export function redactError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return redactSecrets(raw);
}

export function redactFields(fields: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!fields) return undefined;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      output[key] = redactSecrets(value);
    } else if (Array.isArray(value)) {
      output[key] = value.map((item) =>
        typeof item === "string" ? redactSecrets(item) : item
      );
    } else {
      output[key] = value;
    }
  }
  return output;
}
