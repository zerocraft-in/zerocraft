# H2 Phase 3 — Operational Readiness & Staging Integration Plan

**Status:** Planning and documentation only. No implementation changes, no operational state changes.

**Scope:** `workers/tenant-provisioner-local/src/secret-rotation.ts`, `workers/tenant-provisioner-local/src/secret-rotation-cli.ts`, `workers/tenant-provisioner-local/src/secrets.ts`, and related tests/configuration.

**Purpose:** Prepare the local tenant secret rotation system for a future controlled staging integration. This document defines the operational procedures, platform-specific security requirements, test plan, rollback plan, staging gates, known limitations, and go/no-go criteria that must be satisfied before staging execution begins.

---

## 1. Pre-Rotation Checklist

The following checks must be completed and confirmed by an operator before any rotation run (execute or dry-run) against a target directory. These checks are operational procedures, not implemented automated checks.

### 1.1 Verify active and legacy key configuration

- Confirm `TENANT_SECRETS_ACTIVE_KEY_ID` is set and non-empty.
- Confirm the active key material (`TENANT_SECRETS_KEY_<activeKeyId>`) is present and parses as a 32-byte AES-256 key.
- Confirm whether a legacy key (`TENANT_SECRETS_LEGACY_KEY_ID`) is configured, and if so, that its material is present in the key ring.
- Confirm no duplicate key IDs exist in the key ring.
- Confirm key IDs match the validation pattern `^[a-zA-Z0-9_-]+$`.

**Source confirmation:** `parseKeyRingFromEnv()` in `secrets.ts` enforces these at load time and fails closed on missing/duplicate/inactive key material. `secret-rotation-cli.ts` `loadKeyRing()` re-validates that the active key is present before acquiring the lock.

### 1.2 Verify secret directory ownership and permissions

- Confirm the secret directory exists and is owned by the operator/service account that runs rotation.
- On POSIX: confirm directory mode is `0700` (owner-only read/write/execute).
- On Windows: confirm the directory ACL grants access only to the operator/service account; no inherited broad grants (e.g., "Everyone", "Authenticated Users", "Users").
- Confirm no other user accounts or groups have write or delete access to the directory.
- Confirm rotation will not traverse outside the configured root (path-traversal guard is implemented in `walkSecretFiles`).

**Source confirmation:** `EncryptedFileTenantSecretStore.ensureDirectory()` attempts `chmod(0o700)` and fails on POSIX if it cannot; on Windows it skips and leaves ACL configuration to the operator. `rotateSecrets()` resolves the directory and `walkSecretFiles()` rejects paths outside the root and skips symlinks.

### 1.3 Verify available disk space

- Confirm sufficient free disk space on the volume hosting the secret directory for:
  - One full backup copy of every `.secret` file (`.bak` suffix).
  - One temp file per secret being processed (`.tmp` suffix).
  - Temporary overhead for filesystem metadata.
- Estimate: at minimum, free space >= total size of all `.secret` files plus overhead.
- Confirm no disk quotas would be exceeded.

**Source confirmation:** Not implemented automatically. `rotateSecrets()` creates backups and temp files but performs no pre-flight disk-space check. This is an operator responsibility.

### 1.4 Verify backup and recovery prerequisites

- Confirm a recent backup of the entire secret directory exists outside the rotation target (off-directory copy).
- Confirm the operator can restore from that backup independently of the rotation tool.
- Confirm `recoverStartBackups()` behavior is understood: leftover `.bak` files from an interrupted run are recovered before scanning (state 1: original missing -> restore backup; state 2: both exist -> delete redundant backup or restore if original invalid).
- Confirm multiple backup candidates for the same original are preserved and require operator intervention (never auto-deleted).
- Confirm invalid or undecryptable backups are preserved and require operator intervention.

**Source confirmation:** `recoverStartBackups()` in `secret-rotation.ts` implements backup recovery. Backups are never treated as secret envelopes during normal scanning (`.bak` suffix). Invalid backups and multiple candidates are preserved. `atomicReplaceWithBackup()` creates the backup before replacing the original and deletes it only after successful validation.

### 1.5 Confirm no unexpected files or symlinks

- Confirm the directory contains only expected `.secret` files plus rotation artifacts (`.lock`, `.bak`, `.tmp`) from prior runs.
- Confirm no symbolic links exist in the directory tree (rotation skips symlinks entirely).
- Confirm no hard-linked secret files exist (rotation skips files with `nlink > 1`).
- Confirm no unrelated sensitive files are present that could be accidentally exposed by permission changes.

