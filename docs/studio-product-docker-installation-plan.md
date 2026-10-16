# Studio Product Docker Desktop Installation Plan

Phase 2.8B.3H-J. Approval-gated, read-only preparation.

## A. System readiness

- Host: user-confirmed Windows 11 Pro, version 26H2, build 26300.9711.
- CPU: AMD Ryzen 5 5500; virtualization is user-confirmed enabled.
- Memory: 16 GB user-confirmed.
- Architecture: x86_64/AMD64.
- Docker Desktop is not installed. No Docker-related directories were found at the checked default paths.
- Existing application and repository changes are preserved; this plan does not modify them.

Status: hardware evidence is favorable, but final Windows edition/build and SLAT evidence still require confirmation.

## B. WSL2 verification

`wsl.exe --version` reports WSL 3.0.3.0 and kernel 6.18.54.1-1. However, `wsl.exe --status` and `wsl.exe --list --verbose` return `E_ACCESSDENIED`; no usable distribution or Docker WSL backend was verified. The prior installation result also records that `wsl.exe --install --no-distribution` failed with exit code 1 in a non-elevated context.

Docker's current WSL guidance requires WSL 2.1.5 or later and the WSL 2 feature to be installed. WSL readiness is therefore **not verified** and blocks Docker installation planning from becoming an install approval.

Do not install Ubuntu or any other distribution solely for Docker Desktop.

## C. Official Docker compatibility

The official Docker Windows installation page states that the WSL 2 backend requires:

- Windows 11 64-bit Enterprise, Pro, or Education, version 23H2/build 22631 or higher.
- WSL 2.1.5 or later.
- A 64-bit processor with SLAT.
- 8 GB system RAM.
- Hardware virtualization enabled in BIOS/UEFI.
- The Windows Server service enabled and set to Automatic.

The reported Windows build, 16 GB RAM, and enabled virtualization are favorable. SLAT, the Windows edition/build through `winver`, the Windows Server service state, and successful WSL feature operation remain unverified. Docker compatibility is **UNKNOWN / BLOCKED pending those checks**; no claim of final compatibility is made.

Sources:

