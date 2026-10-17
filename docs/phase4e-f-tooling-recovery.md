# Phase 4E-F — Staging Tooling Recovery and Safety Verification

**Date:** 2026-10-16  
**Original repository:** `D:\projects\zerocraft`  
**Staging worktree:** `D:\projects\zerocraft-staging`  
**Approved staging project:** `leagpvolhukzdaxubmei`  
**Protected production project:** `jamyqssytdzbiiahtmsq`

## Scope and safety result

This was a local, credential-free inspection only. No Supabase project was linked, no database connection was attempted, no SQL was executed, no migration was applied, no Docker command was run, and no production setting was changed.

The original repository’s tracked files and production link metadata were not modified. The staging worktree is intentionally separate and has no active Supabase project metadata or environment credentials.

## Tooling inventory

| Tool | Result | Evidence |
| --- | --- | --- |
| Node.js | Available: `v24.19.0` | `node --version` |
| npm | Available: `11.17.0` | `npm.cmd --version` |
| Supabase CLI package | Available locally: `2.121.0` | `node_modules/supabase/package.json` |
| Supabase CLI global command | Not found | `Get-Command supabase` |
| PostgreSQL `psql` on PATH | Not found | `Get-Command psql`, `where.exe psql` |
| PostgreSQL standard install paths | No `psql.exe` found | Checked Program Files PostgreSQL/EDB/Supabase locations |

The staging worktree does not contain `node_modules`; the CLI was therefore invoked from the original repository’s already-installed local package while the current working directory was the staging worktree. This did not read or alter staging or production link metadata.

## Supabase CLI telemetry failure

### Root cause

The CLI attempted to update its user-level telemetry state and failed before command execution:

```text
FileSystem.writeFile (C:\Users\maran\.supabase\telemetry.json.tmp.<uuid>)
EPERM: operation not permitted, open 'C:\Users\maran\.supabase\telemetry.json.tmp.<uuid>'
```

The existing telemetry state file is:

```text
C:\Users\maran\.supabase\telemetry.json
```

The exact failing path is the temporary sibling file under `C:\Users\maran\.supabase`; the UUID is generated per invocation. The failure is a local filesystem permission/locking problem, not a Supabase authentication or database error. The CLI stopped before any remote operation.

The telemetry file contains CLI analytics state only. Its contents were not included in this report.

### Supported recovery procedure

Supabase documents these supported opt-out mechanisms:

1. Set `SUPABASE_TELEMETRY_DISABLED=1` for the shell or CI command.
2. `DO_NOT_TRACK=1` is also supported as a broader opt-out signal.
3. An operator may use the CLI’s telemetry command after the local filesystem issue is resolved; that command was not used here because the current repository is production-linked.

The verified credential-free command pattern is:

```powershell
$env:SUPABASE_TELEMETRY_DISABLED = '1'
& 'D:\projects\zerocraft\node_modules\.bin\supabase.cmd' --version
& 'D:\projects\zerocraft\node_modules\.bin\supabase.cmd' migration --help
& 'D:\projects\zerocraft\node_modules\.bin\supabase.cmd' migration list --help
```

These commands returned CLI version `2.121.0` and help text successfully while run with the staging worktree as the current directory. They do not connect to a database. The `migration list --help` command was used only for help output; `--linked`, `--db-url`, `--project-ref`, and password arguments were not supplied.

Do not grant broad permissions to `C:\Users\maran\.supabase`, run the CLI elevated, disable Windows security controls, or copy production metadata into staging. If the telemetry override is unsuitable for an approved operator workflow, the filesystem owner should repair the user-writable directory or configure the CLI’s supported user-state location according to the installed CLI documentation. No unsupported configuration override was invented or applied here.

## PostgreSQL client availability

`psql` is unavailable both on PATH and in the standard locations checked:

- `C:\Program Files\PostgreSQL`
- `C:\Program Files (x86)\PostgreSQL`
- `C:\Program Files\EDB\PostgreSQL`
- `C:\Program Files\Supabase`