**Source confirmation:** `walkSecretFiles()` skips symbolic links, skips hard-linked files (`stat.nlink > 1`), and ignores non-`.secret` files. Hard-linked files are counted in `skippedHardLinks` and make `complete` false.

### 1.6 Confirm application writes are paused

- Confirm all `EncryptedFileTenantSecretStore.put()` operations are paused/stopped for the entire duration of the rotation.
- Confirm no background job, scheduler, or worker process is writing secrets.
- Confirm writes remain paused until rotation completes and verification passes.

**Source confirmation:** The rotation lock (`RotationLock`) coordinates only between rotation processes. It does NOT coordinate with live `put()` calls. A concurrent `put()` can replace a secret file between rotation's read and replacement steps. SHA-256 content-hash checking detects most concurrent modifications but cannot eliminate all TOCTOU races. Writes must be paused externally (proposed mechanism — see Section 2).

---

## 2. Application Write Coordination

Document a safe procedure to stop or pause all `EncryptedFileTenantSecretStore.put()` operations during rotation. **No coordination mechanism is currently implemented.** Everything below is a proposed mechanism and must be clearly labeled as such.

### 2.1 How to identify active writers

**Proposed (not implemented):**

- Audit the codebase for all call sites of `EncryptedFileTenantSecretStore.put()`.
- Check the worker process (`src/worker.ts`) and any background jobs or scheduled tasks that invoke `put()`.
- Check for any process that writes `.secret` files directly into the rotation target directory.
- Log or trace `put()` calls to confirm which components are writing and how frequently.

### 2.2 How to confirm writers have stopped

**Proposed (not implemented):**

- Stop the worker process and confirm no `put()` calls are in flight.
- Observe application logs for a sustained period with no `put()` activity.
- Confirm no other process holds file handles open on `.secret` files in the directory.
- Optionally, temporarily point the store at a read-only or null directory to force any writer to surface errors.

### 2.3 How to prevent new writes

**Proposed (not implemented):**

- Stop the worker/service process that owns the store.
- Disable or remove background jobs/schedulers that invoke `put()`.
- Optionally, make the secret directory read-only at the filesystem level (POSIX `chmod 0500`; Windows ACL remove Write/Delete) as an additional guard, restoring it after rotation.
- Use an application-level feature flag or maintenance mode to reject `put()` calls (must be added to application code — not present).

### 2.4 How to resume writes after verification

**Proposed (not implemented):**

- Confirm rotation completed with `complete === true`, `failed === 0`, and `skippedHardLinks === 0`.
- Run `verifySecrets()` and confirm all files are `ok` (v2, active key), zero `v1Files`, zero `unknownKeyFiles`, zero `malformedOrUnreadableFiles`.
- Confirm key retirement eligibility is not accidentally triggered (retirement is never automatic).
- Restart the worker/service and re-enable background jobs/schedulers.
- Confirm new `put()` calls produce v2 envelopes with the active key.

### 2.5 Failure handling if write coordination cannot be guaranteed

- **Do not proceed with rotation** if `put()` cannot be paused.
- The rotation lock does not protect against live `put()` calls; proceeding anyway risks TOCTOU races where a concurrent `put()` replaces a file between rotation's read and replacement steps.
- The SHA-256 content-hash check in `atomicReplaceWithBackup()` detects most concurrent modifications and aborts that file's replacement (original preserved), but it cannot eliminate all races.
- Escalate to the operator; do not run rotation against a live directory with active writers.

**Source confirmation:** `secret-rotation.ts` header comment and `secret-rotation-cli.ts` help text both state that application writes must be paused for the entire duration and that the lock does not coordinate with `put()`.

---

## 3. Platform-Specific Security

### 3.1 POSIX

#### Verify directory permissions

- Confirm the secret directory mode is `0700` (owner rwx only).
- `EncryptedFileTenantSecretStore.ensureDirectory()` attempts `chmod(0o700)` and throws on POSIX if it cannot.
- Rotation temp files and backup files are created with `0o600` where supported.

#### Verify secret and backup file permissions

- Confirm `.secret` files are `0600` (owner read/write only).
- Confirm `.bak` backup files are `0600`.
- Confirm `.tmp` temp files are `0600`.
- Confirm the lock file is `0600` (created via `fs.open` default mode; verify).
- Confirm the process umask does not grant broader access; `setRestrictivePermissions()` explicitly calls `chmod(0o600)` on temp and backup files.

#### Explain the 0600/0700 requirements