- [Docker Desktop for Windows installation and requirements](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Docker Desktop WSL 2 backend](https://docs.docker.com/desktop/features/wsl/)
- [Docker Desktop release notes and checksums](https://docs.docker.com/desktop/release-notes/)

## D. Installer source and version

Use only the official x86_64 installer link exposed by Docker's Windows installation page:

`https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe`

No installer was downloaded, so no installer version or checksum is available in this report. After separate approval, record the exact release-notes version and published checksum before execution, then verify the downloaded file against it. Do not use a third-party mirror.

## E. Installation prerequisites

Before Docker approval is requested, obtain evidence for:

1. `winver` showing the exact Windows edition and build.
2. SLAT support.
3. WSL feature and Virtual Machine Platform state from an elevated, read-only check after WSL installation is authorized.
4. WSL 2.1.5 or later and a successful `wsl --status`.
5. Windows Server service enabled and Automatic.
6. Current C: free space measured successfully; the current restricted session could not re-measure it because storage/CIM queries returned access denied. The prior baseline was approximately 10.7 GB free on C: and 298.3 GB free on D:.

The Docker installer still needs temporary/application space on C:. Per-user installation is the official recommended mode and installs the application under `%LOCALAPPDATA%\\Programs\\DockerDesktop`; it does not move the application itself to D:.

## F. C: and D: storage assessment

- Prior verified baseline: C: approximately 10.7 GB free; D: approximately 298.3 GB free.
- Current recheck: blocked by access denied in this execution context; do not treat the prior baseline as current capacity.
- Checked Docker paths did not exist, including `C:\\ProgramData\\Docker`, `C:\\ProgramData\\DockerDesktop`, `%LOCALAPPDATA%\\Docker`, and `D:\\DockerData`.
- No directory was created and no data was moved.

The proposed target is `D:\\DockerData`, subject to current free-space confirmation and Docker's supported settings. Keep a safety buffer on both volumes.

## G. Proposed D: disk image configuration

Docker documents the WSL 2 engine data path as `C:\\Users\\[USERNAME]\\AppData\\Local\\Docker\\wsl` by default and documents changing it through **Settings > Resources > Advanced**. After installation and only with separate approval, use that supported UI to select `D:\\DockerData` if the current Docker release exposes the setting.

Do not manually move VHDX files, create filesystem links, or infer success from a screenshot. Verify the resulting path through Docker's reported settings/data location and filesystem inspection. If Docker requires initial startup before the setting is available, explain that dependency and request the separate engine-start approval first.

## H. Installation procedure

After all blockers are cleared and the user separately approves Docker installation:

1. Download the official x86_64 installer.
2. Verify its published checksum and record the Docker Desktop version.
3. Prefer the official per-user installation mode (`install --user`) where compatible; it avoids all-users elevation but does not avoid one-time elevation if Windows must enable WSL 2.
4. Select/use the WSL 2 backend.
5. Do not enable Windows containers, Kubernetes, optional extensions, registry sign-in, or arbitrary images.
6. Complete installation and stop before starting the engine unless startup is separately approved.

## I. Administrator/UAC requirements

Docker documents per-user installation as not requiring administrator privileges and all-users installation as requiring elevation. Docker also documents that enabling WSL 2 for the first time requires administrator privileges. Any UAC prompt, Windows feature change, or administrator command requires its own explicit approval.

## J. Expected restart behavior

Docker installation itself may not require a restart, but enabling WSL 2 or Windows features may. No restart is authorized by this plan. If Windows requests one, stop and request separate restart approval before proceeding.

## K. Docker verification procedure

Only after separate approval to start the Docker engine, run read-only checks:

```powershell
docker --version
docker version
docker info
docker context ls
docker system df
```

Confirm the client/server are available, the backend is WSL 2/Linux containers, the data location is on D:, and no unintended containers, images, volumes, or networks were created. Do not run `docker run`, `docker pull`, `docker compose up`, or `docker system prune`.

## L. Failure recovery

- If WSL or Docker installation fails, capture the exact error and stop.
- Do not switch to an unapproved WSL command, install a distribution, or apply unrelated repairs.
- Do not manually relocate VHDX files or delete Docker data.
- If the D: setting is unavailable or fails, preserve the installation and report the actual location.
- Do not install Supabase CLI, start Supabase, create a database, execute SQL, or deploy migrations in this phase.

## M. Approval checkpoints

- WSL installation/elevation/download: separate approval.
- Any Windows restart: separate approval.
- Docker installer download/install: separate approval.
- Docker first startup/engine start: separate approval.
- D: Docker data-location configuration: separate approval.
- Supabase installation and local database: not authorized by this plan.
- SQL or migration validation: not authorized by this plan.

## N. Remaining blockers

1. WSL status/list checks are access-denied and WSL usability is not verified.
2. The prior WSL-only installation attempt failed without an elevated context.
3. SLAT is unverified.
4. Exact Windows edition/build and Windows Server service state require confirmation.
5. Current C:/D: free space could not be rechecked in this restricted session.
6. Docker installation, download, startup, and D: configuration are separately unauthorized.

## O. Recommended next action

Do not install Docker Desktop yet. First obtain a successful, separately approved elevated WSL2 setup (without a Linux distribution), handle any requested restart through a separate approval, and then re-run the read-only WSL and storage checks. After those results clear the blockers, request a new explicit approval naming Docker Desktop download/install, WSL 2 backend, and the later D: data-location configuration.

## Integrity and checksum record

- [Migration 004](../supabase/migrations/202610160004_checkout_runtime_hardening.sql) SHA-256: `456812B85635D5AFEED9F86AA113B0A906CBC1D5DD47A34101415C03C0621EEB` — matches expected.
- [Migration 005](../supabase/migrations/202610160005_studio_product_write_hardening.sql) SHA-256: `FE3746FD66E9A112B249D0D6AE0566D68C307CF8FEA931CD9829B6012F00F2BC` — matches expected.
- `git diff --check` must be run after this document is added.
- No Docker installation, installer download, elevation, Docker Engine startup, container creation, WSL configuration change, Supabase installation, SQL execution, remote write, migration edit, CMS edit, or `.env.local` edit was performed by this phase.

## Final status

**BLOCKED / UNKNOWN — WSL, SLAT, exact OS/service evidence, and current storage require additional verification before Docker approval.**
