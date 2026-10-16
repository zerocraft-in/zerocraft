# Studio Product WSL2 Installation Approval Plan

Phase 2.8B.3H-H. Read-only verification and approval-gated procedure.

## 1. Current PC readiness

User-confirmed hardware: Windows 11 Pro, version 26H2, build 26300.9711; AMD Ryzen 5 5500; 6 cores / 12 logical processors; 16 GB installed RAM; firmware virtualization enabled.

Read-only local checks confirm AMD64 architecture, the Ryzen processor identity, 12 logical processors, WSL executable version `10.0.26100.9549`, and no installed WSL distribution. Docker Desktop, Docker CLI, Supabase CLI, and PostgreSQL binaries are absent.

## 2. Windows compatibility assessment

The registry still reports the legacy value `Windows 10 Pro`, while `cmd /c ver` reports `10.0.26300.9711`; `Get-ComputerInfo` is incomplete. Microsoft’s official release notes identify build 26300 as a Windows 11 26H2 build family, consistent with the user-confirmed Windows 11 identity. [Microsoft build 26300 release notes](https://learn.microsoft.com/en-us/windows-insider/release-notes/release-preview-24h2-25h2/build-26100-9539-26200-9539)

Docker’s current Windows requirements list Windows 11 64-bit Enterprise, Pro, or Education version 23H2 build 22631 or higher, WSL 2.1.5 or later, SLAT, 8 GB system RAM, and firmware virtualization. The user-confirmed 16 GB RAM and enabled virtualization satisfy those two hardware requirements. Exact edition/build support should still be confirmed with `winver` before installation. [Docker Desktop Windows requirements](https://docs.docker.com/desktop/setup/install/windows-install/)

Status: **COMPATIBLE IN PRINCIPLE; FINAL OS SUPPORT CONFIRMATION REQUIRED**.

## 3. SLAT verification result

SLAT is **UNVERIFIED**. Non-elevated CIM and `Get-ComputerInfo` fields were unavailable or incomplete, and no `coreinfo` utility is installed. The Ryzen 5 5500 model is favorable evidence but was not treated as proof.

Manual verification: Task Manager → Performance → CPU and approved Windows virtualization/hypervisor information. Do not enter BIOS/UEFI or alter firmware.

## 4. WSL2 current status

- `C:\Windows\System32\wsl.exe` exists, version `10.0.26100.9549`.
- `wsl --status`: WSL is not installed.
- `wsl --list --verbose`: WSL is not installed; no distributions exist.
- WSL2 kernel/distribution: not installed.
- Docker Desktop: not installed.
- Supabase CLI: not installed.

The WSL and Virtual Machine Platform feature queries are `BLOCKED_BY_PERMISSIONS`; no elevation was attempted. Read-only DISM edition queries returned error 740. No services were started or stopped.

## 5. Required Windows features

Future WSL2 setup requires Windows Subsystem for Linux, Virtual Machine Platform, firmware virtualization, and a restart if Windows requests one.

Microsoft documents that the standard WSL install enables the optional components, downloads the latest Linux kernel, sets WSL2 as default, installs Ubuntu by default, and requires a restart during installation. [Microsoft WSL setup](https://learn.microsoft.com/windows/wsl/setup/environment)

## 6. Proposed installation commands

No command in this section was executed.

Read-only preflight commands: `wsl.exe --version`, `wsl.exe --status`, and `wsl.exe --list --verbose`.

Proposed WSL-only command, **REQUIRES EXPLICIT APPROVAL, ADMINISTRATOR ELEVATION, DOWNLOAD, AND POSSIBLE REBOOT:** `wsl.exe --install --no-distribution`.

Microsoft’s WSL command reference defines `--no-distribution` as omitting Linux distribution installation. The command still installs/enables WSL components and may download the WSL package/kernel; it does not install Ubuntu. [WSL command reference](https://learn.microsoft.com/windows/wsl/reference)

This command must not be run until Gates A–F are satisfied and the user explicitly authorizes this named action.

Post-install verification commands: `wsl.exe --version`, `wsl.exe --status`, and `wsl.exe --list --verbose`.

Expected result: WSL version is reported, WSL2 is available, no unexpected distribution exists, and the feature/restart state is clear. Do not install a Linux distribution in this phase unless separately authorized.

## 7. Administrator requirements

Microsoft’s documented `wsl --install` flow requires an administrator PowerShell. Enabling Windows features may require UAC and a restart. The user must approve administrator elevation explicitly; this phase did not request or use elevation.

Docker Desktop’s per-user installation can avoid administrator installation in supported configurations, while all-users installation requires elevation. [Docker permission requirements](https://docs.docker.com/desktop/setup/install/windows-permission-requirements/)

## 8. Download requirements

The proposed WSL command may download WSL components/kernel packages. The standard `wsl --install` also downloads Ubuntu; `--no-distribution` is proposed specifically to avoid that distribution download. Docker Desktop and any future Supabase CLI installation require separate downloads and approvals. No downloads occurred.

## 9. Reboot requirements

The WSL installation flow may require a Windows restart after enabling features. A restart is a separate approval gate. No reboot occurred. After an approved restart, rerun the read-only WSL verification commands before proceeding to Docker.

## 10. Storage considerations

Previous read-only measurement: `C:` approximately 10.7 GB free; `D:` approximately 298.3 GB free.

Keep Docker Desktop application/Windows components on their supported per-user location unless the installer provides an approved alternative. Configure Docker’s WSL2 virtual disk/data location on `D:` through Docker Desktop Settings → Resources → Advanced where supported. Create the future local Supabase project directory on `D:` only after separate approval. Use dedicated disposable Docker volumes and preserve a safety buffer on `C:`.

Docker documents the default WSL2 engine data path under the user profile on `C:` and the supported Settings → Resources → Advanced relocation workflow. [Docker WSL2 storage guidance](https://docs.docker.com/desktop/features/wsl/)

No directories were created, files moved, or Docker settings changed.

## 11. Post-install verification

After separately approved WSL installation and any reboot, run `wsl.exe --version`, `wsl.exe --status`, `wsl.exe --list --verbose`, `Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux`, and `Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform`.

After separately approved Docker installation/startup, run `docker.exe --version`, `docker.exe info`, and `docker.exe ps -a`. These must confirm a local WSL2 Linux-container backend before any local Supabase action.

## 12. Failure recovery

- If `wsl --install --no-distribution` fails, stop and capture the error; do not retry with elevation or switch to `wsl --install` automatically.
- If a restart is requested, stop and request separate reboot approval.
- If WSL features remain unavailable, use the approved Microsoft manual WSL procedure only after new authorization.
- If Docker cannot start, do not run `docker start`, `docker reset`, `docker system prune`, or remove volumes without explicit scoped approval.
- If storage configuration fails, preserve the existing installation and report the actual path; do not move files manually.
- If compatibility remains uncertain, stop before Docker or Supabase installation.

## 13. Approval gates

- **Gate A:** exact Windows edition/build confirmed with `winver`; Docker support confirmed.
- **Gate B:** virtualization accepted from user evidence; SLAT manually verified or explicitly accepted as unresolved.
- **Gate C:** WSL-only command and its download/no-distribution behavior understood.
- **Gate D:** explicit approval for administrator elevation and Windows feature changes.
- **Gate E:** explicit approval for WSL downloads and installation.
- **Gate F:** explicit approval for Windows reboot.
- **Gate G:** separate approval for Docker Desktop download/install/startup.
- **Gate H:** separate approval for Docker storage configuration.
- **Gate I:** separate approval for Supabase CLI/local project/volumes.
- **Gate J:** separate approval for local SQL/migration validation.

If any gate is unresolved, stop.

## 14. Remaining blockers

1. Exact Windows edition/build must be confirmed manually despite the official build-family evidence.
2. SLAT remains unverified.
3. WSL and Virtual Machine Platform feature states are permission-blocked.
4. WSL is not installed.
5. Docker Desktop and Supabase CLI are not installed.
6. No installation, download, elevation, or reboot has been authorized.

## 15. Recommended next action

Request explicit approval for the named command `wsl.exe --install --no-distribution`, including administrator elevation, possible WSL component download, and possible reboot, only after confirming `winver` and SLAT. Do not authorize Docker, Supabase, SQL, migration, or reboot actions implicitly through WSL approval.

## Checksums and worktree integrity

Primary [migration 005](D:/projects/zerocraft/supabase/migrations/202610160005_studio_product_write_hardening.sql:1): `FE3746FD66E9A112B249D0D6AE0566D68C307CF8FEA931CD9829B6012F00F2BC`.

Protected [migration 004](D:/projects/zerocraft/supabase/migrations/202610160004_checkout_runtime_hardening.sql:1): `456812B85635D5AFEED9F86AA113B0A906CBC1D5DD47A34101415C03C0621EEB`.

Both match expected checksums. `git diff --check` passed with existing line-ending warnings. Existing worktree changes were preserved. No migration, CMS runtime, `.env.local`, or unrelated file was modified.

## Zero-mutation confirmation

No installation, download, administrator elevation, Windows feature change, reboot, service change, Docker installation, Supabase installation, database creation, SQL, migration, remote write, Storage/Auth change, seed, test order, checkout activation, or feature-gate change occurred.

## Final status

**UNKNOWN — FURTHER VERIFICATION REQUIRED**
