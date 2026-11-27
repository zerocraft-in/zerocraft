# Environment Variables

Environment variables are split into browser-safe (prefixed `NEXT_PUBLIC_`) and
server-only values. `.env.local` is gitignored and must never be committed.

## Local development

Copy the template and fill in values printed by `supabase start`:

```powershell
Copy-Item .env.example apps\admin\.env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
SUPABASE_SECRET_KEY=<local secret key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Rules

- `.env.local` is gitignored. Never commit it.
- `SUPABASE_SECRET_KEY` must never be prefixed with `NEXT_PUBLIC_`.
- `SUPABASE_SECRET_KEY` is read only in server modules, never imported by a
  client component.
- Local keys are not secrets in the production sense, but they still never go
  into source control.
- Hosted project keys are added in Vercel/environment settings only, after
  explicit approval.

The app currently runs without these variables because Phase 1 has no Supabase
calls. Phase 2 fails fast at startup if they are missing.

## Production and preview variables

| Variable | Visibility | Use |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser | Anonymous/publishable client key |
| `SUPABASE_SECRET_KEY` | Server only | Trusted admin operations that cannot run under RLS |
| `NEXT_PUBLIC_SITE_URL` | Browser | Site URL for redirects and callbacks |

Production and preview must use separate Supabase projects. Preview deployments
must never point at production data.
