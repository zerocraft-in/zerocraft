# Studio Product WSL2 + Docker Readiness and Installation Plan

Phase 2.8B.3H-G. Read-only compatibility verification; no installation authority granted.

## 1. Executive summary

The supplied Task Manager evidence resolves two earlier unknowns: installed RAM is 16 GB and firmware virtualization is enabled. The CPU is an AMD Ryzen 5 5500 with 6 cores and 12 logical processors. These are favorable for a WSL2-backed Docker Desktop plan.

The Windows identity remains unresolved. The registry and `cmd /c ver` report Windows 10 Pro and build `10.0.26300.9711`, while Microsoft’s official release notes identify build 26300 as a Windows 11 26H2 build family. `Get-ComputerInfo` reports WindowsVersion 2009 but omits build and architecture fields. Exact `winver` confirmation is still required. SLAT is also not independently verified in this non-elevated session.

WSL is not installed, Docker Desktop is not installed, and Supabase CLI is not installed. No installation, elevation, feature change, service start, container, database, SQL, migration, or remote mutation occurred.

Decision: **UNKNOWN — CRITICAL INFORMATION MISSING**. The machine appears suitable if `winver` confirms a supported Windows 11 Pro build and SLAT/WSL prerequisites, but installation is not approved by this report.

## 2. Repository safety

Repository: `D:\projects\zerocraft`.

[AGENTS.md](D:/projects/zerocraft/AGENTS.md) and the previous plans were read. Existing worktree changes were preserved. [Migration 004](D:/projects/zerocraft/supabase/migrations/202610160004_checkout_runtime_hardening.sql) and [migration 005](D:/projects/zerocraft/supabase/migrations/202610160005_studio_product_write_hardening.sql) were not modified. The existing [local Supabase setup plan](D:/projects/zerocraft/docs/studio-product-local-supabase-setup-plan.md:1) and [Windows readiness report](D:/projects/zerocraft/docs/studio-product-windows-readiness-report.md:1) were not modified.

## 3. Windows verification

| Source | Result | Status |
|---|---|---|
| Registry ProductName | Windows 10 Pro | VERIFIED as registry value only |
| Registry EditionID | Professional | VERIFIED as registry value only |
| Registry build | 26300.9711 | VERIFIED |
| Registry BuildLabEx | 26100.1 amd64 release branch | VERIFIED, but inconsistent with CurrentBuild |
| `cmd /c ver` | Windows 10 `[Version 10.0.26300.9711]` | VERIFIED command output |
| `Get-ComputerInfo` | Windows 10 Pro, WindowsVersion 2009; build/architecture empty | PARTIAL |
| Microsoft build interpretation | Build 26300 is documented as Windows 11 26H2 family | REPORTED by official documentation |
| Exact installed edition/build | Not independently settled | UNKNOWN |