- `0700` on the directory prevents other users from listing, creating, or deleting files in the secret directory.
- `0600` on secret/backup/temp files prevents other users from reading ciphertext or key material.
- Even though ciphertext is authenticated-encrypted (AES-256-GCM), file-level access control is defense-in-depth: it limits exposure of ciphertext, prevents tampering attempts, and protects backup files that hold pre-rotation plaintext-equivalent ciphertext.
- These are POSIX mode bits; they are enforced by the kernel on POSIX filesystems.

**Source confirmation:** `setRestrictivePermissions()` and `ensureDirectory()` attempt `chmod` and fail on POSIX if unable. `atomicReplaceWithBackup()` opens backups with `fs.open(backup, "wx", 0o600)` and `chmod(0o600)`.

### 3.2 Windows

#### Define required NTFS ACL restrictions

- The secret directory must have an NTFS ACL granting full control only to the operator/service account that runs rotation.
- Remove or deny access for "Everyone", "Authenticated Users", "Users", and any other built-in groups.
- Disable inheritance on the directory and replace with explicit, restrictive entries (or verify inherited permissions do not grant broad access).
- `.secret`, `.bak`, `.tmp`, and `.lock` files must inherit or receive the same restrictive ACL: read/write/delete only for the owner account.
- Key material in environment variables (`TENANT_SECRETS_KEY_*`) must be protected by Windows account/service isolation, not by file permissions.

#### Explain how to verify inherited permissions

- Use `icacls <directory>` or PowerShell `Get-Acl` to inspect the effective ACL.
- Confirm inheritance is disabled or that inherited ACEs do not grant write/delete/read to unintended principals.
- Confirm the effective access for "Everyone", "Authenticated Users", and "Users" is empty or denies access.
- Effective permissions, not nominal ownership, determine actual access.

#### Do not claim POSIX chmod provides equivalent Windows security

- On Windows, `fs.chmod(0o600)` / `chmod(0o700)` is a no-op for ACL enforcement. POSIX mode bits are not enforced by the NTFS ACL model.
- `setRestrictivePermissions()` and `ensureDirectory()` catch chmod errors on Windows and continue without failing, explicitly noting that Windows does not enforce POSIX mode bits.
- Windows security must be achieved through separate operator-configured NTFS ACLs, not through `chmod`.

---

## 4. Staging Integration Test Plan

Tests are divided into **automated unit tests** (implementable now, using isolated temp directories) and **future real-filesystem staging tests** (not yet performed; require staging credentials and a real staging secret directory).

### 4.1 Legacy v1 to active v2 rotation

- **Automated unit test:** Create a `.secret` file with a v1 envelope encrypted under the legacy key. Run rotation with the active + legacy key ring. Assert the file is now v2 encrypted under the active key and `get(ref)` returns the original plaintext. Assert original plaintext/key material never logged.
- **Future staging test:** Perform the same against a real staging directory containing legacy v1 tenant secrets, after write coordination and pre-rotation checks.

### 4.2 Old v2 key to active v2 rotation

- **Automated unit test:** Create a `.secret` file with a v2 envelope encrypted under an old key (keyId present in ring but not active). Run rotation. Assert the file is re-encrypted under the active key and plaintext is preserved.
- **Future staging test:** Perform against a real staging directory containing v2 secrets encrypted under a rotated-out key.

### 4.3 Dry-run behavior

- **Automated unit test:** Run `rotateSecrets({ dryRun: true })` against a directory with v1 and old-key v2 files. Assert no `.secret`, `.bak`, or `.tmp` files are created or modified. Assert outcomes report `migrated` with `dryRun === true`. Assert the CLI defaults to dry-run (no `--execute`).
- **Future staging test:** Run the CLI dry-run against a real staging directory to confirm no writes occur.

### 4.4 Interrupted rotation and recovery

- **Automated unit test:** Simulate interruption after backup creation but before temp replacement (original missing, backup present). Run recovery (`recoverStartBackups`) and assert the backup is restored to the original path and decryptable. Simulate interruption after temp replacement but before backup deletion (both exist, original valid) and assert the redundant backup is deleted. Simulate interruption where the original is invalid and the backup is valid; assert the backup is restored.
- **Future staging test:** Interrupt a real staging rotation (e.g., kill process mid-run) and confirm recovery restores a consistent state.

### 4.5 Invalid or corrupted backup

- **Automated unit test:** Place a `.bak` file with invalid JSON or undecryptable content for an original that is missing. Run recovery. Assert the backup is preserved (not restored), both remain absent/missing, and the operator is required to intervene. Assert no secret data is lost beyond what was already missing.
- **Future staging test:** Corrupt a backup file in a real staging directory and confirm the tool preserves it and reports the condition.

