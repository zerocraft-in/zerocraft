# Troubleshooting

## Development issues

| Symptom | Cause / fix |
| --- | --- |
| `pnpm : term not recognized` | Add `%APPDATA%\npm` to `PATH` for the session |
| `Program 'pnpm.exe' failed to run: blocked` | Native pnpm binary blocked by Windows Application Control. Use the npm-installed pnpm 10 through `%APPDATA%\npm` or call the Node entry point directly. |
| `supabase start` fails | Docker Desktop not installed or not running. The local Supabase stack cannot start without Docker. |
| Google font fetch fails during build | `next/font` needs network access on first build. Retry or self-host Manrope. |
| Port 3000 busy | `pnpm dev -- --port 3001` |
| Theme flashes on load | next-themes `suppressHydrationWarning` must stay on `<html>`. |
| Stale route validator errors | `.next/types` can reference routes that were moved or removed. Clean `apps/admin/.next` and regenerate. |

## Supabase issues

| Symptom | Cause / fix |
| --- | --- |
| `supabase start` cannot run | Docker Desktop not installed. Install Docker Desktop (WSL 2 backend) before Phase 2. |
| Migration fails | Never hand-craft timestamps or edit already-applied migrations. Use `supabase migration new <name>`. |
| RLS not verified | No authenticated test database available. RLS design exists in `docs/security/rls-policies.md` but is unproven until tests run against a real database. |

## Build issues

| Symptom | Cause / fix |
| --- | --- |
| TypeScript build fails | Run `pnpm typecheck` first. Do not commit `.next` output. |
| ESLint warnings | Run `pnpm lint`. Do not suppress rules; fix underlying issues. |

## Security issues

- **Vulnerability reporting:** Do not open a public issue. Report privately to
  the project owner (see `SECURITY.md`).
- **Leaked secrets:** Rotate immediately. A leaked service key is treated as a
  full database compromise.
- **Never** include production secrets, customer data, or exploit payloads in
  public channels.

## Getting help

Check the actual source code and configuration files — they are the source of
truth. Documentation describes planned or implemented behavior but is not
authoritative for runtime behavior.
