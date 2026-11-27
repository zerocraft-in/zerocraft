# Database and migration guide

The database source of truth lives in [`packages/supabase/supabase`](../../packages/supabase/supabase). Do not treat a generated database dump or an old inventory as an upgrade plan.

## Source of truth

- `schema.sql` bootstraps a clean store project.
- `migrations/` contains ordered changes for an existing project.
- `seed.sql` and `store-seed.sql` contain non-production sample data.
- `store-identifier-map.json` documents compatibility identifiers used during the store migration.

## Safe migration workflow

1. Review the SQL and its ownership/RLS policy changes.
2. Run the migration preflight: `node scripts/release/check-migrations.mjs`.
3. Apply with `npx supabase db push --workdir packages/supabase` against the intended project.
4. Run schema, isolation, security and route verification.
5. Record the migration status and deployment SHA in the release evidence.

## Security invariants

- Public application tables have RLS enabled where they contain application data.
- Policies must constrain the authenticated principal and store context.
- Privileged functions must use explicit authorization checks and a narrow `search_path`.
- API handlers repeat ownership checks before reading, updating or deleting records.
- Production data exports and backups stay outside Git and public storage.
