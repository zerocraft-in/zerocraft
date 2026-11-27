/**
 * Cryptographic helpers for PKCE, one-time authorization codes and
 * server-to-server handoff signatures.
 *
 * Uses the Web Crypto API available in Node 22+ and edge runtimes. No secret
 * value is ever placed in a URL by these helpers.
 */

const BASE64URL_ALPHABET = /^[A-Za-z0-9_-]+$/;

export const HANDOFF_CODE_BYTES = 32;
export const HANDOFF_TIMESTAMP_WINDOW_MS = 120_000;
export const HANDOFF_CODE_TTL_SECONDS = 60;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBytes(value: string): Uint8Array | null {
  if (!BASE64URL_ALPHABET.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  try {
    const binary = atob(padded + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Generates a URL-safe random token with at least 256 bits of entropy. */
export function generateRandomToken(byteLength = HANDOFF_CODE_BYTES): string {
  if (!Number.isInteger(byteLength) || byteLength < 16 || byteLength > 128) {
    throw new Error("Random token byte length must be between 16 and 128");
  }
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function createPkceVerifier(): string {
  // 64 random bytes -> 86 base64url characters, inside the RFC 7636 range.
  return generateRandomToken(64);
}

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function createPkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = createPkceVerifier();
  const challenge = await sha256Base64Url(verifier);
  return { verifier, challenge };
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  return sha256Base64Url(verifier);
}

/** Constant-time comparison for two base64url strings. */
export function timingSafeEqualBase64Url(a: string, b: string): boolean {
  const left = base64UrlToBytes(a);
  const right = base64UrlToBytes(b);
  if (!left || !right || left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) {
    difference |= left[i] ^ right[i];
  }
  return difference === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256Base64Url(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export type HandoffSignatureInput = {
  secret: string;
  timestamp: string;
  body: string;
  signature: string;
  now?: number;
  windowMs?: number;
};

/**
 * Produces the signature for an accounts <-> admin handoff redemption.
 *
 * The timestamp is bound into the signature and checked by the receiver, so a
 * captured request cannot be replayed outside a short window even before the
 * one-time code is consumed.
 */
export async function signHandoffRequest(
  secret: string,
  timestamp: string,
  body: string,
): Promise<string> {
  return hmacSha256Base64Url(secret, `${timestamp}.${body}`);
}

export async function verifyHandoffRequest(
  input: HandoffSignatureInput,
): Promise<boolean> {
  if (!input.secret || input.secret.length < 32) return false;
  if (!BASE64URL_ALPHABET.test(input.signature ?? "")) return false;

  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp)) return false;

  const now = input.now ?? Date.now();
  const windowMs = input.windowMs ?? HANDOFF_TIMESTAMP_WINDOW_MS;
  if (Math.abs(now - timestamp) > windowMs) return false;

  const expected = await signHandoffRequest(
    input.secret,
    input.timestamp,
    input.body,
  );
  return timingSafeEqualBase64Url(expected, input.signature);
}

export type HandoffRequestBody = {
  code: string;
  verifier: string;
  targetOrigin: string;
};

export function isValidHandoffCode(value: string): boolean {
  const bytes = base64UrlToBytes(value);
  return bytes !== null && bytes.length >= 24 && bytes.length <= 64;
}

export function isValidPkceVerifier(value: string): boolean {
  return /^[A-Za-z0-9\-._~]{43,128}$/.test(value);
}

export function isValidCodeChallenge(value: string): boolean {
  const bytes = base64UrlToBytes(value);
  return bytes !== null && bytes.length === 32;
}

export function isValidState(value: string): boolean {
  const bytes = base64UrlToBytes(value);
  return bytes !== null && bytes.length >= 24 && bytes.length <= 64;
}
