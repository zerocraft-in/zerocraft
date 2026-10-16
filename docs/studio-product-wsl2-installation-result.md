# Studio Product WSL2 Installation Result

Phase 2.8B.3H-I. Controlled WSL2-only execution result.

## 1. Windows environment

- User-confirmed environment: Windows 11 Pro, version 26H2, build 26300.9711.
- Registry still reports the legacy `Windows 10 Pro` ProductName; `cmd /c ver` reports `10.0.26300.9711`.
- Hardware: AMD Ryzen 5 5500, 6 cores / 12 logical processors, 16 GB RAM, virtualization enabled.
- Target/protected migration hashes were verified before and after the attempt.

## 2. Pre-install checks

Pre-install checks completed:

- WSL executable present at `C:\Windows\System32\wsl.exe`, version `10.0.26100.9549`.
- `wsl --status` and `wsl --list --verbose` reported that WSL was not installed.
- No Linux distribution was present.
- Docker, Supabase CLI, PostgreSQL, and Docker services were absent.
- The current terminal was not elevated: `is_admin = False`.
- User authorization for WSL2-only installation was present, but the execution environment did not obtain an elevated PowerShell context.

## 3. Administrator status

The executing identity was `MARAN\ivdma` with `is_admin = False`. An elevated execution request was made for exactly the authorized WSL command, but the resulting process still did not establish an elevated context.

No UAC bypass, privilege escalation workaround, or unrelated administrator command was attempted.

## 4. Installation command

Exact command attempted once:

`wsl.exe --install --no-distribution`

No substitution with `wsl --install` was made, so no Linux distribution was intentionally requested.

## 5. Installation exit code and output

- Exit code: `1`
- Relevant output: WSL is not installed and recommends running `wsl.exe --install`.
- The command did not report successful feature enablement, kernel installation, or completion.
- No blind retry or unrelated repair command was executed.

## 6. Windows feature changes

Unknown whether any partial feature change occurred. Post-attempt WSL checks still reported WSL not installed. Feature inspection remained permission-blocked. There is no evidence of a successful WSL feature transition.

## 7. Download result

No successful WSL installation/download was reported. No Docker, Supabase, PostgreSQL, or third-party download occurred.

## 8. Restart requirement and status

- Restart requirement: not reported by the failed command.
- Restart completed: no.
- No reboot was initiated or forced.

## 9. Post-attempt WSL verification

Post-attempt checks:

- `wsl.exe --version`: still reports WSL is not installed; executable version remains `10.0.26100.9549`.
- `wsl.exe --status`: WSL not installed.
- `wsl.exe --list --verbose`: WSL not installed; no distribution.
- WSL2 availability: not verified.
- WSL kernel: not verified/present.
- Default WSL version: not applicable.
- Unintended Linux distribution: none observed.

## 10. Storage

The previous verified read-only measurements remain the planning baseline:

- `C:` approximately 10.7 GB free.
- `D:` approximately 298.3 GB free.

No files were moved, no directories were created, and no Docker/WSL storage configuration was changed.

## 11. Errors, warnings, and recovery recommendation

The failure is at the administrator/WSL installation stage, not a migration or repository failure. The targeted recovery is manual execution from an elevated PowerShell after saving work and closing applications:

1. Open PowerShell using **Run as administrator**.
2. Execute only `wsl.exe --install --no-distribution`.
3. Approve the UAC prompt and any Microsoft component download.
4. If Windows requests a restart, obtain/observe the user’s separate restart confirmation and restart manually.
5. After Windows returns, run `wsl.exe --version`, `wsl.exe --status`, and `wsl.exe --list --verbose`.
6. Stop and report any error instead of switching to `wsl --install`, installing Ubuntu, or applying unrelated repairs.

This manual procedure requires a new user interaction/approval and was not executed automatically.

## 12. Remaining prerequisites

- Successful elevated WSL2 installation.
- WSL/Virtual Machine Platform feature verification.
- WSL kernel/version verification.
- Any required restart.
- Docker Desktop installation remains separately unauthorized.
- Supabase CLI, PostgreSQL, local database, SQL, and migration validation remain separately unauthorized.

## 13. Migration checksums

Primary [migration 005](D:/projects/zerocraft/supabase/migrations/202610160005_studio_product_write_hardening.sql:1): `FE3746FD66E9A112B249D0D6AE0566D68C307CF8FEA931CD9829B6012F00F2BC`.

Protected [migration 004](D:/projects/zerocraft/supabase/migrations/202610160004_checkout_runtime_hardening.sql:1): `456812B85635D5AFEED9F86AA113B0A906CBC1D5DD47A34101415C03C0621EEB`.

Both match the expected values before and after the failed attempt.

## 14. Repository integrity

`git diff --check` passed with existing line-ending warnings. Existing worktree changes were preserved. No migration, CMS runtime, `.env.local`, Docker configuration, or unrelated file was modified.

## 15. Zero-mutation confirmation

No successful installation, download, Windows feature change, reboot, service change, Docker installation, Supabase installation, PostgreSQL installation, Linux distribution installation, database creation, SQL execution, migration deployment, remote write, Storage/Auth change, seed, test order, checkout activation, or feature-gate change occurred.

## Final status

**BLOCKED — ADMINISTRATOR OR COMPATIBILITY ISSUE**
