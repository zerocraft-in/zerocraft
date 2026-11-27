# Testing and Quality

## Test tools

- **Vitest** — unit tests (currently the money module, 19 test cases)
- **Playwright** — E2E tests (6-test smoke suite, desktop and mobile projects)

## Running tests

```powershell
pnpm test           # Vitest unit tests
pnpm test:e2e       # Playwright E2E tests
```

Playwright Chromium is installed on this machine. Any new machine needs
`pnpm exec playwright install chromium` first.

## Typecheck and lint

```powershell
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint
```

## Build

```powershell
pnpm build          # Next.js production build (webpack mode)
```

## Verification log

Actual commands run during Phase 1:

```
pnpm --filter @zerocraft/admin typecheck   → passed
pnpm --filter @zerocraft/admin lint        → passed
pnpm --filter @zerocraft/admin test        → 19 tests passed
pnpm --filter @zerocraft/admin build       → compiled, static pages generated
playwright test                              → 6 passed (desktop + mobile)
```

## Test rules

- A test suite that has not been executed must not be reported as passing.
- Run all four checks (`typecheck`, `lint`, `test`, `build`) before considering
  a change complete.
- Playwright screenshots captured at 1440px (desktop) and 390px (mobile) per
  `AGENTS.md`.

## Database tests (planned)

Phase 2 adds RLS/pgTAP test suites under `supabase/tests/phase2/`. These have
not been executed against a real database because Docker Desktop is unavailable.
Until they run successfully, the security status remains unverified.
