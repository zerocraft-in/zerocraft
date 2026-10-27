# Studio Gmail workspace setup

This feature is local code until its environment, Google OAuth client, and Supabase migration are deliberately configured. It does not replace the CMS SMTP transport used by notifications, order mail, or existing templates.

## What is implemented

- Admin-only `/studio/email` page, shared across the Studio admin team.
- Server-side Google authorization-code flow with signed, expiring state and PKCE.
- One `gmail.modify` scope; this supports reading, labels, drafts, and sending without requesting full-account `mail.google.com` access.
- AES-256-GCM encrypted refresh-token storage. Short-lived access tokens are cached only in server memory and bound to the currently stored refresh token.
- Gmail inbox, unread, starred, sent, drafts, threads, search, labels, replies, reply-all, forwarding, message actions, and attachment downloads.
- Text-only message rendering; HTML email is never inserted as markup.
- File downloads accept a small allow-list of file types, verify signatures/content and size, and always download as attachments.
- Compose supports up to 10 allowed file types and 3 MB total. This cap avoids the larger base64 request body exceeding common serverless request limits.
- Idempotency records prevent blindly repeating a send. An inconclusive Gmail response is marked unknown and must be checked in Sent before retrying.
- Admin-gated APIs, same-origin checks for mutations, database-backed send/read/list rate limiting, and metadata-only audit events.

## Required pre-production steps

1. **Google Cloud:** Create/select a project, enable Gmail API, configure the OAuth consent screen and add authorized test users for testing.
2. Create a **Web application** OAuth client. Register the exact redirect URI:
   `https://admin.zerocraft.in/api/studio/email/oauth/callback`
   Add the local callback URI only to a separate local/test client if desired.
3. Configure the consent screen for `https://www.googleapis.com/auth/gmail.modify`. Gmail scopes are sensitive/restricted and approval requirements can include app verification and a security assessment. Confirm current Google policy and any assessment cost before promising production eligibility or zero cost. Do not publish or invite production users until approval is complete.
4. Configure server-only environment variables in the CMS deployment:
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `GOOGLE_OAUTH_REDIRECT_URI`
   - `STUDIO_CREDENTIALS_ENCRYPTION_KEY`
   - Existing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
5. Generate a fresh key locally, then store it only in the CMS server environment. Do not paste it in chat, commit it, expose it as `NEXT_PUBLIC_*`, or use a key from another environment:
   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```
   Keep this key stable and backed up securely. Losing or rotating it without a planned re-encryption makes the stored refresh token unreadable and requires reconnecting Gmail.
6. Review and apply `packages/supabase/supabase/migrations/20261027180000_studio_gmail_workspace.sql` through the approved Supabase release process. The CMS service role is required for server-only credential and idempotency tables. Do not apply it from this guide or from application startup.
7. Deploy, connect the intended shared Gmail account as a Studio admin, then test read, search, labels, draft save/edit/send, reply threading, attachment download/upload, disconnect, token revocation, and rate limiting using controlled accounts.

The sender is the Google account authorized for the workspace. The implementation never accepts a caller-supplied `From` header and cannot send as `support@zerocraft.in` or `orders@zerocraft.in` unless that address is actually authorized as a Gmail sending identity and independently verified. Existing Gmail SMTP remains configured for other CMS email paths.

## Environment template

See the blank OAuth entries in the repository `.env.example` and `apps/cms/.env.example`. The client secret and encryption key are server-only. Never add either to client code or expose them as `NEXT_PUBLIC_*`.

## DNS and incoming-email checklist

The read-only public DNS check during implementation observed:

- Authoritative nameservers: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`.
- `zerocraft.in`, `store.zerocraft.in`, and `admin.zerocraft.in` resolve to Vercel addresses.
- No apex MX or TXT answer, and no `_dmarc.zerocraft.in` TXT answer, was returned by the checked public resolver.

This does not prove that no unobserved, delegated, cached, or provider-specific records exist. No Cloudflare zone/account was accessed, no DNS zone export was obtained, and no email headers were tested. Cloudflare Email Routing is therefore **not confirmed active**.

Before any DNS change:

1. Export the complete current zone from its authoritative provider and record TTLs, proxies, and verification records.
2. If Cloudflare is not already authoritative, do not switch nameservers until every existing Vercel, website, Store, admin, verification, and mail record has been copied and independently checked.
3. Enable Email Routing in the Cloudflare dashboard and use only the exact MX/TXT destination records it generates. Confirm forwarding and reply behavior with a controlled mailbox.
4. Do not invent SPF, DKIM selector, or DMARC records. Inventory **all** existing outbound sources first. Publish one coherent SPF record, the actual DKIM records from each sender, and a DMARC policy only after alignment and delivered-header checks.
5. Validate SPF, DKIM, and DMARC on an actual delivered message before claiming custom-domain sending works. Cloudflare Email Routing is for inbound forwarding; it does not authenticate outbound Gmail messages.
6. Keep current SMTP settings unchanged until an approved alternative has passed real delivery and header verification.

The exact Cloudflare routing records must come from the target account's dashboard; they are intentionally not fabricated in this repository.

## Validation and rollback

Run:

```powershell
npm run test:gmail-workspace
npm run test:cms-routes
npm run typecheck --workspace=@zerocraft/cms
npm run lint:cms
```

Google/Gmail and Supabase integration tests require an approved OAuth client, a test mailbox, and a test database; static contract checks and TypeScript checks are not a substitute for those live tests.

Rollback the code deployment to the previous CMS release. The migration is additive and does not alter existing email events or SMTP. Disconnect Gmail from the CMS and revoke the OAuth grant in the Google Account security settings. Retain the encryption key until the stored encrypted token is removed or securely backed up. DNS rollback is separate: restore the verified pre-change authoritative zone and nameserver delegation; never remove existing Vercel records as a shortcut.
