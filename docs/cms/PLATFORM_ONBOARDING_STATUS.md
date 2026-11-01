# Platform onboarding implementation

Updated November 1, 2026.

## Available

- `/owner/login`: central platform email authentication (separate from tenant customer/staff sessions).
- `/owner/callback`: PKCE email sign-in callback; fixed local destination.
- `/stores`: owner-accessible stores only; links act as the store switcher.
- `/stores/new`: creates a store, owner membership, and six setup steps atomically through `create_store`.
- `/store/{store_id}/setup`: persisted setup status, feature selection, Supabase authorization/project listing, and R2 verification form.
- Supabase OAuth: random state hashed at rest, PKCE verifier encrypted with store-bound AAD, session/member checks, atomic one-time consumption, encrypted grants and refresh tokens. Provider secrets never returned to the browser.
- Existing R2 bucket: server-side upload/read/delete proof, encrypted per-store credentials, `stores/{store_id}` object prefix, Media Manager installation record. No global bucket credentials exposed to store owners.
- Central routes refresh central auth cookies and are marked private/no-store. Legacy tenant routes continue using their existing authentication until path-scoped tenant access is implemented.

## Environment

Use `apps/cms/.env.local`. See its tracked `.env.example` for variable names. Keep service keys, encryption keys, and OAuth client secrets server-only.

Register the exact Supabase OAuth redirect URI:
`http://localhost:3002/api/platform/oauth/supabase/callback`

Allow the owner email-login redirect in the central Supabase Auth settings:
`http://localhost:3002/owner/callback`

Production uses the HTTPS `PLATFORM_ORIGIN` and matching provider redirect allowlists.

R2 S3 access keys are runtime storage credentials, distinct from Cloudflare OAuth app credentials.

## Verification

- CMS `next typegen && tsc --noEmit`.
- HTTP: owner login 200; unauthenticated stores request redirects to owner login; platform identity API returns 401.
- Browser: owner login renders with shared ZeroCraft UI components. Corrected the shared Tailwind source path.
- Live central database rollback-only test: owner store creation, six steps, owner visibility, nonmember isolation, denial of token reads and membership updates. No test store retained.
- Configured R2: unique temporary object uploaded, read back, and deleted successfully.
- Advisor findings: server-only OAuth tables intentionally have RLS without client policies; authenticated `create_store` is intentionally SECURITY DEFINER with explicit identity/account checks and atomic ownership creation. Leaked-password protection remains disabled in the existing project; passwordless owner login is used here.

## Still required

- Supabase OAuth client ID/secret in local environment, followed by real owner authorization.
- Select and bind a tenant project; fresh-schema installer, retryable provisioning jobs, starter catalog.
- Path-scoped tenant data/API authorization and tenant actor mapping; current UUID dashboard remains gated by setup.
- Cloudflare OAuth flow (manual existing-bucket connection is implemented).
- Enable Content/Files through the verified tenant connection, final server-side launch verification, and dashboard integration.

The wizard does not mark database/catalog/review ready or hide itself while these checks are incomplete. OAuth and full owner sign-in have not been verified end-to-end without provider configuration/user sign-in.
