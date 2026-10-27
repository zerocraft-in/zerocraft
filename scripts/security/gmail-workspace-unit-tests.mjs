import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  createOAuthStateCookie,
  decryptRefreshToken,
  encryptRefreshToken,
  verifyOAuthStateCookie,
} from "../../apps/cms/lib/email/gmail-crypto.ts";
import {
  buildRawEmail,
  parseEmailAttachments,
} from "../../apps/cms/lib/email/mime-message.ts";

process.env.STUDIO_CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const refreshToken = "test-refresh-token-never-used-against-Google";
const encrypted = encryptRefreshToken(refreshToken);
assert.notEqual(encrypted, refreshToken, "Refresh tokens must not be stored in plaintext.");
assert.equal(decryptRefreshToken(encrypted), refreshToken, "Encrypted refresh tokens must round-trip.");
assert.throws(() => decryptRefreshToken(`${encrypted.slice(0, -2)}xx`), undefined, "Tampered ciphertext must be rejected.");

const state = {
  state: "random-state",
  verifier: "pkce-verifier",
  actorId: "admin-user-id",
  expiresAt: Date.now() + 60_000,
};
const stateCookie = createOAuthStateCookie(state);
assert.deepEqual(verifyOAuthStateCookie(stateCookie), state, "Signed OAuth state must round-trip.");
const [encodedState, stateSignature] = stateCookie.split(".");
const changedSignature = `${stateSignature[0] === "A" ? "B" : "A"}${stateSignature.slice(1)}`;
assert.equal(verifyOAuthStateCookie(`${encodedState}.${changedSignature}`), null, "Tampered OAuth state must be rejected.");
assert.equal(verifyOAuthStateCookie(createOAuthStateCookie({ ...state, expiresAt: Date.now() - 1 })), null, "Expired OAuth state must be rejected.");

const pdf = Buffer.from("%PDF-1.7\nsafe test fixture", "utf8").toString("base64");
const attachments = parseEmailAttachments([{
  filename: "..\\receipt.pdf",
  mimeType: "application/pdf",
  data: pdf,
}]);
assert.equal(attachments[0].filename, "receipt.pdf", "Attachment paths must be stripped.");
assert.throws(() => parseEmailAttachments([{
  filename: "image.svg",
  mimeType: "image/svg+xml",
  data: Buffer.from("<svg/>").toString("base64"),
}]), undefined, "Active SVG attachments must be rejected.");
assert.throws(() => parseEmailAttachments([{
  filename: "fake.pdf",
  mimeType: "application/pdf",
  data: Buffer.from("<html>not a PDF</html>").toString("base64"),
}]), undefined, "Attachment signatures must match the declared content type.");

const encoded = buildRawEmail({
  to: ["recipient@example.net"],
  cc: [],
  bcc: [],
  subject: "Safe test",
  body: "Plain text body",
  attachments,
});
const raw = Buffer.from(encoded, "base64url").toString("utf8");
assert.match(raw, /Content-Type: multipart\/mixed/, "Attachment messages must use multipart MIME.");
assert.match(raw, /filename="receipt\.pdf"/, "Attachment filename must be present in MIME output.");
assert.ok(raw.includes(Buffer.from("Plain text body").toString("base64")), "Plain text body must be included.");

console.log("Gmail workspace unit tests passed: token encryption, OAuth state, attachment validation, and MIME encoding.");