No installation was attempted. A trusted future installation method is the official PostgreSQL Windows installer from [postgresql.org](https://www.postgresql.org/download/windows/) or the organization-approved EDB installer. Select the command-line tools, install only to an approved local path, and add the resulting `...\PostgreSQL\<major>\bin` directory to the user or approved development PATH. Verify with `psql --version`. Do not put passwords or connection strings in the repository or shell history.

Docker is not required and was not used.

## Tracked Supabase metadata risk

The original repository tracks these files under `supabase/.temp/`:

```text
cli-latest
gotrue-version
linked-project.json
pooler-url
postgres-version
project-ref
rest-version
storage-migration
storage-version
```

`supabase/.temp/project-ref` contains the protected production reference `jamyqssytdzbiiahtmsq`. `supabase/.temp/project-ref` is not ignored and is tracked by Git. This is a material staging-isolation risk because a fresh worktree can materialize production link metadata even when no environment file is copied.

No cleanup was performed in the original repository. In a separately approved future change, the safe cleanup sequence should be:

1. Add `supabase/.temp/` to `.gitignore`.
2. Review the exact tracked paths and confirm they contain no required source artifacts.
3. Remove only those paths from the Git index with `git rm --cached`, preserving local files where needed.
4. Verify the original worktree’s project reference is not copied into staging, CI artifacts, or deployment bundles.
5. Keep project linking and CLI state outside version control.

That cleanup must be reviewed and executed as a separate change; it was intentionally not run for this task.

## Staging isolation verification

The isolated worktree is `D:\projects\zerocraft-staging` on branch `phase4e-e-staging`, based on the committed `main` history plus only the explicitly transferred Phase 4E artifacts.

Verified absent from staging:

- `.env.local`
- `supabase/.temp/`
- `supabase/config.toml`

The staging worktree contains 11 migration files, including the unapplied `202610160010_checkout_reservation_lifecycle_pending.sql`. The protected production reference may appear in historical/report prose as a documented identifier, but no active staging link metadata or credential file is present.

The original worktree’s `supabase/.temp/` was not changed. The staging worktree’s materialized tracked `.temp` files were removed only from the isolated staging checkout during worktree preparation, so its status intentionally records those files as deleted. No reset, stash, commit, force operation, or production link operation was performed.

## Credential-free checks

Executed from `D:\projects\zerocraft-staging`:

```text
node scripts/security/phase4e-d-static-checks.mjs
=> Phase 4E-D staging preparation static checks: PASS

node scripts/security/phase4e-checkout-lifecycle-tests.mjs
=> Phase 4E-A checkout lifecycle tests: PASS (contract + isolated fixture scenarios)
```

These are static/fixture checks only. They do not prove PostgreSQL runtime behavior, RLS behavior, storage behavior, or production safety.

## Read-only staging connection decision

**NO-GO for remote staging access at this time.**

The approved target is independently recorded as `leagpvolhukzdaxubmei`, but the safe connection gate remains closed because:

1. `psql` is not installed.
2. The Supabase CLI initially failed on its user telemetry write and requires the supported telemetry opt-out or an operator-approved local filesystem repair.
3. The original repository remains production-linked; no remote CLI command may be run from it.
4. The staging worktree has no local CLI config or dependencies of its own, so the operator must choose an isolated, credential-safe installation strategy before connection.

Before a later connection attempt, an operator must verify the target reference is exactly `leagpvolhukzdaxubmei`, use only staging credentials supplied through a secure channel, run from `D:\projects\zerocraft-staging`, and execute only the previously approved read-only verification workflow. Do not run migration, link, push, SQL harness, or production-targeted commands as part of this gate.

## Remaining blockers

- Install or otherwise provide an approved `psql` client.
- Resolve or explicitly opt out of the local Supabase CLI telemetry write using the supported environment override.
- Keep production `.temp` metadata out of the staging checkout and perform the separately approved Git hygiene cleanup later.
- Independently verify the target project identity immediately before any future remote command.

No remote access is authorized by this report.
