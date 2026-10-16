import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey() {
  const value = process.env.STUDIO_CREDENTIALS_ENCRYPTION_KEY;
  if (!value) throw new Error("Studio credential encryption is not configured.");
  const key = Buffer.from(value, "base64url");
  if (key.length !== 32) throw new Error("Studio credential encryption key must decode to 32 bytes.");
  return key;
}

export function encryptIntegrationSecret(secret: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(secret), "utf8"),
    cipher.final(),
  ]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptIntegrationSecret<T>(value: string): T {
  const [version, ivText, tagText, ciphertextText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) {
    throw new Error("Unsupported encrypted integration credential.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

export async function getStoredIntegration<T>(provider: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !process.env.STUDIO_CREDENTIALS_ENCRYPTION_KEY) return null;

  const response = await fetch(`${url}/rest/v1/studio_integrations?provider=eq.${encodeURIComponent(provider)}&select=encrypted_credentials,enabled&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 404 || response.status === 400) return null;
    throw new Error("Could not read the Studio integration vault.");
  }
  const rows = await response.json() as { encrypted_credentials?: string | null; enabled?: boolean }[];
  const row = rows[0];
  if (row?.enabled === false) return null;
  const encrypted = row?.encrypted_credentials;
  return encrypted ? decryptIntegrationSecret<T>(encrypted) : null;
}

/** Explicit credential reveal for an authenticated Studio admin route. */
export async function getStoredIntegrationForAdmin<T>(provider: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !process.env.STUDIO_CREDENTIALS_ENCRYPTION_KEY) return null;

  const response = await fetch(`${url}/rest/v1/studio_integrations?provider=eq.${encodeURIComponent(provider)}&select=encrypted_credentials&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    if (response.status === 404 || response.status === 400) return null;
    throw new Error("Could not read the Studio integration vault.");
  }
  const rows = await response.json() as { encrypted_credentials?: string | null }[];
  const encrypted = rows[0]?.encrypted_credentials;
  return encrypted ? decryptIntegrationSecret<T>(encrypted) : null;
}

export async function isIntegrationEnabled(provider: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return true;
  const response = await fetch(`${url}/rest/v1/studio_integrations?provider=eq.${encodeURIComponent(provider)}&select=enabled&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 404 || response.status === 400) return true;
    throw new Error("Could not read the Studio integration status.");
  }
  const rows = await response.json() as { enabled?: boolean }[];
  return rows[0]?.enabled !== false;
}
