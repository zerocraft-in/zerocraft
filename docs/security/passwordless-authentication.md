# Passwordless Authentication — Zerocraft Accounts

**Status:** Implemented. Supabase Auth is used for all authentication with no
password-based flows.

## 1. Overview

Zerocraft Accounts uses passwordless authentication with two genuinely separate
delivery paths, chosen by whether the email belongs to an existing Supabase Auth
user:

| User type | Trigger | Email delivered |
|-----------|---------|-----------------|
| New user | `admin.createUser` + `resend({ type: "signup" })` | Clickable signup confirmation link (`{{ .TokenHash }}`) |
| Existing user | `signInWithOtp({ shouldCreateUser: false })` | Six-digit sign-in code (`{{ .Token }}`) |

Account detection is server-controlled. The client never supplies or influences
the new/existing decision.

## 2. Architecture

```
Login page (email only)
    │
    ▼
startEmailAuth Server Action
    │
    ├── signInWithOtp(shouldCreateUser: false)
    │       │
    │       ├── success (existing account)
    │       │     → Supabase sends Magic Link template ({{ .Token }} only)
    │       │     → /otp page
    │       │     → verifyEmailOtp → verifyOtp({ type: "email" })
    │       │     → Supabase session established
    │       │     → redirect to dashboard/onboarding
    │       │
    │       └── otp_disabled (no account, no email sent)
    │             → admin.auth.admin.createUser({ email_confirm: false })
    │             → supabase.auth.resend({ type: "signup" })
    │             → Supabase sends Confirmation template (signup link)
    │             → /verify page
    │             → user clicks link
    │             → /callback verifies token_hash server-side
    │             → Supabase session established
    │             → redirect to onboarding/dashboard
    │
    ▼ (other error)
Generic error message (no account enumeration)
```

### Account detection

`startEmailAuth` calls `supabase.auth.signInWithOtp({ email, shouldCreateUser: false })`:

- If Supabase accepts the request, the account exists and a sign-in email has
  already been sent → `/otp`.
- If Supabase returns `otp_disabled` / "Signups not allowed for otp", no account
  exists and no email was sent → new-user signup flow.
- Any other error (rate limit, SMTP failure) → fail closed with a generic
  message.

This avoids the paginated Admin API `listUsers()`, which would miss users
beyond the first page and incorrectly route them to the new-user flow.

OAuth-only users (Google/Apple) exist in `auth.users` and are found by
`signInWithOtp`, so they are correctly classified as existing users and receive
the six-digit code — never accidentally classified as new.

### New user flow (signup confirmation link)

1. `signInWithOtp({ shouldCreateUser: false })` → `otp_disabled` (no account)
2. `admin.auth.admin.createUser({ email, email_confirm: false })` creates the
   unconfirmed account. A duplicate returns `email_exists`; that race is routed
   to the existing-user code flow.
3. `supabase.auth.resend({ type: "signup" })` sends the **Confirmation** email
   template, which contains a clickable signup link built from
   `{{ .TokenHash }}`.
4. User clicks the link → `/callback?token_hash=...&type=signup` →
   `verifyOtp({ token_hash, type: "signup" })` → session established →
   onboarding.

If the confirmation email cannot be sent, the just-created unconfirmed account
is deleted so the next attempt starts clean.

### Existing user flow (six-digit code)

1. `signInWithOtp({ shouldCreateUser: false })` succeeds → the **Magic Link**
   template (configured with `{{ .Token }}` only) is sent
2. User enters the 6 digits on `/otp`
3. `verifyEmailOtp` calls `verifyOtp({ email, token, type: "email" })` →
   session established
4. Redirect to dashboard or onboarding if membership incomplete

### Unconfirmed accounts

An account that was created but never confirmed is still an `auth.users` row.
Supabase Auth sends the **Confirmation** template (not the Magic Link template)
when `signInWithOtp` is called for an unconfirmed account. The `/otp` screen
therefore includes a short note: if the email contains a confirmation button
instead of a code, opening that link finishes signup. The link is handled by
`/callback` exactly like the new-user link.

## 3. Why two templates are required

Supabase chooses the email template from the **mail action** that was
triggered, not from a flag inside the template. A single Magic Link template
containing both `{{ .ConfirmationURL }}` and `{{ .Token }}` does not produce two
different emails by account status — it produces one email containing both
formats for every recipient. The official template reference states that
`{{ .Token }}` is used **instead of** `{{ .ConfirmationURL }}`, not alongside it.

The supported split is:

| Flow | Trigger | Template |
|------|---------|----------|
| New account | `resend({ type: "signup" })` | **Confirm signup** (`confirmation`) |
| Existing account | `signInWithOtp()` | **Magic Link** (`magic_link`) |

The two templates are configured separately and never share content. The
existing-user template contains no link; the new-user template contains no
six-digit code.