### 4.6 Multiple backup candidates

- **Automated unit test:** Create two `.bak` files matching the same original path (different random hex). Run recovery. Assert neither backup is touched or deleted; both are preserved. Assert `complete` reflects the need for operator intervention.
- **Future staging test:** Create multiple backup candidates in a real staging directory and confirm they are preserved.

### 4.7 Lock contention and stale locks

- **Automated unit test:** Acquire the lock in one process; attempt rotation in another and assert it cannot proceed (lock held, exit code 1). Simulate a stale lock (owner PID dead) and assert the lock is removed and rotation proceeds. Simulate a lock with unreadable/unparseable content and assert it is not removed (conservative).
- **Future staging test:** Run two rotation CLI invocations concurrently against a real staging directory and confirm only one proceeds.

### 4.8 Hard-linked files

- **Automated unit test:** Create a hard-linked `.secret` file (two directory entries, same inode, `nlink > 1`). Run rotation. Assert the file is skipped, counted in `skippedHardLinks`, and `complete` is false. Assert neither hard link is modified.
- **Future staging test:** Not applicable to staging unless hard links exist; confirm skipping behavior if encountered.

### 4.9 Permission failures

- **Automated unit test:** Create a `.secret` file that is unreadable (mode `0000` on POSIX) and run rotation. Assert the file outcome is `failed`, the original is preserved, and other files still process. Assert `setRestrictivePermissions()` failure on POSIX causes the run to fail closed (not silently continue with broad permissions).
- **Future staging test:** Set restrictive ACLs on a real staging file to simulate a permission failure and confirm the tool fails closed without exposing data.

### 4.10 Verification and key-retirement eligibility

- **Automated unit test:** Run `verifySecrets()` after rotation. Assert all files are `ok`, `v1Files === 0`, `unknownKeyFiles === 0`, `malformedOrUnreadableFiles === 0`, `complete === true`. Run `isRetirementEligible(result, oldKeyId)` and assert `true` only when zero files reference the old key. Confirm `isKeyReferenced()` and `isRetirementEligible()` never perform deletion.
- **Future staging test:** Run verify against a real staging directory and confirm retirement eligibility before any operator-initiated key retirement (outside this utility).

### Distinction

- **Automated unit tests:** Use isolated temporary directories, synthetic keys, and synthetic secret files. No real credentials, no real secret directories, no network calls. Implementable now.
- **Future real-filesystem staging tests:** Require staging credentials, a real staging secret directory, staging application writers paused, and operator approval at each gate (Section 6). Not yet performed.

---

## 5. Rollback Plan

### 5.1 When to stop rotation

- Stop immediately if any file outcome is `failed` and the failure cannot be attributed to a known, safe cause.
- Stop if `complete === false` due to `skippedHardLinks > 0` or unexpected conditions.
- Stop if write coordination cannot be guaranteed (live `put()` detected).
- Stop if disk space runs out mid-run.
- Stop if the rotation lock is held by another live process and cannot be confirmed stale.
- Stop if any backup verification fails (hash mismatch or decrypt failure).

### 5.2 How to preserve backups

- Never delete backups as part of rollback. Backups are the recovery source.
- `atomicReplaceWithBackup()` deletes a backup only after the replacement is validated. If rollback is needed before validation, the backup still exists.
- If rotation is interrupted, backups from `recoverStartBackups()` are preserved; multiple candidates and invalid backups are never auto-deleted.
- Maintain the off-directory backup taken in the pre-rotation checklist (Section 1.4) as an additional recovery source.

### 5.3 How to restore a known-good state

- If the original `.secret` is missing and a valid backup exists: restore the backup to the original path (after structural validation and, if a key ring is available, decrypt-authentication).
- If both backup and original exist and the original is invalid/undecryptable but the backup is valid: restore the backup to the original path.
- If both are invalid or undecryptable: restore from the off-directory pre-rotation backup (operator procedure, outside this tool).
- If a temp file remains (`.tmp`): delete it; temp files are never trusted as valid secrets.
- Never restore from a backup that fails decrypt-authentication with the configured key ring.

### 5.4 How to validate restored secrets

- Run `verifySecrets()` against the restored directory.
- Confirm all files are `ok` (v2, active key) or `v1` if legacy is still expected.
- Confirm `complete === true`, `v1Files === 0` (if rotation target was full migration), `unknownKeyFiles === 0`, `malformedOrUnreadableFiles === 0`.
- Confirm `get(ref)` returns expected plaintext for a sample of references (plaintext never logged).
- Confirm key reference counts match expectations.

