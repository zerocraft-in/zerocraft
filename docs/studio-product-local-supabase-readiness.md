# Studio Product Local Supabase Readiness

Audit date: 2026-10-16  
Repository: `D:\projects\zerocraft`  
Scope: read-only preparation for future PostgreSQL validation of Migration 005.

## 1. Executive summary

The repository is not ready to start a local Supabase stack. Docker Desktop's client is present, but the Docker Engine API is inaccessible from this session. WSL distribution enumeration is also access-denied, and `supabase/config.toml` is missing. No local database, container, SQL session, migration, or remote Supabase operation was started or executed.

The project already declares the Supabase CLI as a dev dependency at version `2.121.0`, with a matching local package and lockfile entry. The recommended future installation strategy is therefore a pinned project-local npm installation, subject to separate approval. The current final status is:

**UNKNOWN — FURTHER VERIFICATION REQUIRED**

## 2. Windows and WSL2 status

- WSL reports version `3.0.3.0` and kernel `6.18.54.1`, but `wsl --status` and `wsl --list --verbose` returned access-denied errors in this session.
- WSL distribution state, default WSL version, and Docker-managed distributions could not be confirmed.
- No administrator action, Windows feature change, or restart was requested.
- Prior repository documentation records WSL installation as incomplete and Windows feature inspection as permission-blocked. That remains the planning baseline.

## 3. Docker verification

Observed:

- Docker client: `29.8.2`, Windows AMD64.
- Docker context: `desktop-linux`.
- Docker Desktop CLI plugin: `4.95.0`.
- Docker server/API, containers, images, volumes, networks, and disk usage could not be read because access to `dockerDesktopLinuxEngine` was denied.

This does not prove that Docker is stopped or broken. Resource Saver state and server-side readiness are **UNKNOWN**. No Docker start, pull, run, compose, cleanup, or container mutation was performed.

## 4. D: storage verification

`D:\DockerData\DockerDesktopWSL` exists as a directory. Only directory metadata was inspected; no recursive private-data inspection was performed. The metadata does not prove that Docker's physical VHDX/disk image is stored there, so physical placement is **UNKNOWN**.

The current session could not read C: and D: free-space values through CIM because access was denied. Earlier repository documentation recorded approximately 10.7 GB free on C: and 298.3 GB free on D:. Those values require fresh operator confirmation before installation.

## 5. Supabase CLI discovery

- Global `supabase --version`: command not found.
- `package.json` declares `supabase` at `^2.121.0` in `devDependencies`.
- `package-lock.json` records `supabase` and Windows CLI packages at `2.121.0`.
- `node_modules/.bin/supabase.cmd` exists and the installed package reports version `2.121.0` from its package metadata.
- A direct local CLI invocation reached the CLI but attempted to write telemetry under `C:\Users\maran\.supabase`; the sandbox denied that write. No project, database, or migration command was run.

The CLI is therefore already present locally, but a clean version command should be rechecked in an approved environment with telemetry disabled or a writable user profile.

## 6. Official installation options

The official Supabase CLI guide documents:

1. npm/pnpm/yarn/bun project installation as a dev dependency, run through the project package runner.
2. Windows installation through Scoop:

   `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git`

   `scoop install supabase`

3. A local stack requires a container runtime, documented as Docker Desktop for Windows.

