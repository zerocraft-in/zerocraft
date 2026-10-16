# Studio Product Local Supabase Setup Plan

Phase 2.8B.3H-E. Discovery and installation planning only.

## 1. Executive summary

This Windows environment is not ready for local Supabase validation without prerequisite remediation. Node.js and npm are present, but WSL, Docker Desktop, Docker CLI, Supabase CLI, PostgreSQL binaries, and matching services are absent. No installation, download, service startup, container startup, database creation, SQL execution, or remote mutation was performed.

Recommended result: **PREREQUISITES NEED REMEDIATION**.

## 2. Windows system specifications

- Product: Windows 10 Pro.
- Display version: 26H2; registry build `26300.9711`.
- Architecture: 64-bit OS/process, AMD64.
- CPU: AMD64 Family 25 Model 80 Stepping 0, AuthenticAMD; 12 logical processors.
- Available RAM: approximately 5288 MB from the performance counter.
- Total RAM: unavailable because CIM/system-information queries returned access denied.
- `C:`: 10,685,640,704 free of 126,851,477,504 bytes.
- `D:`: 298,256,203,776 free of 499,184,037,888 bytes.

`systeminfo`, `Win32_ComputerSystem`, and `Win32_Processor` were read-only attempts and returned access denied. No administrator privileges were requested. The Windows product/build combination should be confirmed before installation because Docker’s requirements are version/build specific. See [Docker Desktop Windows requirements](https://docs.docker.com/desktop/setup/install/windows-install/).

## 3. WSL2 readiness

`wsl --status` and `wsl --list --verbose` report that WSL is not installed. No distributions, WSL processes, or WSL services were found. The WSL and Virtual Machine Platform feature states could not be queried without elevation.

Future remediation, requiring separate approval: confirm Windows support, enable WSL and Virtual Machine Platform, reboot if requested, install a supported WSL2 distribution if needed, and verify with `wsl --version`, `wsl --status`, and `wsl --list --verbose`. No existing distribution was modified.

## 4. Virtualization readiness

AMD64 and 12 logical processors are visible, but SLAT, firmware virtualization, and hypervisor presence could not be confirmed because CIM queries were denied. No Hyper-V or virtualization process was observed. An authorized operator must confirm firmware virtualization and organizational policy before installation. BIOS/UEFI changes, Hyper-V enablement, and Windows feature changes are outside this phase.

## 5. Docker readiness

`docker`, `docker-compose`, Docker Desktop standard paths, Docker services, and Docker processes were not found. Existing images/containers cannot be inspected without Docker. No listeners were found on the planned ports.

Recommended future approach: a pinned, per-user Docker Desktop installation using the WSL2 backend after WSL remediation. Docker documents per-user installation as the normal option, while first-time WSL2 enablement requires administrator action. See [Docker permission requirements](https://docs.docker.com/desktop/setup/install/windows-permission-requirements/).

## 6. Supabase CLI readiness

The global `supabase` command is absent, no local CLI dependency was found in package configuration, and `supabase/config.toml` is absent. The migration directory exists under `supabase/migrations/`. Do not use `npm install -g supabase`, an unpinned `npx supabase`, or any CLI command that inherits `.env.local`.

## 7. RAM and disk assessment

Assessment: **compatible with limitations after remediation**. `D:` has adequate space for isolated Docker data; `C:` should not host Docker images or WSL data because only about 10.7 GB is free. Current available RAM is about 5.3 GB, below Docker’s documented 8 GB system-RAM requirement; total RAM is unknown. Confirm total RAM before installation and reserve headroom for Windows, the IDE, Next.js, and Supabase services. If insufficient, defer or use a separately approved isolated alternative.

## 8. Port conflict assessment

No listeners were found on `3000`, `5432`, `5433`, `5434`, `8000`, `8001`, `8080`, `8443`, `54321`, `54322`, `54323`, or `54324`. Future startup must recheck ports, use loopback-only mappings, and fail closed on unexpected ownership. No process was terminated and no port was changed.

## 9. Isolation design

Use a dedicated disposable project directory on `D:`, dedicated Docker volumes, loopback-only URLs, a separate local environment file, synthetic identities/data, and a guard rejecting the remote project ID `jamyqssytdzbiiahtmsq` and all non-loopback URLs. Never source `.env.local`, reuse existing volumes, or connect the local CLI to the remote project.

## 10. Migration dependency plan

Scenario A applies the baseline/auth migration and migrations 001, 002, and 003, then migration 005 in a fresh local stack. Scenario B repeats this in a separate disposable stack with migration 004 before 005; it is compatibility testing only and does not approve migration 004 remotely.

Migration 005 requires products, variants, categories, optional collections, normalized option tables, inventory locations/levels, orders/order items, profiles, `is_studio_member()`, RLS policies, grants, unique constraints, and PostgreSQL JSONB/UUID/numeric functionality. Migration 004 optionally supplies the reservation ledger. Supabase Auth is required for real `auth.uid()`/RLS tests. The detailed preceding dependency/test matrix remains in [studio-product-local-postgres-validation-plan.md](D:/projects/zerocraft/docs/studio-product-local-postgres-validation-plan.md:1).

## 11. Validation test plan

Future tests must cover SQL syntax/function creation, owner and `SECURITY DEFINER`, empty `search_path`, membership authorization, anonymous/non-Studio denial, atomic create/edit/rollback, normalized Size/Color persistence, variant UUID preservation, inventory initialization/preservation, reservation-safe archival, optimistic concurrency, two-session locks/deadlocks, INR/USD pricing, and CMS adapter compatibility.

## 12. Installation stages

Every stage requires separate authorization: (1) WSL2/Windows prerequisite remediation, (2) pinned Docker Desktop installation, (3) pinned Supabase CLI installation, (4) isolated local startup, (5) synthetic schema/fixtures, (6) Scenario A then Scenario B migration validation, (7) security/transaction/concurrency tests, and (8) scoped teardown.

## 13. Exact future commands

Read-only commands: `wsl --version`, `wsl --status`, `wsl --list --verbose`, `docker --version`, `docker info`, `docker ps -a`, `docker images`, `supabase --version`, and `Get-NetTCPConnection -State Listen`.

**REQUIRES ADMINISTRATOR APPROVAL:** `wsl --install --no-distribution` or equivalent approved feature remediation. Do not run it in this phase.

**INSTALLS SOFTWARE / REQUIRES SEPARATE APPROVAL:** install a pinned Docker Desktop release and a pinned Supabase CLI release using approved official methods. Do not use global npm installation or an unpinned npx command.

**STARTS SERVICES / REQUIRES SEPARATE APPROVAL:** start Docker Desktop, then run `supabase start` only for the named disposable project.

**CREATES LOCAL RESOURCES / REQUIRES SEPARATE APPROVAL:** run `supabase init` only in the dedicated disposable directory, then create synthetic local fixtures after loopback guards pass.

**EXECUTES LOCAL SQL / REQUIRES SEPARATE APPROVAL:** apply Scenario A or B migrations and run the SQL/security/transaction/concurrency harness.

**DELETES LOCAL RESOURCES / REQUIRES SEPARATE APPROVAL:** run `supabase stop` and remove only resolved disposable paths/volumes. Never use broad Docker prune/reset commands or target the repository root.

## 14. Required approvals

Separate approval is required for administrator actions, Windows features, firmware/reboot changes, software installation, Docker/WSL startup, CLI installation, local database/container/volume creation, Auth/Storage fixtures, seeds, SQL, migrations, concurrency sessions, runtime changes, and teardown. None of these approvals authorize remote writes, deployment, checkout activation, or use of development credentials.

## 15. Risks and mitigations

Remote contamination is mitigated by loopback/project-ID guards. Shared data is prevented with dedicated volumes. Low RAM and low `C:` space require confirmation and `D:` placement. Port conflicts require a pre-start check. Migration 004 remains a separate compatibility scenario. The existing Next.js `spawn EPERM` build issue remains separate and must not be weakened through security or TypeScript configuration changes.

## 16. Recommended next action

Obtain an approved read-only confirmation of total RAM, firmware virtualization, optional-feature state, and Windows support status. If requirements pass, request separate approval for WSL2/Docker/Supabase installation. If they fail, defer local validation or use a separately approved isolated alternative; do not use the remote development project as a substitute.

## Checksums and integrity

Primary [migration 005](D:/projects/zerocraft/supabase/migrations/202610160005_studio_product_write_hardening.sql:1): `FE3746FD66E9A112B249D0D6AE0566D68C307CF8FEA931CD9829B6012F00F2BC`.

Protected [migration 004](D:/projects/zerocraft/supabase/migrations/202610160004_checkout_runtime_hardening.sql:1): `456812B85635D5AFEED9F86AA113B0A906CBC1D5DD47A34101415C03C0621EEB`.

Both match expected values. No migration, `.env.local`, CMS runtime, or application source was modified. No software was installed, no download occurred, no service/container/database started, no SQL/migration ran, and no remote write/seed/Auth/Storage/checkout/feature-gate action occurred.

## Final recommendation

**PREREQUISITES NEED REMEDIATION**
