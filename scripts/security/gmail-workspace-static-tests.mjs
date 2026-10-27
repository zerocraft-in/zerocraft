import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const schema = read("packages/supabase/supabase/migrations/20261027180000_studio_gmail_workspace.sql");
const crypto = read("apps/cms/lib/email/gmail-crypto.ts");
const gmail = read("apps/cms/lib/email/gmail.ts");
const oauth = read("apps/cms/app/api/studio/email/oauth/route.ts");
const mime = read("apps/cms/lib/email/mime-message.ts");
const workspace = read("apps/cms/components/studio/email-workspace.tsx");
const proxy = read("apps/cms/proxy.ts");
const routes = [
  "apps/cms/app/api/studio/email/oauth/route.ts",
  "apps/cms/app/api/studio/email/oauth/callback/route.ts",
  "apps/cms/app/api/studio/email/connection/route.ts",
  "apps/cms/app/api/studio/email/messages/route.ts",
  "apps/cms/app/api/studio/email/threads/[threadId]/route.ts",
  "apps/cms/app/api/studio/email/messages/[threadId]/actions/route.ts",
  "apps/cms/app/api/studio/email/labels/route.ts",
  "apps/cms/app/api/studio/email/drafts/route.ts",
  "apps/cms/app/api/studio/email/drafts/[draftId]/route.ts",
  "apps/cms/app/api/studio/email/send/route.ts",
  "apps/cms/app/api/studio/email/attachments/[messageId]/[attachmentId]/route.ts",
];

assert(schema.includes("alter table public.studio_gmail_connections enable row level security"), "Connection RLS must be enabled.");
assert(schema.includes("revoke all on public.studio_gmail_connections from anon, authenticated"), "Credential table must not be readable by browser sessions.");
assert(schema.includes("grant select, insert, update, delete on public.studio_gmail_connections to service_role"), "Credential table must be server-only.");
assert(schema.includes("public.is_studio_admin()"), "Database must enforce admin-only access.");
assert(schema.includes("studio_gmail_consume_rate_limit"), "Database-backed rate limiting is missing.");
assert(crypto.includes("aes-256-gcm"), "Refresh token encryption must use authenticated encryption.");
assert(crypto.includes("timingSafeEqual"), "OAuth state validation must use constant-time signature comparison.");
assert(crypto.includes("expiresAt <= Date.now()"), "OAuth state must expire.");
assert(oauth.includes("https://www.googleapis.com/auth/gmail.modify"), "Only the minimally required Gmail scope should be requested.");
assert(!oauth.includes("mail.google.com"), "Full-mailbox scope must not be requested.");
assert(mime.includes("MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024"), "Compose upload cap must fit the server request limit.");
assert(mime.includes("contentMatchesMime"), "Attachment bytes must be checked against their declared type.");
assert(!workspace.includes("dangerouslySetInnerHTML"), "Untrusted email HTML must never be rendered directly.");
assert(proxy.includes("pathname === \"/studio/email\""), "The email route must bypass only the legacy Studio redirect.");

for (const relative of routes) {
  const source = read(relative);
  assert(source.includes("requireGmailAdmin"), `${relative} must enforce server-side Gmail authorization.`);
}
for (const relative of [
  "apps/cms/app/api/studio/email/send/route.ts",
  "apps/cms/app/api/studio/email/drafts/route.ts",
  "apps/cms/app/api/studio/email/connection/route.ts",
]) {
  const source = read(relative);
  assert(source.includes("isSameOrigin"), `${relative} must protect state-changing requests against CSRF.`);
}

console.log("Gmail workspace security contract checks passed.");