Source: [Supabase CLI installation and local development guide](https://supabase.com/docs/guides/local-development/cli/getting-started).

## 7. Recommended installation method

Use the project-local npm method because it is reproducible through `package.json` and `package-lock.json`, already matches the repository's declared `2.121.0` version, and avoids a machine-global binary.

Future command, only after Gate A approval and only if the dependency needs to be restored:

```powershell
npm install --save-dev supabase@2.121.0
```

Expected effects if run: possible `package.json`, `package-lock.json`, and `node_modules` changes, plus a network download if the package cache is incomplete. No installation was run in this phase. Scoop is an officially supported Windows alternative, but would create machine/user-level state outside the repository.

## 8. Existing Supabase configuration

- `supabase/migrations/` exists and contains the baseline migration plus migrations 001 through 005.
- `supabase/seed.sql` exists.
- `supabase/config.toml` is missing.
- No new Supabase project was initialized.
- `.env.local` was not read or printed.
- The remote project identifier supplied by the request was not used for linking or network access.

The CLI's normal local workflow expects a `supabase` directory with `config.toml`; creating one with `supabase init` must happen only in a separately approved disposable project directory, not implicitly in this phase.

## 9. Migration dependency graph

The required baseline is:

`20261013043854_secure_studio_auth_and_commerce.sql`
→ `202610160001_commerce_foundation.sql`
→ `202610160002_storage_foundation.sql`
→ `202610160003_transactional_checkout.sql`
→ `202610160005_studio_product_write_hardening.sql`

Migration 005 requires the product, variant, category, collection/option, inventory, order, profile, RLS, grant, UUID, JSONB, and authentication foundations supplied by that chain. Migration 005 checks for `store_inventory_reservations` dynamically, so Migration 004 is not a hard schema dependency.

Migration 004 is an optional compatibility branch:

`...003` → `...004` → `...005`

The default migration workflow applies migrations in filename order. Therefore, running it against the repository migration directory would apply 004 before 005. Scenario A must use an isolated migration input or a disposable copy that excludes 004; migration files in this repository must not be renamed or edited.

## 10. Scenario A isolation strategy

Create a separately approved disposable local project directory on D:, with its own `config.toml`, local-only environment values, Docker project/volume namespace, and synthetic fixtures. Apply the baseline through 003, then apply 005 from a controlled copy or explicit migration-selection mechanism that leaves 004 unapplied. Record the applied migration list and assert that 004 is absent.

Use no production data, remote project link, remote credentials, external Auth provider, remote Storage, or non-loopback endpoint. Keep checkout feature gates off.

## 11. Scenario B isolation strategy

Use a second disposable project and separate Docker volume namespace. Apply the baseline through 003, then 004 and 005 in normal order. Treat this strictly as compatibility testing for the reservation-aware path; it does not approve Migration 004 for production and must not share Scenario A data or volumes.

## 12. Port conflict assessment

No listeners were returned for the suggested Supabase ports `54321`, `54322`, `54323`, or `54324` during the read-only check. This is only a point-in-time observation. Recheck immediately before any approved startup, bind loopback-only where supported, and stop if an unexpected process owns a required port. No ports were reserved or bound.

## 13. Local-only security boundaries

- Loopback-only service exposure.
- Dedicated disposable directory and Docker volumes on D:.
- Synthetic users, products, variants, inventory, orders, and reservations only.
- No `.env.local` secrets copied or read into local configuration.
- No remote project linking, login, push, reset, storage, or Auth integration.
- Guard against the known remote project ID and all non-loopback URLs.
- Checkout feature gates remain off.
- Fail closed if the target database URL is not local.

## 14. PostgreSQL runtime test matrix

Future runtime evidence must cover installation/rollback, function ownership and grants, Auth/Studio authorization, RLS, atomic creation/editing, normalized Size/Color variants, inventory consistency, concurrent updates, `write_version` conflicts, reservation-safe archival, INR paise pricing, legacy USD major-unit compatibility, transaction rollback, CMS request/response compatibility, and compatibility with the checkout migration.

No item in this matrix has passed in this phase. Static inspection is not PostgreSQL runtime validation.

## 15. Installation approval requirements

Gate A: install or restore the pinned project-local Supabase CLI.  
Gate B: download required Docker images.  
Gate C: start Docker/Supabase services.  
Gate D: create or reset a local disposable database.  
Gate E: execute SQL or migrations.  
Gate F: stop and remove scoped local containers/volumes.  
Gate G: any remote Supabase operation; this plan authorizes none.

Administrator/UAC actions, Windows feature changes, downloads, and restarts require separate approval even if they are prerequisites for a later gate.

## 16. Local stack startup approval

After Gates A–C are separately approved, startup must occur only in the named disposable project directory, after fresh Docker/API, disk, port, and loopback checks. Do not run `supabase init`, `supabase start`, or `docker compose up` in this repository during this read-only phase.

## 17. SQL execution approval

Applying migrations, loading seed or synthetic fixtures, creating Auth identities, creating Storage objects, running pgTAP or custom SQL, and opening concurrent database sessions all require Gate E approval. Migration 004 and 005 must be selected according to Scenario A or B and the applied migration list must be retained.

## 18. Cleanup and rollback strategy

Stop only the named disposable project, preserve result artifacts, and remove only explicitly resolved disposable containers/volumes after Gate F approval. Do not use broad Docker prune/reset commands, target the repository root, or delete shared user data. Migration rollback evidence must be captured in the disposable database; do not edit or restore repository migration files automatically.

## 19. Remaining blockers

- Docker Engine API access is denied.
- WSL status/distribution enumeration is denied.
- `supabase/config.toml` is missing.
- Current C:/D: free-space measurements are unavailable in this session.
- Docker physical VHDX placement is unverified.
- Resource Saver state is unknown.
- No runtime database exists, so no SQL or migration behavior is validated.

## 20. Next-phase recommendation

First obtain approved operator verification of WSL/Docker readiness, Docker API access, disk capacity, and the intended disposable D: location. Then request Gate A approval for the already-pinned project-local CLI if restoration is necessary. Keep stack startup, image downloads, database creation, SQL/migration execution, and cleanup as separate approvals.

## Integrity and zero-mutation record

Migration 004 SHA-256: `456812B85635D5AFEED9F86AA113B0A906CBC1D5DD47A34101415C03C0621EEB` — matches expected value.

Migration 005 SHA-256: `FE3746FD66E9A112B249D0D6AE0566D68C307CF8FEA931CD9829B6012F00F2BC` — matches expected value.

`git diff --check` must be run after this document is written. Existing worktree changes were preserved. This phase performed no package installation, Docker image download, container/database start, SQL execution, remote Supabase operation, migration edit, CMS runtime change, `.env.local` modification, or checkout feature-gate change.

## Final status

**UNKNOWN — FURTHER VERIFICATION REQUIRED**