Microsoft’s release notes identify 26300 as a Windows 11 26H2 build family. Therefore the registry ProductName must not be treated as definitive. Manual `winver` or Settings → System → About verification is required before installation. [Microsoft build 26300 release notes](https://learn.microsoft.com/en-us/windows-insider/release-notes/release-preview-24h2-25h2/build-26100-9539-26200-9539)

Docker’s documented supported Windows requirements must be checked against the verified result, not the misleading registry label. [Docker Windows installation requirements](https://docs.docker.com/desktop/setup/install/windows-install/)

## 4. RAM, CPU, virtualization, and SLAT

| Requirement | Evidence | Status |
|---|---|---|
| Installed RAM | User-provided Task Manager evidence: 16 GB, 15.9 GB usable | REPORTED USER EVIDENCE |
| Current memory use | User screenshot: approximately 10.4/15.9 GB | REPORTED USER EVIDENCE |
| CPU | AMD Ryzen 5 5500 | VERIFIED by registry and user evidence |
| Cores/threads | 6 cores / 12 logical processors | REPORTED USER EVIDENCE; 12 threads independently visible |
| Architecture | AMD64 / 64-bit process environment | VERIFIED |
| Firmware virtualization | Enabled in Task Manager screenshot | REPORTED USER EVIDENCE |
| SLAT | Not independently exposed by safe local queries | UNKNOWN |
| Hypervisor running | Not independently verified | UNKNOWN |

The CPU model and virtualization setting are favorable evidence, but CPU support, firmware state, and SLAT are distinct facts. No BIOS/UEFI change or privileged query was attempted. Docker’s WSL2 requirements include SLAT, hardware virtualization, and sufficient RAM. [Docker WSL2 backend guidance](https://docs.docker.com/desktop/features/wsl/)

## 5. WSL2 status and Windows features

- `wsl.exe` exists at `C:\Windows\System32\wsl.exe`, version `10.0.26100.9549`.
- `wsl --status`: WSL is not installed.
- `wsl --list --verbose`: WSL is not installed; no distributions exist.
- WSL2 availability: not ready until WSL components are installed and verified.
- `Microsoft-Windows-Subsystem-Linux`: `BLOCKED_BY_PERMISSIONS`.
- `VirtualMachinePlatform`: `BLOCKED_BY_PERMISSIONS`.
- Read-only DISM edition queries returned elevation error 740.

Microsoft documents WSL setup as enabling the WSL and Virtual Machine Platform components and potentially requiring a restart. [Microsoft WSL installation guidance](https://learn.microsoft.com/en-us/windows/wsl/install)

## 6. Docker, Supabase CLI, and storage

- Docker CLI/Desktop/Compose: not installed.
- Supabase CLI: not installed.
- PostgreSQL binaries: not installed.
- Docker services/processes: none found.
- Planned ports: no listeners observed.
- `C:`: approximately 10.7 GB free.
- `D:`: approximately 298.3 GB free from the prior `DriveInfo` measurement.

Recommended placement plan:

- Docker Desktop application: approved per-user installation location; retain unavoidable application/Windows components on `C:`.
- Docker/WSL virtual disk: configure through Docker Desktop’s supported Resources/Advanced storage setting to use `D:` where available.
- Local Supabase project/configuration: dedicated disposable directory on `D:`, outside the repository and outside `.env.local`.
- Volumes: dedicated disposable local volumes only; never reuse existing volumes.
- Teardown: stop only the named disposable stack and remove only its resolved project/volumes after a separate approval.

Docker documents that the WSL2 engine defaults under the user profile on `C:` and can be relocated through Docker Desktop Settings → Resources → Advanced. This is a future configuration plan only. [Docker WSL2 storage guidance](https://docs.docker.com/desktop/features/wsl/)

## 7. Approval-gated stages

Every stage below requires separate explicit approval. None was executed.

### Stage A — WSL2 prerequisite remediation

- Prerequisites: manual `winver` confirmation, confirmed 16 GB RAM, virtualization enabled, approved Windows feature change.
- Proposed command: `wsl --install --no-distribution` or an approved manual enablement procedure.
- Privileges: administrator approval and likely restart.
- Expected result: WSL and Virtual Machine Platform enabled without a distribution if the selected method supports it.
- Verification: `wsl --version`, `wsl --status`, `wsl --list --verbose`.
- Recovery: use approved Windows feature rollback only if the operator explicitly authorizes it.
- Approval: required before any feature or reboot action.

### Stage B — Restart if required

- Prerequisites: Stage A completed and Windows reports a pending restart.
- Command/action: approved manual Windows restart.
- Privileges: user/administrator policy dependent.
- Expected result: WSL features become active.
- Verification: repeat read-only WSL/version checks.
- Recovery: do not continue if feature state is not confirmed.
- Approval: required.

### Stage C — Verify WSL2

- Prerequisites: Stage A/B complete.
- Commands: `wsl --version`, `wsl --status`, `wsl --list --verbose`.
- Privileges: ordinary user for inspection.
- Expected result: WSL2 version meets Docker’s documented minimum and feature state is active.
- Verification: record version, default mode, distributions, and kernel state.
- Recovery: stop and remediate only under a new approval if checks fail.
- Approval: required to proceed to Docker.

### Stage D — Install Docker Desktop

- Prerequisites: verified supported Windows edition/build, WSL2, SLAT, virtualization, RAM, and disk.
- Proposed action: install a pinned Docker Desktop release using the official per-user WSL2 method.
- Privileges: per-user installation may avoid administrator installation, but first-time WSL enablement and some settings can require elevation.
- Expected result: Docker Desktop installed with Linux containers/WSL2 backend selected.
- Verification: `docker --version`, `docker info`, `docker ps -a`.
- Recovery: use Docker’s documented uninstall/recovery procedure, scoped only to the new installation.
- Approval: required before downloading/installing.

### Stage E — Configure Docker storage

- Prerequisites: Docker Desktop installed and stopped/controlled according to its settings workflow.
- Proposed action: configure supported Docker/WSL data location on `D:` through Docker Desktop Settings → Resources → Advanced.
- Privileges: Docker settings permission as required.
- Expected result: disposable engine data is placed on `D:` where supported; `C:` retains a safety buffer.
- Verification: inspect the configured path and Docker disk usage without touching existing data.
- Recovery: revert only the new Docker setting through the supported UI.
- Approval: required.

### Stage F — Verify Docker

- Prerequisites: Docker Desktop running under the approved WSL2 backend.
- Commands: `docker info`, `docker ps -a`, `docker images`.
- Privileges: ordinary user if per-user installation permits.
- Expected result: Linux container engine responds locally.
- Verification: confirm local context, backend, data root, and no unexpected containers/images.
- Recovery: stop and report; do not start or inspect unrelated containers.
- Approval: required.

### Stage G — Install Supabase CLI

- Prerequisites: approved Docker and local-only installation method.
- Proposed action: install a pinned Supabase CLI using its officially supported release method.
- Privileges: ordinary user where supported.
- Expected result: `supabase --version` succeeds.
- Verification: ensure no remote project link or `.env.local` inheritance.
- Recovery: remove only the newly installed CLI under separate approval.
- Approval: required.

### Stage H — Prepare isolated Supabase configuration

- Prerequisites: local Docker and CLI verified.
- Proposed action: initialize a dedicated disposable Supabase project directory on `D:`.
- Privileges: ordinary user for local file creation.
- Expected result: local configuration with no remote project ID, no remote URL, and no development credentials.
- Verification: guard rejects `jamyqssytdzbiiahtmsq` and every non-loopback URL.
- Recovery: remove only the dedicated disposable directory after approval.
- Approval: required.

### Stage I — Start disposable local stack

- Prerequisites: isolated configuration, free ports, Docker verified, loopback guard passed.
- Proposed command: `supabase start` in the dedicated project directory.
- Privileges: ordinary user or Docker group as configured.
- Expected result: local Supabase services on approved loopback ports.
- Verification: `supabase status`; confirm no remote endpoint and no shared volumes.
- Recovery: `supabase stop`, scoped to the dedicated project, under separate approval.
- Approval: required.

### Stage J — Run migration 005 validation

- Prerequisites: local stack and synthetic fixture plan approved.
- Proposed action: Scenario A through migration 003 then 005; Scenario B through migration 004 then 005 in a separate disposable environment.
- Privileges: local database role only; no remote credentials.
- Expected result: SQL/security/transaction/concurrency test artifacts.
- Verification: use the existing [local PostgreSQL validation plan](D:/projects/zerocraft/docs/studio-product-local-postgres-validation-plan.md:1).
- Recovery: discard only the named disposable local database/volumes after approval.
- Approval: required before any SQL or migration execution.

## 8. Isolation safeguards

- Reject remote project ID `jamyqssytdzbiiahtmsq`.
- Reject all non-loopback Supabase URLs.
- Never source `.env.local`.
- Use synthetic Auth identities and fixtures only.
- Use dedicated local volumes and a dedicated `D:` project directory.
- Recheck ports immediately before startup.
- Keep migration 004 compatibility testing separate and non-deployable.
- Do not activate checkout or modify CMS runtime.

## 9. Readiness matrix

| Requirement | Status | Action |
|---|---|---|
| Supported Windows edition/build | UNKNOWN | Confirm with `winver`; build metadata conflicts |
| 64-bit architecture | PASS | Verified AMD64 environment |
| 16 GB installed RAM | REPORTED | Accepted from user Task Manager evidence |
| Virtualization enabled | REPORTED | Accepted from user Task Manager evidence |
| Ryzen 5 5500 / 6C12T | VERIFIED/REPORTED | CPU model and thread count confirmed |
| SLAT | UNKNOWN | Obtain safe/manual confirmation |
| WSL2 installed | FAIL/prerequisite | Requires separately approved remediation |
| WSL features | BLOCKED_BY_PERMISSIONS | Inspect manually or with approved administration |
| Docker Desktop | FAIL/prerequisite | Requires separate installation approval |
| Supabase CLI | FAIL/prerequisite | Requires separate installation approval |
| C: storage | LIMITED | Preserve safety buffer |
| D: storage | PASS in prior read-only measurement | Preferred disposable data location |
| Planned ports | PASS | Recheck before startup |

## 10. Required future approvals

Separate authorization is required for Windows feature changes, restart, Docker download/install, storage configuration, Supabase CLI installation, local project/volume/database creation, `supabase start`, synthetic fixtures, SQL/migration execution, test orders or checkout, and teardown. No approval in this document authorizes remote writes or deployment.

## 11. Checksums and zero-mutation confirmation

Primary [migration 005](D:/projects/zerocraft/supabase/migrations/202610160005_studio_product_write_hardening.sql:1): `FE3746FD66E9A112B249D0D6AE0566D68C307CF8FEA931CD9829B6012F00F2BC`.

Protected [migration 004](D:/projects/zerocraft/supabase/migrations/202610160004_checkout_runtime_hardening.sql:1): `456812B85635D5AFEED9F86AA113B0A906CBC1D5DD47A34101415C03C0621EEB`.

Both match the expected checksums. `git diff --check` passed with existing line-ending warnings. No installation, download, elevation, Windows feature change, registry change, service/container/database start, SQL, migration, remote write, Storage/Auth mutation, seed, order, checkout activation, feature-gate change, CMS runtime change, or migration modification occurred.

## 12. Final decision

**UNKNOWN — CRITICAL INFORMATION MISSING**
