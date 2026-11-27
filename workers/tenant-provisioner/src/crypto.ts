/**
 * Cryptographic helpers.
 *
 * OAuth tokens are encrypted with AES-256-GCM before they touch the Platform
 * DB. The key is supplied as a base64-encoded 32-byte Cloudflare secret. The
 * key id is stored alongside ciphertext so keys can be rotated.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const AAD = encoder.encode("zerocraft.supabase.oauth.v1");

export interface EncryptedSecret {
  ciphertext: string;
  nonce: string;
  keyId: string;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = normalized + (padding === 0 ? "" : "=".repeat(4 - padding));
  return fromBase64(padded);
}

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export function randomPassword(length = 40): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#%^*-_=+";
  const all = upper + lower + digits + symbols;

  const pick = (alphabet: string): string => {
    const buffer = new Uint8Array(1);
    crypto.getRandomValues(buffer);
    return alphabet[buffer[0]! % alphabet.length]!;
  };

  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = new Uint8Array(Math.max(0, length - required.length));
  crypto.getRandomValues(rest);
  for (const byte of rest) required.push(all[byte % all.length]!);

  // Fisher-Yates shuffle with crypto randomness.
  for (let i = required.length - 1; i > 0; i -= 1) {
    const buffer = new Uint8Array(1);
    crypto.getRandomValues(buffer);
    const j = buffer[0]! % (i + 1);
    [required[i], required[j]] = [required[j]!, required[i]!];
  }

  return required.join("");
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return toBase64Url(new Uint8Array(digest));
}

export async function createPkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = randomToken(48);
  return {
    verifier,
    challenge: await sha256Base64Url(verifier)
  };
}

async function importKey(keyMaterialBase64: string): Promise<CryptoKey> {
  const raw = fromBase64(keyMaterialBase64);
  if (raw.length !== 32) {
    throw new Error("encryption key must be 32 bytes (base64-encoded)");
  }
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt"
  ]);
}

export async function encryptSecret(
  plaintext: string,
  keyMaterialBase64: string,
  keyId: string
): Promise<EncryptedSecret> {
  const key = await importKey(keyMaterialBase64);
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, additionalData: AAD },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    nonce: toBase64(nonce),
    keyId
  };
}

export async function decryptSecret(
  secret: EncryptedSecret,
  keyMaterialBase64: string
): Promise<string> {
  const key = await importKey(keyMaterialBase64);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(secret.nonce),
      additionalData: AAD
    },
    key,
    fromBase64(secret.ciphertext)
  );
  return decoder.decode(plaintext);
}

export function decodeJwt(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("not a JWT");
  const payload = JSON.parse(decoder.decode(fromBase64Url(parts[1]!))) as unknown;
  if (typeof payload !== "object" || payload === null) throw new Error("invalid JWT payload");
  return payload as Record<string, unknown>;
}

export function jwtSubject(token: string): string {
  const payload = decodeJwt(token);
  if (typeof payload.sub !== "string") throw new Error("JWT has no subject");
  return payload.sub;
}
