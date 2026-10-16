# Studio Product Windows Readiness Report

Phase 2.8B.3H-F. Read-only hardware, OS, WSL, Docker, and storage audit.

## 1. Executive summary

The machine cannot yet be approved for Docker Desktop/WSL2 installation because critical prerequisites remain unknown. WSL is not installed, Docker/Supabase/PostgreSQL tooling is absent, and the non-elevated session could not verify total physical RAM, firmware virtualization, SLAT, hypervisor status, or optional-feature state. The registry and `cmd /c ver` agree on build `26300.9711`, but `Get-ComputerInfo` reports Windows version `2009` and omits build/architecture fields; this metadata disagreement must be resolved before declaring Docker compatibility.

Available RAM is approximately 5612 MB at 2026-10-16 16:08:03, but this is not installed RAM. `D:` has ample free space for a planned isolated data location; `C:` has limited free space. No planned port conflicts were found.

## 2. Windows edition/build

| Source | Result | Status |
|---|---|---|
| Registry `CurrentVersion` | Windows 10 Pro, Professional, display 26H2, build 26300, UBR 9711, Client | VERIFIED from registry |
| `cmd /c ver` | Microsoft Windows `[Version 10.0.26300.9711]` | VERIFIED from command output |
| `Get-ComputerInfo` | Windows 10 Pro, edition Professional, WindowsVersion 2009; build/architecture empty | VERIFIED fields, incomplete result |
| `BuildLabEx` | `26100.1.amd64fre.ge_release.240331-1435` | REPORTED; inconsistent with CurrentBuild |