### 5.5 How to avoid deleting old keys prematurely

- Key retirement is never performed by this utility. `isRetirementEligible()` only reports eligibility; it never deletes.
- Do not delete any key material (`TENANT_SECRETS_KEY_*`) until:
  - `verifySecrets()` reports `complete === true`,
  - `v1Files === 0`,
  - `malformedOrUnreadableFiles === 0`,
  - `isKeyReferenced(result, oldKeyId) === false`,
  - And the operator confirms retirement outside this tool.
- Keep old keys in the key ring until retirement is explicitly confirmed, to preserve decryptability of any file not yet rotated.
- Never recommend deleting backups or encryption keys as an automatic rollback step.

---

## 6. Staging Integration Gates

Each gate below requires explicit operator approval before proceeding. No gate is automated; none can be bypassed by the tool.

| Gate | Requirement before proceeding | Approver |
|------|------------------------------|----------|
| G1 | Using staging credentials | Staging credentials are provisioned and approved for use in this test only. | Operator + security review |
| G2 | Accessing a real staging secret directory | The staging directory path is confirmed, ownership/permissions verified (Section 3), pre-rotation checklist complete (Section 1). | Operator |
| G3 | Executing a staging rotation | Write coordination confirmed (Section 2), dry-run passed against staging, rollback backup taken (Section 5.2). | Operator |
| G4 | Resuming application writes | Rotation `complete === true`, `failed === 0`, `verifySecrets()` passes, key retirement not triggered. | Operator |
| G5 | Retiring an old encryption key | `isRetirementEligible() === true`, `isKeyReferenced() === false`, operator confirms retirement outside this utility. | Operator |

All gates must be logged with timestamp, approver, and evidence. Proceeding past any gate without approval is a procedure violation.

---

## 7. Known Limitations

- **Directory fsync is not implemented.** `fsync()` on file data does not guarantee directory-entry durability. After a sudden power loss or crash, renamed files may not appear in the directory, or previously renamed files may reappear. Full crash durability would require fsync on the directory file descriptor after each rename; this is not currently implemented.
- **Windows ACLs require separate operator configuration.** `chmod(0o600)` / `chmod(0o700)` is a no-op on Windows for ACL enforcement. POSIX mode bits do not provide equivalent Windows security. The operator must configure NTFS ACLs separately.
- **Rotation lock does not coordinate with live `put()` calls.** `RotationLock` only coordinates between rotation processes. A concurrent `EncryptedFileTenantSecretStore.put()` can replace a secret file between rotation's read and replacement steps. SHA-256 content-hash checking detects most concurrent modifications but cannot eliminate all TOCTOU races. Writes must be paused externally.
- **No real filesystem or staging integration has been performed yet.** All testing to date is automated unit testing against isolated temporary directories. No staging credentials, no real staging secret directory, no real secret data has been touched.

---

## 8. Go / No-Go Criteria

Staging execution may begin only when ALL of the following are measurable and satisfied:

1. **Key configuration:** `TENANT_SECRETS_ACTIVE_KEY_ID` set; active key material present and valid (32 bytes); legacy key (if any) present and valid; no duplicates.
2. **Directory security:** POSIX `0700` directory and `0600` files confirmed, OR Windows NTFS ACLs confirmed restrictive; no unexpected files/symlinks/hard links.
3. **Disk space:** Free space >= total size of all `.secret` files plus backup/temp overhead, confirmed by measurement.
4. **Off-directory backup:** A recent backup of the staging secret directory exists outside the rotation target and can be restored independently.
5. **Write coordination:** All `put()` writers confirmed stopped; no live `put()` activity observed for a sustained period.
6. **Dry-run pass:** `rotateSecrets({ dryRun: true })` against the staging directory reports `migrated`/`unchanged` counts with `failed === 0` and no files modified.
7. **Verify pass:** `verifySecrets()` reports `complete === true`, `v1Files === 0` (or expected), `unknownKeyFiles === 0`, `malformedOrUnreadableFiles === 0`, `skippedHardLinks === 0`.
8. **Gate approvals:** Gates G1–G3 all approved explicitly by the operator (and security review for G1).
9. **Rollback readiness:** Restore procedure tested (in isolation) and operator confirm they can restore from backup.

**No-Go:** Any criterion unmeasured, unsatisfied, or unapproved blocks staging execution. Do not proceed on partial compliance.

---
