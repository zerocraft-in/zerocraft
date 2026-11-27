# Development guide

## Requirements

- Node.js 22 or newer
- npm 11.17.0
- A Supabase project for the app being developed

## Setup

```bash
npm ci
copy .env.example .env.local
npm run dev:store   # http://localhost:3001
npm run dev:cms     # http://localhost:3002
npm run dev:studio  # http://localhost:3003
```

Each app also has an `.env.example`. Copy only the variables needed by that app into its local `.env.local`. Never commit `.env.local` or put a service-role key in a `NEXT_PUBLIC_` variable.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run lint` | Run repository ESLint |
| `npm run test:security` | Run RBAC and Gmail workspace checks |
| `npm run test:cms-routes` | Validate protected CMS route contracts |
| `npm run verify:release` | Run the release quality gate |
| `npm run seed` | Load the canonical commerce seed data |
| `npm run build` | Build all applications sequentially |

## Working conventions

- Read the nearest `AGENTS.md` before changing an app.
- Use server-only boundaries for secrets and privileged Supabase clients.
- Prefer existing route helpers and permission checks over ad-hoc database access.
- Keep migrations forward-only and reversible through a new migration; never edit an applied migration.
- Add or update documentation when a route, environment variable, migration, or operational procedure changes.