Local templates live in `infrastructure/supabase/templates/` and are wired in
`infrastructure/supabase/config.toml`. Hosted projects must use the same two
templates in the Supabase Dashboard.

## 4. Server actions

All in `apps/accounts/src/lib/auth/actions.ts`:

| Action | Purpose |
|--------|---------|
| `startEmailAuth` | Email-first entry point. Detects new vs existing, then sends the sign-in code or the signup confirmation link. |
| `verifyEmailOtp` | Verifies a 6-digit OTP via `verifyOtp({ email, token, type: "email" })` and establishes the session. |
| `resendOtp` | Resends a 6-digit code to an existing user. |
| `startOAuth` | Google / Apple OAuth (preserved, unchanged). |
| `signupWithEmail` | Legacy signup action (retained, not called by login form). |
| `resendVerification` | Resends the signup confirmation link (used by the verify page). |

Removed: `loginWithPassword`, `requestPasswordReset`, `updatePassword`.

## 5. Routes

| Route | Purpose |
|-------|---------|
| `/login` | Email entry point. Server component renders `LoginForm`. |
| `/otp` | Existing-user 6-digit code verification. Server component + client `OtpForm`. |
| `/verify` | New-user signup confirmation screen. Server component + `ResendForm`. |
| `/callback` | Supabase auth callback. Exchanges PKCE code / verifies `token_hash`. Establishes session. |
| `/logout` | Clears session, redirects to `/login?logged_out=1`. |

## 6. Redirect and onboarding logic

After successful authentication:

- **New user** (confirmation link): `/callback` → email confirmed → `/onboarding` (admin app) → dashboard.
- **Existing user** (code): `verifyEmailOtp` → session established → check organization membership → dashboard if member exists, `/onboarding` if not.
- **Already authenticated**: redirected away from `/login` to `"/"`.

The `next` parameter is validated via `resolvePostAuthDestination()` from
`@zerocraft/auth-core`, which only allows same-origin relative paths or absolute
URLs on the configured accounts/admin origins. External URLs are rejected.

## 7. Supabase configuration

### Local configuration (`infrastructure/supabase/config.toml`)

```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = [
  "http://localhost:3000/auth/callback",
  "http://127.0.0.1:3000/auth/callback",
  "http://localhost:3001/callback",
  "http://127.0.0.1:3001/callback",
]
enable_signup = true

[auth.rate_limit]
email_sent = 2
token_verifications = 30
sign_in_sign_ups = 30

[auth.email]
enabled = true
double_confirm_changes = true
enable_confirmations = true
secure_password_change = false
otp_length = 6
otp_expiry = 3600
max_frequency = "1s"

[auth.email.template.confirmation]
subject = "Confirm your Zerocraft email address"
content_path = "./supabase/templates/confirmation.html"

[auth.email.template.magic_link]
subject = "Your Zerocraft sign-in code"
content_path = "./supabase/templates/magic_link.html"
```

### Required redirect URLs (Supabase Dashboard)

Add these to **Authentication > URL Configuration**:

```
http://localhost:3001/callback
https://<production-accounts-domain>/callback
```

`/verify`, `/otp`, and `/login` are application routes, not Supabase redirect
URLs; they do not belong in the allow list.

### Email templates

Two templates, never combined:

**Confirm signup** (`confirmation`) — new accounts only. Contains a clickable
link to the accounts callback:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup">
  Confirm email address
