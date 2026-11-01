import "server-only";

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_AAD = Buffer.from("zerocraft:gmail:refresh-token:v1");

function encryptionKey() {
  const encoded = process.env.COMMERCE_CREDENTIALS_ENCRYPTION_KEY || process.env.STUDIO_CREDENTIALS_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Gmail credential encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("COMMERCE_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptRefreshToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(TOKEN_AAD);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptRefreshToken(value: string) {
  const [version, ivText, tagText, encryptedText, ...extra] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText || extra.length) {
    throw new Error("Stored Gmail credentials have an unsupported format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAAD(TOKEN_AAD);
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export type OAuthStatePayload = {
  state: string;
  verifier: string;
  actorId: string;
  expiresAt: number;
};

function stateSigningKey() {
  return createHmac("sha256", encryptionKey()).update("zerocraft:gmail:oauth-state:v1").digest();
}

export function createOAuthStateCookie(payload: OAuthStatePayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", stateSigningKey()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOAuthStateCookie(value: string): OAuthStatePayload | null {
  const [encoded, suppliedSignature, ...extra] = value.split(".");
  if (!encoded || !suppliedSignature || extra.length) return null;
  const expected = createHmac("sha256", stateSigningKey()).update(encoded).digest();
  const supplied = Buffer.from(suppliedSignature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthStatePayload;
    if (
      typeof payload.state !== "string" ||
      typeof payload.verifier !== "string" ||
      typeof payload.actorId !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export function randomOAuthValue(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}
