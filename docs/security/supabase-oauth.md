# Supabase OAuth Integration

## Overview

Zerocraft Studio uses the official Supabase OAuth2 authorization-code grant to
let organization owners connect their customer-owned Supabase accounts. The
tenant-provisioner Worker acts as the OAuth client; the admin app never talks
to Supabase OAuth endpoints directly.

## Endpoints (verified)

| Endpoint | URL |
|---|---|
| Authorize | `https://api.supabase.com/v1/oauth/authorize` |
| Token | `POST https://api.supabase.com/v1/oauth/token` |

Scopes requested: `organizations:read`, `projects:write`, `database:write`.

## Flow

1. **Start** — Admin server calls `POST /oauth/start` on the Worker with the
   user's access token, organization ID, and return URL. The Worker verifies
   ownership via `current_user_is_org_owner`, generates a state + PKCE pair,
   stores the encrypted PKCE verifier in `supabase_oauth_states`, and returns
   an authorize URL.
2. **Authorize** — The browser is redirected to Supabase's authorize endpoint
   with `state`, `code_challenge` (S256), and required scopes.
3. **Callback** — Supabase redirects back to `/api/oauth/supabase/callback`
   with `?code` and `?state`. The Worker exchanges the code for tokens using
   the stored PKCE verifier, then fetches the user's Supabase organizations.
4. **Pending** — If multiple organizations are granted, tokens and org list are
   stored in `supabase_oauth_pending` (encrypted, 15-minute TTL). The user
   selects one.
5. **Finalize** — The selected connection is written to `supabase_connections`
   and `supabase_oauth_tokens` (AES-256-GCM encrypted). The state row is
   consumed and deleted.

## Security Properties

- **State/CSRF**: State is a 32-byte random token, SHA-256 hashed before
  storage. Single-use, expired after 10 minutes.
- **PKCE**: S256 code challenge. Verifier encrypted and stored server-side,
  never in the browser.
- **Token encryption**: AES-256-GCM with a 32-byte base64 key
  (`OAUTH_TOKEN_ENCRYPTION_KEY`). Key ID stored alongside ciphertext for
  rotation. Plaintext tokens never touch the Platform DB or logs.
- **Token storage**: `supabase_oauth_tokens` is service-role only — no client
  policy, no client grant.
- **No token logging**: Error messages redact JWTs (`eyJ...`) and Supabase
  tokens (`sbp_...`).
- **Return URL validation**: OAuth return targets must be HTTPS and on the
  admin origin or an explicitly allowlisted origin. Prevents open redirects.
- **Refresh/revocation**: Expired access tokens are refreshed via the refresh
  token. Refresh failures (401/403) mark the connection as `needs_reauth` and
  the job as `NEEDS_REAUTHORIZATION`.

## Reauthorization

When a connection's access token cannot be refreshed:

1. `supabase_connections.connection_status` is set to `needs_reauth`.
2. In-flight provisioning jobs finish with status `NEEDS_REAUTHORIZATION`.
3. The owner must restart the OAuth flow to reconnect.

## Files

- `workers/tenant-provisioner/src/oauth.ts` — OAuth client (authorize URL, code exchange, refresh)
- `workers/tenant-provisioner/src/crypto.ts` — AES-256-GCM encryption, PKCE, state hashing
- `workers/tenant-provisioner/src/provisioning.ts` — Token persist/refresh, connection finalization
- `workers/tenant-provisioner/src/index.ts` — OAuth start/callback/pending/finalize HTTP handlers
- `infrastructure/supabase/migrations/20261125090000_platform_tenant_provisioning.sql` — `supabase_connections`,
  `supabase_oauth_tokens`, `supabase_oauth_states`, `supabase_oauth_pending` tables
- `apps/admin/src/lib/provisioner.ts` — Admin-side OAuth client wrappers
- `apps/admin/src/app/api/onboarding/oauth/start/route.ts` — OAuth start route
- `apps/admin/src/app/api/onboarding/oauth/finalize/route.ts` — OAuth finalize route
- `apps/admin/src/app/api/oauth/supabase/callback/route.ts` — OAuth callback route

## Environment Variables

| Variable | Purpose |
|---|---|
| `SUPABASE_OAUTH_CLIENT_ID` | Supabase OAuth app client ID |
| `SUPABASE_OAUTH_CLIENT_SECRET` | Supabase OAuth app client secret |
| `SUPABASE_OAUTH_REDIRECT_URI` | Redirect URI registered in Supabase |
| `SUPABASE_OAUTH_AUTHORIZE_URL` | Override for authorize endpoint |
| `SUPABASE_OAUTH_TOKEN_URL` | Override for token endpoint |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Base64-encoded 32-byte AES key |
| `OAUTH_ENCRYPTION_KEY_ID` | Key version identifier |
