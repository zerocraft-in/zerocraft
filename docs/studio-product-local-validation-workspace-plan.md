# Studio Product Local Validation Workspace Plan

Plan date: 2026-10-16  
Source repository: `D:\projects\zerocraft`  
Proposed disposable workspace: `D:\projects\zerocraft-local-validation`  
Scope: planning only; no workspace, stack, database, fixture, or test execution is authorized.

## 1. Executive summary

Use a disposable workspace outside the source repository with two sequential Supabase CLI projects: Scenario A validates Migration 005 without Migration 004, and Scenario B validates compatibility with Migration 004. Each scenario gets its own `config.toml`, migration input, seed file, Docker project namespace, database volume, fixtures, and reports.

The proposed workspace path is currently absent. The source repository already contains the exact local Supabase CLI package at version `2.121.0`, so no second installation is planned. Docker Engine and WSL runtime access remain unverified from the current session. Final status is:

**UNKNOWN — FURTHER VERIFICATION REQUIRED**

## 2. Existing environment verification

- Source repository exists at `D:\projects\zerocraft`.
- Proposed workspace `D:\projects\zerocraft-local-validation` is absent; no metadata conflict was found.
- Docker client is `29.8.2`, context `desktop-linux`, with Docker Desktop CLI `4.95.0`; Docker API access is denied from this session.
- WSL reports version `3.0.3.0`; status and distribution enumeration are access-denied.
- Local package metadata reports Supabase CLI `2.121.0`.
- `supabase/config.toml` is absent from the source repository.
- Existing uncommitted work was preserved.
- No secrets, `.env.local`, remote credentials, or remote project connections were read.

The CLI binary to reuse is the source repository's `node_modules\.bin\supabase.cmd`, resolved to an absolute path before any future invocation. No `npm`, `npx`, installation, or CLI mutating command is authorized here.

## 3. Workspace path safety

The path `D:\projects\zerocraft-local-validation` does not exist at audit time. It must remain uncreated until Gate A approval. Before creation, recheck the exact path using metadata-only inspection. If it exists, do not enumerate private contents, overwrite, delete, or modify it; report the conflict and stop.

The source repository remains read-only for this phase. No source migration, application file, package file, seed, environment file, or remote schema may be changed.

## 4. Proposed folder architecture

```text
D:\projects\zerocraft-local-validation\
  scenario-a\
    supabase\
      config.toml
      migrations\
      seed.sql
  scenario-b\
    supabase\
      config.toml
      migrations\
      seed.sql
  fixtures\
  tests\
  reports\
  manifests\
```

This is a proposed structure only. The two scenario directories are separate CLI projects and must run sequentially unless distinct ports and Docker project namespaces are explicitly verified. Shared top-level fixtures are design inputs only; scenario-specific copies should be used during execution.

## 5. Migration dependency graph

```text
20261013043854_secure_studio_auth_and_commerce.sql
  └─ 202610160001_commerce_foundation.sql
       └─ 202610160002_storage_foundation.sql
            └─ 202610160003_transactional_checkout.sql
                 ├─ 202610160005_studio_product_write_hardening.sql  (Scenario A)
                 └─ 202610160004_checkout_runtime_hardening.sql
                      └─ 202610160005_studio_product_write_hardening.sql (Scenario B)
```

Static inspection identifies public-schema tables, UUID/JSONB fields, foreign keys, RLS policies, Auth references, Storage objects/policies, Studio membership functions, security-definer functions with empty search paths, and explicit grants/revokes. Migration 002 depends on Supabase Storage schemas/functions. Migrations 001–005 depend on the Supabase/Postgres extensions and Auth schemas supplied by the local Supabase stack.

Migration 005 requires products, variants, categories, collections, normalized options, inventory locations/levels, orders/order items, profiles, `is_studio_member()`, RLS, grants, UUID/JSONB support, and transaction semantics. It checks for `store_inventory_reservations` dynamically, so 004 is optional for schema compatibility but required for Scenario B behavior.