The product/build metadata is internally inconsistent. Docker’s current documentation lists Windows 10 64-bit Pro/Enterprise/Education 22H2 build 19045 or Windows 11 23H2 build 22631+ for the documented Windows backend, plus WSL2, 8 GB system RAM, SLAT, and firmware virtualization. The observed platform therefore requires confirmation rather than an inferred compatibility decision. [Docker Windows requirements](https://docs.docker.com/desktop/setup/install/windows-install/)

## 3. CPU architecture

| Check | Result | Status |
|---|---|---|
| OS/process architecture | `AMD64` / 64-bit | VERIFIED from environment |
| Processor identifier | AMD64 Family 25 Model 80 Stepping 0, AuthenticAMD | VERIFIED from environment/registry |
| CPU model | AMD Ryzen 5 5500 | VERIFIED from processor registry |
| Logical processors | 12 | VERIFIED from environment |
| Core count | Not available without CIM | UNKNOWN |

## 4. Total installed RAM

Total installed RAM is **UNKNOWN / BLOCKED_BY_PERMISSIONS**. `Get-CimInstance Win32_ComputerSystem`, `Win32_PhysicalMemory`, `Win32_OperatingSystem`, and `Get-ComputerInfo` did not expose the required value; CIM/system queries returned access denied or empty fields. Available RAM must not be used to infer total RAM.

Manual observational verification: open Task Manager → Performance → Memory and report Total installed, Available, and Hardware reserved. Do not change settings or provide screenshots containing unrelated sensitive information.

## 5. Available RAM

`Get-Counter '\\Memory\\Available MBytes'` reported approximately **5612 MB** at **2026-10-16 16:08:03**. Status: **VERIFIED, approximate current measurement**. This does not establish total installed RAM or hardware compatibility.

## 6. Virtualization

Firmware virtualization, CPU VM monitor extensions, and hypervisor state are **UNKNOWN / BLOCKED_BY_PERMISSIONS**. `Win32_Processor`, `Win32_ComputerSystem`, `systeminfo`, and the relevant `Get-ComputerInfo` fields were unavailable or incomplete. No BIOS/UEFI or Windows security setting was changed.

Manual observational verification: Task Manager → Performance → CPU → Virtualization. Report Enabled, Disabled, or Unknown. Do not enter BIOS or change firmware settings.

## 7. SLAT

SLAT support is **UNKNOWN / BLOCKED_BY_PERMISSIONS**. The CPU family alone was not treated as proof. Manual confirmation must come from an approved Windows virtualization/hypervisor information view; do not infer SLAT from the model name.

## 8. WSL2 readiness

- `C:\Windows\System32\wsl.exe` exists, version `10.0.26100.9549`.
- `wsl --status`: reports WSL is not installed.
- `wsl --list --verbose`: reports WSL is not installed; no distributions exist.
- WSL2 availability: **NOT READY / UNKNOWN until feature remediation and verification**.
- No WSL distribution was modified or installed.

## 9. Optional feature states

`Get-WindowsOptionalFeature` for `Microsoft-Windows-Subsystem-Linux` and `VirtualMachinePlatform` returned **BLOCKED_BY_PERMISSIONS**. A read-only DISM feature query did not produce usable state output. No elevation retry was attempted.

Manual observational verification: Windows Features dialog → inspect, but do not enable or disable, Windows Subsystem for Linux and Virtual Machine Platform.

## 10. Docker compatibility

Docker CLI, Docker Desktop, Docker Compose, Docker services, and Docker processes are absent. Compatibility is **UNKNOWN**, not failed hardware compatibility, because Windows support metadata, total RAM, SLAT, firmware virtualization, and optional-feature state are unresolved.

The documented WSL2 path requires prerequisite remediation and separate approval. Docker’s documented permission model and WSL2 requirements are described in [Docker’s Windows permission guidance](https://docs.docker.com/desktop/setup/install/windows-permission-requirements/).

## 11. C: storage

Using the unprivileged `DriveInfo` fallback, `C:` has 10,685,640,704 free of 126,851,477,504 bytes. Status: **VERIFIED, limited**.

Use `C:` only for unavoidable Windows/Docker installer footprint. Keep a safety buffer and do not plan Docker images, WSL virtual disks, or Supabase data primarily on `C:`.

## 12. D: storage

Using `DriveInfo`, `D:` has 298,256,203,776 free of 499,184,037,888 bytes. Status: **VERIFIED, suitable in principle**.

`D:` is the planned location for disposable Docker data, WSL virtual disks where supported, local Supabase volumes, logs, and synthetic fixtures. This is a recommendation only; no files or settings were moved.

Not every Docker/WSL component is relocatable, so future setup must verify actual data-root behavior and retain a `C:` free-space buffer.

## 13. Port availability

No listeners were found on `3000`, `5432`, `5433`, `5434`, `8000`, `8001`, `8080`, `8443`, `54321`, `54322`, `54323`, or `54324`. Status: **PASS**. No process was terminated and no port was bound.

## 14. Command failures and safe alternatives

| Method | Result | Classification | Safe alternative |
|---|---|---|---|
| `Get-CimInstance Win32_OperatingSystem` | Access denied | BLOCKED_BY_PERMISSIONS | Task Manager/Settings observation |
| `Get-CimInstance Win32_ComputerSystem` | Access denied | BLOCKED_BY_PERMISSIONS | Task Manager Memory; manual virtualization view |
| `Get-CimInstance Win32_Processor` | Access denied | BLOCKED_BY_PERMISSIONS | Processor registry plus manual Task Manager verification |
| `Get-ComputerInfo` | Partial fields; critical fields empty | INCOMPLETE | Registry, `cmd /c ver`, and manual verification |
| `Get-WindowsOptionalFeature` | Requires elevation | BLOCKED_BY_PERMISSIONS | Windows Features dialog observation |
| Read-only DISM feature query | No usable output | BLOCKED/UNVERIFIED | Windows Features dialog observation |
| `Get-Volume` | Access denied | BLOCKED_BY_PERMISSIONS | `DriveInfo` fallback |
| `Get-PSDrive` | Drive sizes reported as zero in this restricted session | UNRELIABLE | `DriveInfo` fallback |

No privileged command was retried, and no bypass or policy change was attempted.

## 15. Alternative verification methods

Use only observational methods:

- Task Manager → Performance → Memory for installed/available RAM.
- Task Manager → Performance → CPU for firmware virtualization.
- Settings → System → About or `winver` for edition/build.
- Windows Features dialog for WSL and Virtual Machine Platform state.
- File Explorer → This PC for C:/D: capacity confirmation.

## 16. Manual verification checklist

Report only:

1. Total installed RAM, available RAM, and hardware reserved memory.
2. CPU virtualization: Enabled, Disabled, or Unknown.
3. Windows edition and exact build from Settings/About or `winver`.
4. WSL and Virtual Machine Platform feature states.
5. C:/D: free-space values if they differ from the read-only measurements above.

Do not enable features, install distributions, change firmware, or provide credentials.

## 17. Installation readiness matrix

| Requirement | Observed value | Required value | Status | Blocker/next action |
|---|---|---|---|---|
| Windows support | Product/build metadata disagree across sources | Supported Docker Windows build | UNKNOWN | Confirm exact supported edition/build |
| OS architecture | AMD64, 64-bit | 64-bit | PASS | None |
| Installed RAM | Unknown | At least Docker-documented minimum | UNKNOWN | Manual Task Manager check |
| Available RAM | ~5612 MB | Operational headroom | UNKNOWN | Do not infer total RAM |
| CPU virtualization | Unknown | Supported/enabled | UNKNOWN | Manual Task Manager check |
| SLAT | Unknown | Required by WSL2 | UNKNOWN | Approved manual confirmation |
| Firmware virtualization | Unknown | Enabled | UNKNOWN | Manual check only |
| WSL2 | Not installed | Available | FAIL/prerequisite | Separate WSL remediation approval |
| Virtual Machine Platform | Blocked | Enabled for WSL2 path | UNKNOWN | Manual/admin inspection |
| Docker availability | Not installed | Docker Desktop/CLI | FAIL/prerequisite | Separate installation approval |
| Supabase CLI | Not installed | Pinned CLI | FAIL/prerequisite | Separate installation approval |
| C: free space | ~10.7 GB | Safety buffer | UNKNOWN/limited | Keep Docker/WSL data off C: |
| D: free space | ~298.3 GB | Adequate disposable storage | PASS | Planned location only |
| Port conflicts | None observed | None on planned ports | PASS | Recheck before startup |

## 18. Confirmed blockers

- WSL is not installed.
- Docker Desktop/CLI is not installed.
- Supabase CLI is not installed.
- PostgreSQL binaries are not installed.
- Required Windows feature states are permission-blocked.

These are prerequisite-remediation blockers, not proof of unsupported hardware.

## 19. Unknown prerequisites

- Total installed physical RAM.
- SLAT capability.
- Firmware virtualization state.
- Hypervisor state.
- Exact Docker-support interpretation of the inconsistent Windows metadata.
- WSL and Virtual Machine Platform feature states.

## 20. Recommended remediation order

1. Obtain observational confirmation of RAM, virtualization, Windows build, and optional-feature state.
2. Confirm Docker’s supported Windows matrix for the verified build.
3. Obtain separate approval for WSL2/Virtual Machine Platform remediation if required.
4. Obtain separate approval for pinned Docker Desktop installation.
5. Obtain separate approval for pinned Supabase CLI installation.
6. Re-run read-only tool/port checks.
7. Only after separate authorization, create the isolated local stack and execute the previously documented validation plan.

## 21. Documentation path

[studio-product-windows-readiness-report.md](D:/projects/zerocraft/docs/studio-product-windows-readiness-report.md:1)

Related plans: [studio-product-local-supabase-setup-plan.md](D:/projects/zerocraft/docs/studio-product-local-supabase-setup-plan.md:1) and [studio-product-local-postgres-validation-plan.md](D:/projects/zerocraft/docs/studio-product-local-postgres-validation-plan.md:1).

## 22. Final decision and approvals

**UNKNOWN — CRITICAL INFORMATION MISSING**

Installation is not approved. Critical values remain unknown, and no evidence establishes unsupported hardware. Separate approval would be required for any future Windows feature change, firmware action, software installation, service startup, container/database creation, SQL, migration application, fixture, or teardown.

## Checksums and zero-mutation confirmation

Primary [migration 005](D:/projects/zerocraft/supabase/migrations/202610160005_studio_product_write_hardening.sql:1): `FE3746FD66E9A112B249D0D6AE0566D68C307CF8FEA931CD9829B6012F00F2BC`.

Protected [migration 004](D:/projects/zerocraft/supabase/migrations/202610160004_checkout_runtime_hardening.sql:1): `456812B85635D5AFEED9F86AA113B0A906CBC1D5DD47A34101415C03C0621EEB`.

Both match expected values. `git diff --check` passed with existing line-ending warnings. No software was installed, no files were downloaded, no elevation was requested, no features/registry/security settings changed, no services/containers/databases started or created, no SQL/migrations ran, no remote writes occurred, no Auth/Storage/seeds/orders/checkout/feature-gate actions occurred, and no migrations or CMS runtime files were modified.
