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

The initial read-only public DNS check during implementation observed:

- Authoritative nameservers: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`.
- `zerocraft.in`, `store.zerocraft.in`, and `admin.zerocraft.in` resolve to Vercel addresses.
- No apex MX or TXT answer, and no `_dmarc.zerocraft.in` TXT answer, was returned by the checked public resolver.
- Vercel's authoritative domain inventory shows `zerocraft.in` connected to `zerocraft-studio`, `admin.zerocraft.in` connected to `zerocraft-in`, and `store.zerocraft.in` connected to `zerocraft-store`; the visible apex records are Vercel-managed ALIAS records plus CAA records for `pki.goog`, `sectigo.com`, and `letsencrypt.org`, with no MX/TXT records present.

Those observations predate the Forward Email setup below. Cloudflare account access was subsequently verified, but `zerocraft.in` is not currently using Cloudflare as its authoritative DNS provider: the Cloudflare zone route returned no usable zone page, while the public NS answer still points to Vercel. Forward Email is now verified and the current Vercel DNS records are documented below. Cloudflare Email Routing is therefore **not active for the live domain**.

Before any DNS change:

1. Export the complete current zone from its authoritative provider and record TTLs, proxies, and verification records.
2. If Cloudflare is not already authoritative, do not switch nameservers until every existing Vercel, website, Store, admin, verification, and mail record has been copied and independently checked.
3. Enable Email Routing in the Cloudflare dashboard and use only the exact MX/TXT destination records it generates. Confirm forwarding and reply behavior with a controlled mailbox.
4. Do not invent SPF, DKIM selector, or DMARC records. Inventory **all** existing outbound sources first. Publish one coherent SPF record, the actual DKIM records from each sender, and a DMARC policy only after alignment and delivered-header checks.
5. Validate SPF, DKIM, and DMARC on an actual delivered message before claiming custom-domain sending works. Cloudflare Email Routing is for inbound forwarding; it does not authenticate outbound Gmail messages.
6. Keep current SMTP settings unchanged until an approved alternative has passed real delivery and header verification.

The exact Cloudflare routing records must come from the target account's dashboard; they are intentionally not fabricated in this repository.

### Free provider alternatives

Zoho's free plan is not available for this account/region. The current alternatives are:

- **Forward Email**: established, open-source forwarding with unlimited domains and aliases; its free plan is forwarding-only, while stored mail and custom-domain sending require a paid plan.
- **Cloudflare Email Routing**: established free forwarding, but it requires Cloudflare to be authoritative for the domain. This is not currently compatible with the live Vercel nameservers without a nameserver migration.
- **ImprovMX**: established free forwarding for one domain, up to 25 aliases and 500 forwarded messages/day; SMTP sending is not included in the free plan.

For a trustable free option that works with ZeroCraft's current Vercel-authoritative DNS, **Forward Email is the preferred inbound-forwarding choice**. It can route `@zerocraft.in` addresses to the existing Gmail inbox, but it does not provide a free standalone mailbox or free outbound SMTP. A real mailbox with reliable send/receive and custom-domain authentication should use a paid business provider. Obtain the exact verification/MX records from the provider dashboard, then add them at Vercel DNS only after confirming the destination inbox and routing plan. No provider records are fabricated here.

### Existing Gmail accounts and custom-domain addresses

The existing accounts `in.zerocraft@gmail.com` and `hello.zerocraft@gmail.com` can continue to be used as destination inboxes. A safe forwarding layout would be:

- `in@zerocraft.in` -> `in.zerocraft@gmail.com`
- `hello@zerocraft.in` -> `hello.zerocraft@gmail.com`
- `store@zerocraft.in` -> `in.zerocraft@gmail.com`
- `orders@zerocraft.in` -> `in.zerocraft@gmail.com`

#### Current Forward Email setup

Forward Email has been verified for `zerocraft.in` and the live Vercel DNS zone now contains:

- MX `@` priority `0` -> `mx1.forwardemail.net`
- MX `@` priority `0` -> `mx2.forwardemail.net`
- TXT `@` -> `forward-email=hello.zerocraft@gmail.com`
- TXT `@` -> `forward-email=in:in.zerocraft@gmail.com`
- TXT `@` -> `forward-email=store:in.zerocraft@gmail.com`
- TXT `@` -> `forward-email=orders:in.zerocraft@gmail.com`

These records provide inbound forwarding only. Outbound mail should continue using the existing Gmail accounts unless a separate authenticated sending provider is approved and configured.

On 2026-10-28, the connected Gmail CMS sent controlled test messages to `in@zerocraft.in`, `store@zerocraft.in`, and `orders@zerocraft.in`; all three appeared as **Message sent** and in the Gmail Sent folder. A separate-mailbox verification was then performed in the CMS Gmail workspace: searches for `to:in@zerocraft.in`, `to:store@zerocraft.in`, and `to:orders@zerocraft.in` each returned one delivered message. The free Forward Email plan does not expose delivery logs.

This gives reliable inbound delivery while keeping the current Gmail accounts. It does **not** by itself create a fully authenticated custom-domain sender. For clean outbound sending from `@zerocraft.in` with SPF/DKIM/DMARC alignment, use Google Workspace or another paid SMTP/mailbox provider; Gmail personal accounts cannot natively turn the custom domain into a hosted Gmail mailbox. Keep the current Gmail OAuth connection unchanged until the new routing and sending path has passed a real delivery/header test.

### Cloudflare Email Routing procedure

Cloudflare Email Routing can provide free inbound forwarding, but Cloudflare must be the authoritative DNS provider. The Cloudflare documentation explicitly requires Cloudflare DNS for Email Service and says onboarding generates the required MX/TXT records; use only the values shown in the dashboard.

For this domain, the safe sequence is:

1. Add `zerocraft.in` to the Cloudflare account and select the intended plan. Cloudflare will provide two authoritative nameservers; do not guess or reuse nameservers from another zone.
2. Export and review the complete Vercel zone first. Copy every existing website, Store, admin, certificate, verification, CAA, and any future mail record into Cloudflare. Confirm `zerocraft.in`, `store.zerocraft.in`, and `admin.zerocraft.in` still resolve correctly before changing delegation.
3. At the domain registrar, replace the Vercel nameservers with the exact Cloudflare nameservers. This is an external DNS change and can affect the website and mail if the zone was not copied exactly.
4. In Cloudflare, open **Compute > Email Service > Email Routing > Onboard Domain**. Review the generated MX/TXT records and complete onboarding. Do not fabricate records manually.
5. Add and verify destination addresses: `in.zerocraft@gmail.com` and `hello.zerocraft@gmail.com`.
6. Create routing rules: `in` -> `in.zerocraft@gmail.com` and `hello` -> `hello.zerocraft@gmail.com`.
7. Test each address from a third, unrelated mailbox and confirm delivery, spam handling, and headers. Keep the existing Gmail OAuth and current mail path unchanged until testing passes.

Cloudflare Email Routing is inbound forwarding, not a hosted Gmail mailbox and not a complete outbound sender. Sending from `in@zerocraft.in` or `hello@zerocraft.in` with aligned SPF/DKIM/DMARC still needs a separate mailbox/SMTP provider.

### SMTP for custom-domain sending

SMTP can send application mail as `no-reply@zerocraft.in`, `in@zerocraft.in`, or `hello@zerocraft.in`, but SMTP does not create an inbox or receive mail. Use a reputable SMTP provider, verify the domain, and publish only the provider-generated SPF/DKIM records. For example, Brevo documents a free tier with 300 daily sends and transactional email, while Resend documents SMTP relay and a free tier with a 100-email daily limit; confirm current limits in the provider dashboard before production use.

The CMS should use a server-side SMTP/API integration with a provider credential, never a personal Gmail password. Keep inbound routing separate: Cloudflare Email Routing or another forwarding service can deliver incoming mail to the existing Gmail accounts. Gmail's third-party `Send mail as` support is scheduled to end on the web and mobile apps in January 2027, so do not make that the long-term sending architecture. Google Workspace `Send as` identities are not affected.

### Current ZeroCraft configuration

Brevo is configured as the production outbound SMTP relay for the CMS:

- SMTP host: `smtp-relay.brevo.com`
- SMTP port: `587`
- SMTP security: STARTTLS (`SMTP_SECURE=false`)
- Verified sender: `in@zerocraft.in` (`ZeroCraft Studio`)
- Production Vercel variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`