No triggers were selected as a required Migration 005 prerequisite by static inspection; future runtime introspection must confirm the installed schema rather than infer it from source text.

## 6. Scenario A migration manifest

The future manifest must contain exactly these five source names in this order:

1. `20261013043854_secure_studio_auth_and_commerce.sql`
2. `202610160001_commerce_foundation.sql`
3. `202610160002_storage_foundation.sql`
4. `202610160003_transactional_checkout.sql`
5. `202610160005_studio_product_write_hardening.sql`

Migration 004 must be absent from the Scenario A input directory and from the applied migration report. The first four files are the baseline and Migration 005 is the target under test.

## 7. Scenario B migration manifest

The future manifest must contain exactly these six source names in this order:

1. `20261013043854_secure_studio_auth_and_commerce.sql`
2. `202610160001_commerce_foundation.sql`
3. `202610160002_storage_foundation.sql`
4. `202610160003_transactional_checkout.sql`
5. `202610160004_checkout_runtime_hardening.sql`
6. `202610160005_studio_product_write_hardening.sql`

Scenario B uses a separate database volume and disposable project. Migration 004 remains local-only, unapproved, and not production-ready.

## 8. Migration copy/hash strategy

At a future approved Gate B:

1. Resolve the source migration directory and enumerate only regular `.sql` files.
2. Copy source files without changing SQL bytes, timestamps being non-authoritative.
3. Record source and destination SHA-256 values in a manifest.
4. Assert the exact expected order and reject unexpected files.
5. Assert Scenario A excludes 004 and Scenario B includes 004 immediately before 005.
6. Fail closed on a missing file, extra file, hash mismatch, duplicate version, or ordering mismatch.

The protected source hashes currently match:

- Migration 004: `456812B85635D5AFEED9F86AA113B0A906CBC1D5DD47A34101415C03C0621EEB`.
- Migration 005: `FE3746FD66E9A112B249D0D6AE0566D68C307CF8FEA931CD9829B6012F00F2BC`.

No files were copied or modified in this phase.

## 9. Supabase config design

The official CLI configuration reference documents `supabase/config.toml` as generated by `supabase init`, with required `project_id`. Future scenario configs should use only fields supported by the pinned CLI and generated-template verification.

Planned field groups:

- `project_id`: unique local names such as `zerocraft-local-scenario-a` and `zerocraft-local-scenario-b`; never the remote project ID.
- `api.enabled`, `api.port`, and `api.schemas`: loopback API exposure and required public/auth schemas.
- `db.port`, `db.shadow_port`, `db.major_version`, and optional pooler fields: scenario-specific database endpoints; exact free ports must be checked immediately before startup.
- `db.migrations.schema_paths`: scenario migration input; use the CLI-supported path form verified for `2.121.0`.
- `db.seed.enabled` and `db.seed.sql_paths`: scenario-specific synthetic seed only; do not point at production or the source repository's seed without explicit review.
- `studio.enabled`, `studio.port`, and `studio.api_url`: local Studio only.
- `auth.enabled`, `auth.site_url`, and exact local redirect allow-list fields: local Auth simulation only.
- `storage.enabled` and documented bucket settings: local-only Storage policies; no remote objects.
- `realtime.enabled`: enable only if a test requires it.
- `inbucket.enabled`, `inbucket.port`, `inbucket.smtp_port`, and `inbucket.pop3_port`: local email capture, never external email.

The exact generated config and supported defaults must be captured after Gate A/B approval. Do not invent keys, disable required Supabase services without testing, or write config files during this phase.

