# Commerce Template Migration Policy

## Rules

1. Migrations are numbered, ordered, and immutable once applied.
2. A change is always a **new** file. Never edit an applied migration.
3. Every file is wrapped in `begin; … commit;`.
4. Every migration is idempotent where practical:
   - `create table if not exists`
   - `create or replace function`
   - `drop policy if exists` before `create policy`
5. Every migration and seed has a SHA-256 checksum in `template.config.json`.
6. The provisioning Worker records the same checksum in the Platform DB
   (`tenant_migrations`) before applying the file and verifies it after.
7. A checksum mismatch is a hard stop. It is never "fixed" by re-running.
8. No migration may contain `DROP DATABASE`, `DROP SCHEMA public`, `TRUNCATE`,
   plaintext secrets, JWTs, or database URLs with passwords.

## Versioning

| Segment | Meaning |
| --- | --- |
| MAJOR | Breaking data model change requiring data migration |
| MINOR | Additive tables, columns, indexes, or policies |
| PATCH | Seed or policy correction without schema shape change |

## Adding a migration

```powershell
# 1. Create the next numbered file
templates/commerce/migrations/016_my_change.sql

# 2. Rebuild checksums
node templates/commerce/scripts/build-manifest.mjs 1.1.0

# 3. Verify
node templates/commerce/scripts/verify.mjs
node --test templates/commerce/tests/template.test.mjs
```

## Adding a seed

Seeds must be idempotent. Prefer `insert … on conflict do nothing/update` or a
`create or replace function` that can be re-run safely.

## What the installer records

For every applied file the Worker writes:

- template name and version
- migration version and kind (`migration`, `seed`, `verify`)
- SHA-256 checksum
- target project ref and organization id
- job id, attempt number, and timestamp

The customer project also records applied migrations locally in
`commerce_template_migrations` for DBA auditability. That ledger is never an
authorization source.

## Failure handling

- Any SQL error stops the job with `FAILED`.
- Partial installs are resumable: already-applied files with matching checksums
  are skipped.
- A mismatch requires human review and a new template version; the job does not
  auto-repair.
- The tenant database is only marked `ACTIVE` after
  `schema-verification.sql` and `rls-verification.sql` pass.