The Brevo SMTP credential is stored only as a Vercel Production secret. It is not committed to the repository or documented here. The production deployment was redeployed after the variable update. CMS System Health verified the SMTP connection, then the live SMTP test was sent through the CMS delivery page and appeared in the connected Gmail inbox from `in@zerocraft.in` with the subject `ZeroCraft CMS SMTP test`; the delivery log recorded it as `sent`.

Brevo domain authentication is complete for `zerocraft.in` using the provider-generated verification, DKIM, and DMARC records. Keep those DNS records unchanged unless Brevo supplies replacement values.

### Final live validation

On 2026-10-28, a controlled CMS automation notification was sent through the production Brevo SMTP relay to `in.zerocraft@gmail.com`. The connected Gmail workspace received it from `in@zerocraft.in` with the subject `ZeroCraft automation failed: studio-low-stock-alerts`; the CMS automation page also reported `Test alert sent to in.zerocraft@gmail.com`. This validates a real CMS notification workflow, not only the SMTP connection test.

The three Forward Email routes were separately confirmed in the connected Gmail workspace: `in@zerocraft.in`, `store@zerocraft.in`, and `orders@zerocraft.in` each delivered to `in.zerocraft@gmail.com`.

Brevo authentication DNS is present and the delivered message used the verified `in@zerocraft.in` sender. The current private CMS Gmail UI exposes the delivered message's normal headers but does not expose Gmail's raw `Authentication-Results` view, so SPF, DKIM, and DMARC **raw-header alignment is not independently claimed here**. To complete that last verification, open the message in Gmail's full web interface and use **Show original**, then confirm `spf=pass`, `dkim=pass`, and `dmarc=pass` with aligned `zerocraft.in` identities.

The CMS monitoring path is enabled: automation health runs every 15 minutes, failure monitoring and failure emails are enabled for admin and manager roles, the cooldown is 60 minutes, and delivery events are tracked with retry/error status. The automation page currently shows the scheduled low-stock job as healthy. The weekly PDF notification report still has a separate existing failure caused by the production `pdfkit` font-module error; that is unrelated to SMTP delivery and remains a follow-up item.

`hello@zerocraft.in` was not added as a Brevo sender because the current outbound workflow uses the already verified `in@zerocraft.in`; add `hello@zerocraft.in` only when the application must send mail with that exact From address.

### Inbound forwarding currently configured

**Forward Email** remains the inbound forwarding service, with Vercel authoritative DNS. The current routes are:

- `in@zerocraft.in` -> `in.zerocraft@gmail.com`
- `hello@zerocraft.in` -> `hello.zerocraft@gmail.com`
- `store@zerocraft.in` -> `in.zerocraft@gmail.com`
- `orders@zerocraft.in` -> `in.zerocraft@gmail.com`

These routes have been verified in the connected Gmail inboxes. Forward Email provides receiving/forwarding only; Brevo handles application outbound SMTP. The existing Gmail OAuth connection remains unchanged.

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