Source: [Supabase CLI configuration reference](https://supabase.com/docs/guides/local-development/cli/config).

## 10. CLI invocation strategy

Invoke the exact binary from an approved disposable workspace using an absolute path to the source repository's local wrapper:

```powershell
& 'D:\projects\zerocraft\node_modules\.bin\supabase.cmd' --project-ref zerocraft-local-scenario-a <approved-command>
```

The wrapper can be invoked from another working directory, but every command must set the disposable project directory as its working directory and pass only local paths. `supabase init`, `start`, `stop`, `db reset`, `db push`, `migration up`, `link`, and `login` are prohibited in this phase.

## 11. Docker resource requirements

The planned operator baseline is 16 GB installed RAM, Docker Desktop WSL2 backend, and Docker data on D:. Before startup, capture Docker client/server versions, context, `docker info`, disk usage, and available disk. Do not infer server readiness from the client version.

Expected resource needs include the Supabase service images, PostgreSQL data volumes, Auth, API, Studio, Storage, Realtime, Inbucket, gateway, and supporting services. Exact image sizes and startup time must be measured only after Gate C approval; no image estimate is treated as verified here. C: free space, D: free space, WSL distribution state, Resource Saver state, and physical VHDX placement remain blockers/unknowns.

## 12. Port isolation

Run scenarios sequentially by default. Recheck all listeners immediately before startup. Candidate service families include API, PostgreSQL, Studio, Inbucket HTTP/SMTP/POP3, Auth, Storage, Realtime, and any configured pooler or analytics ports. Use only ports from the generated CLI configuration and loopback-only exposure.

Simultaneous execution requires explicit verification of every port, separate Docker project namespaces, separate volume names, separate project IDs, and separate report directories. No port reservation or binding is authorized now.

## 13. Synthetic fixture specification

Fixtures must use deterministic UUIDs and clearly synthetic values:

- One Studio member/admin, one ordinary authenticated user, and one non-Studio authenticated user.
- Categories, collections, size and color option definitions, option values, products, variants, and normalized option JSON.
- Physical and digital products, inventory locations, levels, movements, and zero/positive stock cases.
- Orders and order items for legacy references, plus reservation rows only in Scenario B where 004 creates the ledger.
- INR paise values and legacy USD major-unit compatibility cases.
- Stale and current `write_version` values for optimistic concurrency tests.

No real customer data, production exports, remote Auth users, or remote Storage objects may be used. Fixture design is not fixture creation.

## 14. PostgreSQL test matrix

| Area | Setup and execution | Expected evidence | Failure condition |
|---|---|---|---|
| A. Migration application | Apply the selected manifest to a fresh local database | Applied migration list and schema inventory | Missing, extra, reordered, or failed migration |
| B. Transaction rollback | Submit invalid product/variant/options/inventory payload | No partial rows; SQLSTATE/error captured | Any partial write remains |
| C. Function grants | Inspect owner, security-definer flag, search path, grants | Catalog/grant report | Public/anon exposure or unsafe search path |
| D. Auth/Studio authorization | Exercise Studio, ordinary, and anonymous identities | Identity-scoped results | Non-Studio caller can write |
| E. RLS | Direct table reads/writes across identities | Policy and denial evidence | Cross-user or unauthorized access |
| F. Atomic creation | Create a valid product with variants/options/inventory | Returned IDs/version and row snapshot | Missing or inconsistent related rows |
| G. Atomic editing | Update existing product with preserved variant IDs | Before/after diff | Lost variants, options, or inventory |
| H. Variant normalization | Submit reordered/case/array option values | Canonical JSON/signature | Equivalent input produces divergent representation |
| I. Size/color handling | Create normalized Size and Color options/values | Option/value relation report | Cross-product or duplicate references |
| J. Inventory consistency | Initialize, update, and preserve levels | Location/variant inventory report | Negative, duplicated, or orphaned levels |
| K. Concurrent edits | Two sessions update the same product | Timing, locks, and outcomes | Lost update or deadlock not handled |
| L. `write_version` locking | Submit current and stale versions | Stable conflict SQLSTATE/message | Stale write succeeds |
| M. Reservation-safe archival | Archive a reserved and unreserved variant | Reservation and active-state report | Reserved variant is archived |
| N. INR paise pricing | Valid/invalid INR product and variant prices | Exact integer values | Rounding, overflow, or mismatch |
| O. Legacy USD pricing | Exercise supported major-unit compatibility | Conversion/compatibility evidence | Existing USD behavior regresses |
| P. Invalid input rejection | Unknown keys, malformed UUID/JSON, bad references | Error and rollback artifact | Invalid input commits |
| Q. CMS contract | Compare RPC/API response to existing Studio route expectations | Redacted request/response fixtures | Contract or error-shape break |
| R. Scenario B checkout compatibility | Repeat relevant writes with 004 reservations | Separate compatibility report | 005 conflicts with 004 behavior |

No test is authorized or claimed as passed in this phase.

## 15. Expected evidence artifacts

Future reports should include redacted tool/version manifests, config fingerprints without secrets, migration source/destination hashes, exact migration manifest, applied migration list, schema/function/grant/RLS inventory, synthetic fixture IDs, per-test SQLSTATE and before/after assertions, concurrency timings, port/process ownership, Docker project/volume names, and teardown confirmation.

## 16. Failure handling

Fail closed on path conflicts, checksum mismatches, unexpected files, non-loopback URLs, remote project IDs, unavailable Docker API, port conflicts, missing services, migration order changes, or any command that requests credentials or elevation. Capture the exact error and stop. Do not switch to the source repository, alter migrations, retry with broader commands, or repair unrelated WSL/Docker issues.

## 17. Rollback/cleanup plan

Cleanup is Gate I. Stop only the named scenario's services, preserve reports and manifests, and remove only explicitly resolved disposable containers/volumes. Never use broad prune/reset commands, delete the source repository, remove shared Docker data, or delete an ambiguous path. Database rollback evidence belongs to the disposable database and must not be simulated by rewriting migration files.

## 18. Approval gate matrix

| Gate | Action | Separate approval |
|---|---|---|
| A | Create `D:\projects\zerocraft-local-validation` | Required |
| B | Copy migrations and write scenario configs | Required |
| C | Download Docker images | Required |
| D | Start local containers | Required |
| E | Create local PostgreSQL databases/volumes | Required |
| F | Execute SQL and migrations | Required |
| G | Load synthetic fixtures | Required |
| H | Run PostgreSQL runtime tests | Required |
| I | Stop/remove scoped containers and volumes | Required |
| J | Any remote Supabase operation | Prohibited by this plan |

This planning request authorizes none of these gates.

## 19. Remaining blockers

- Docker Engine API access is denied in the current session.
- WSL status and distribution enumeration are denied.
- Current free-space values and Docker VHDX placement need fresh verification.
- `supabase/config.toml` must be generated only in the disposable scenarios after approval.
- The exact CLI-generated config template for version `2.121.0` must be captured before selecting version-sensitive defaults.
- No runtime migration, SQL, fixture, Auth, Storage, concurrency, or CMS test evidence exists.

## 20. Next-phase execution proposal

After explicit Gate A approval, create the workspace and record its metadata. After Gate B approval, generate separate configs and controlled migration copies, verify hashes/order, and write manifests. Obtain separate Gates C–E before Docker startup and database creation. Obtain Gates F–H before SQL, fixtures, migrations, or runtime tests. Use sequential Scenario A then Scenario B execution, preserving separate volumes and reports. Obtain Gate I for scoped teardown. Never request or perform Gate J.

## Integrity and final confirmation

Confirmed during this planning phase:

- Proposed workspace was not created.
- No migrations were copied.
- No configuration was generated.
- No packages were installed and no downloads were initiated.
- No containers or databases were created or started.
- No SQL, fixtures, or runtime tests were executed.
- No remote Supabase access occurred.
- No source code, migration, package, seed, or environment file was modified.
- Migration 004 SHA-256 matches `456812B85635D5AFEED9F86AA113B0A906CBC1D5DD47A34101415C03C0621EEB`.
- Migration 005 SHA-256 matches `FE3746FD66E9A112B249D0D6AE0566D68C307CF8FEA931CD9829B6012F00F2BC`.

`git diff --check` must be run after this document is written.

**FINAL STATUS: UNKNOWN — FURTHER VERIFICATION REQUIRED**