</a>
```

`startEmailAuth` always supplies an `emailRedirectTo` that already has a query
string (`?next=...`), so `&token_hash=` is appended correctly. `/callback`
verifies the hash server-side with `verifyOtp({ token_hash, type: "signup" })`.

**Magic Link** (`magic_link`) — existing accounts only. Contains the six-digit
code and no URL:

```html
<p>{{ .Token }}</p>
```

## 8. Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable (anon) key |
| `SUPABASE_SECRET_KEY` | Yes (server only) | Service-role key for admin account creation and rollback |
| `AUTH_HANDOFF_SECRET` | Yes | Cross-subdomain handoff secret (32+ bytes) |
| `AUTH_CALLBACK_URL` | Optional | Explicit callback URL override |
| `NEXT_PUBLIC_ACCOUNTS_URL` | Yes | Accounts app origin |
| `NEXT_PUBLIC_ADMIN_URL` | Yes | Admin app origin |
| `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED` | Optional | `"true"` to show Google OAuth button |
| `NEXT_PUBLIC_AUTH_APPLE_ENABLED` | Optional | `"true"` to show Apple OAuth button |

Never commit real values. See `.env.example`.

## 9. Rate limiting

Applied server-side in `startEmailAuth`, `verifyEmailOtp`, `resendOtp`, and
`resendVerification`:

| Scope | Max | Window | Min interval |
|-------|-----|--------|--------------|
| `emailSend` | 5 | 15 min | 60 s |
| `signup` | 5 | 60 min | 30 s |

Supabase Auth also enforces its own limits (`email_sent = 2`,
`token_verifications = 30`) which are authoritative in multi-instance
deployments.

The resend cooldown is 30 seconds, displayed as a countdown on the OTP screen.

## 10. Security

- **No service-role key in browser**: `SUPABASE_SECRET_KEY` is `server-only` and never imported by client components.
- **No client-trusted account type**: The new/existing decision is made entirely by `startEmailAuth` using Supabase Auth.
- **No OTP logging**: OTP values and confirmation tokens are never logged.
- **Generic error messages**: `classifySupabaseAuthError` maps provider errors to stable codes without leaking whether an account exists.
- **Redirect validation**: `next` parameters are validated via `safeRedirectPath()` and `resolvePostAuthDestination()`.
- **Rate limiting**: Applied per IP + email before any Supabase call.
- **Duplicate prevention**: New-user creation uses `admin.createUser`; an `email_exists` race is routed to the existing-user code flow instead of creating a second account.
- **Rollback**: If confirmation delivery fails, the unconfirmed account is deleted so a retry starts clean.
- **RLS preserved**: No database permissions are weakened.

## 11. Local development testing with Mailpit

Both flows can be tested locally using the Supabase local stack and Mailpit.

### Test A — Existing user (six-digit code)

1. Ensure `ivd.maran@gmail.com` exists as a confirmed Supabase Auth user.
2. Open `http://localhost:3001/login`.
3. Enter `ivd.maran@gmail.com`, click "Continue with email".
4. Check Mailpit at `http://localhost:54324` — the email subject is
   "Your Zerocraft sign-in code" and the body contains a 6-digit code and no URL.
5. Enter the 6 digits on the OTP screen.
6. Verify success → session established → redirect to dashboard/onboarding.

### Test B — New user (confirmation link)

1. Use a genuinely new email address.
2. Open `http://localhost:3001/login`.
3. Enter the email, click "Continue with email".
4. Check Mailpit — the email subject is "Confirm your Zerocraft email address"
   and the body contains a clickable `/callback?...&token_hash=...&type=signup`
   link and no 6-digit code.
5. Click the link → `/callback` establishes session → redirect to onboarding.

## 12. Files changed

| File | Action | Description |
|------|--------|-------------|
| `apps/accounts/src/lib/auth/actions.ts` | Modified | `startEmailAuth` detects existing accounts with `signInWithOtp({ shouldCreateUser: false })`. New accounts use `admin.createUser` + `resend({ type: "signup" })`. Existing accounts receive the six-digit code template. Added rollback on delivery failure. |
| `infrastructure/supabase/config.toml` | Modified | Added `confirmation` and `magic_link` template entries; added the accounts `/callback` redirect URLs. |
| `infrastructure/supabase/templates/confirmation.html` | Created | New-account signup confirmation email with a `token_hash` link. |
| `infrastructure/supabase/templates/magic_link.html` | Created | Existing-account email containing only the six-digit code. |
| `apps/accounts/src/lib/auth/actions.test.ts` | Modified | Tests for the two-template split, race handling, rollback, and resend routing. |
| `apps/accounts/src/app/(auth)/login/login-form.tsx` | Modified | Routes existing users to `/otp`, new users to `/verify`. |
| `apps/accounts/src/app/(auth)/otp/page.tsx` | Modified | OTP screen plus fallback note for unconfirmed accounts. |
| `apps/accounts/src/app/(auth)/verify/page.tsx` | Modified | Signup confirmation screen copy. |
| `apps/accounts/src/app/(auth)/verify/resend-form.tsx` | Modified | Resend copy refers to the confirmation link. |
| `packages/auth-core/src/email.ts` | Modified | Added `signup_disabled` code and `otp_disabled` mapping for missing accounts. |
| `packages/auth-core/src/email.test.ts` | Modified | Tests for the new classification. |

## 13. Remaining manual configuration

1. **Supabase Dashboard email templates**: Create the same two templates
   (Confirm signup and Magic Link) with the content above. Do not add
   `{{ .ConfirmationURL }}` to the Magic Link template and do not add
   `{{ .Token }}` to the Confirm signup template.

2. **Supabase Dashboard redirect URLs**: Add `http://localhost:3001/callback`
   and the production accounts callback URL to the allowed redirect URLs.

3. **Production `site_url`**: Update `config.toml` `site_url` to match the
   production accounts domain.

4. **OAuth providers**: Google and Apple are disabled by default
   (`NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=false`,
   `NEXT_PUBLIC_AUTH_APPLE_ENABLED=false`). Enable in `.env.local` and configure
   provider credentials in Supabase Dashboard before enabling buttons.
