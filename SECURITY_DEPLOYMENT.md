# Secure deployment checklist

## Environment variables

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `PLATFORM_SUPABASE_SERVICE_ROLE_KEY`, encryption keys, OAuth secrets, SMTP passwords, R2 credentials, and provider API keys as Vercel **Secret** variables.
- Only URLs and publishable Supabase keys may use `NEXT_PUBLIC_`. Never add a secret, token, password, private key, or service-role key with that prefix.
- Use separate Production and Preview values. Do not commit `.env.local` or any environment-specific file; `.env.example` contains names only.

## Transport and data access

- Production requests with an `x-forwarded-proto: http` header are redirected to HTTPS by `apps/cms/proxy.ts`.
- The CMS emits clickjacking, MIME-sniffing, referrer, permissions, and cross-origin isolation headers from `apps/cms/next.config.ts`.
- Supabase service-role credentials are only read by server-only modules. Public clients use publishable keys and RLS; internal security telemetry is service-role-only.
- In Supabase project settings, restrict database network access to the application/VPN egress ranges when the production topology is known. Keep the Postgres direct connection disabled for public callers.

## Monitoring

`public.security_events` stores redacted authentication and API telemetry. IP addresses are HMAC-hashed, user agents are truncated, and request bodies/cookies/tokens are never stored. Review rate-limit spikes, authentication failures, API errors, and repeated unknown routes regularly.
