# H2 Phase 4 Step 2 — Secret Store Integration Impact Analysis

**Status:** Planning and read-only inspection only. No implementation changes.

**Objective:** Prepare an implementation plan for integrating the standalone write-coordination module (`src/maintenance-lock.ts`) into `EncryptedFileTenantSecretStore.put()`, `EncryptedFileTenantSecretStore.delete()`, `rotateSecrets()`, `verifySecrets()`, and the secret rotation CLI.

**Scope:** Inspection of `workers/tenant-provisioner-local/src/secret-rotation.ts`, `workers/tenant-provisioner-local/src/secret-rotation-cli.ts`, `workers/tenant-provisioner-local/src/secrets.ts`, `workers/tenant-provisioner-local/src/maintenance-lock.ts`, and related tests. The output is a plan document only — no source files are to be modified.

**Target document:** `workers/tenant-provisioner-local/docs/H2-PHASE-4-STEP-2-INTEGRATION-PLAN.md`

---

## 1. Current State Summary

### Existing modules (inspected, unchanged)

| Module | Key responsibilities |
|--------|----------------------|
| `src/secrets.ts` | `EncryptedFileTenantSecretStore` (put/get/delete), `InMemoryTenantSecretStore`, `NullTenantSecretStore`, key ring parsing (`parseKeyRingFromEnv`), envelope format v1/v2, AAD construction, `TENANT_SECRETS_DIR` handling |
| `src/secret-rotation.ts` | `rotateSecrets()`, `verifySecrets()`, `RotationLock`, `isKeyReferenced()`, `isRetirementEligible()`, backup-first crash-safe replacement (`atomicReplaceWithBackup`), backup recovery (`recoverStartBackups`), hard-link/symlink/path-traversal guards |
| `src/secret-rotation-cli.ts` | CLI `rotate`/`verify` commands, `loadKeyRing()`, exit codes 0/1/2, `--execute`/`--dry-run` |
| `src/maintenance-lock.ts` | `MaintenanceLock` (acquireExclusive/release/inspectLockFile/forceClearStaleLock/isMaintenanceActive), `WriterLease` (acquire/release), `acquireWriterLease()`, `drainWriterLeases()` |
| `src/maintenance-lock.test.ts` | 40 tests (33 unit + 7 genuine multi-process) |

### Known limitations (from Phase 3 & Phase 4 Step 1)

- `RotationLock` coordinates rotation-vs-rotation only; it does NOT coordinate with live `put()`/`delete()` calls.
- Application writes must be paused externally for the entire duration of rotation (documented warning in source headers and CLI help).
- Directory fsync is not implemented; crash durability of directory entries not guaranteed.
- Windows ACLs require separate operator configuration; `chmod(0o600/0o700)` is a no-op on Windows.
- No real filesystem or staging integration has been performed yet.
- `forceClearStaleLock()` has a residual path-based read/unlink TOCTOU; recovery requires all processes to be stopped first.

---

## 2. Integration Requirements

The following 12 design requirements must all be satisfied:

**R1. Every put/delete operation must acquire and release a writer lease.**
Each `EncryptedFileTenantSecretStore.put()` and `delete()` call must acquire a writer lease via `acquireWriterLease()` before writing and release it in a `finally` block.

**R2. Rotation must acquire the exclusive maintenance lock before draining writer leases.**
`rotateSecrets()` must call `MaintenanceLock.acquireExclusive()` before calling `drainWriterLeases()`.

**R3. Rotation must not begin until all existing writer leases are drained.**
After acquiring the maintenance lock, `rotateSecrets()` must call `drainWriterLeases()` and wait for all confirmed-live writer leases to be released before modifying any `.secret` file.

**R4. New writers must be rejected while maintenance is active.**
`acquireWriterLease()` checks the maintenance lock after lease creation and before returning; if maintenance is active, it releases its lease and throws `MaintenanceActiveError`.

**R5. All lease releases must happen in finally blocks.**
Writer leases acquired by `put()`/`delete()` must be released in `finally` blocks so a failed write does not leak a lease and block rotation indefinitely.

**R6. Fail closed on malformed locks, malformed leases, unknown PID states, timeout, and filesystem errors.**
Any ambiguous metadata, unreadable file, or drain timeout must cause the operation to fail closed, not proceed unsafely.

**R7. Preserve existing encryption format compatibility (v1/v2).**
Integration must not change the v1/v2 envelope format, key derivation, AAD binding, or ciphertext structure.

**R8. Preserve existing rotation restartability and backup recovery behavior.**
`recoverStartBackups()`, `cleanupStaleTemps()`, and the backup-first replacement strategy must continue to operate exactly as today.

**R9. Verification must remain read-only.**
`verifySecrets()` must not acquire writer leases or modify any files. It may read the maintenance lock for informational purposes only.

**R10. Mixed-version uncoordinated writers must be treated as an unsafe deployment condition.**
If any writer sharing the secret directory does not use the coordinated implementation (does not create leases), rotation cannot detect it and coordination is ineffective. This must be documented as a deployment precondition.

**R11. Never automatically delete encryption keys.**
`isRetirementEligible()` and `isKeyReferenced()` remain read-only reports; no integration may delete key material automatically.

**R12. Recovery must remain operator-controlled.**
`forceClearStaleLock()` remains the only path to clear a stale maintenance lock, requiring all processes to be stopped first. No automatic stale-lock reclamation.

---

## 3. Exact Methods and Files to Modify

### 3.1 `src/secrets.ts` — `EncryptedFileTenantSecretStore`

| Method | Required change |
|--------|-----------------|
| `constructor()` | No optional coordination-mode flag. Coordination is mandatory for all `put()`/`delete()` operations. Store a reference to the secret directory for lease/lock file resolution. No change to encryption logic. |
| `put(ref, value)` | **Always** acquire writer lease via `acquireWriterLease({directory, operation: "put"})` before writing; release lease in `finally`. Reject with `MaintenanceActiveError` if maintenance is active. Coordination setup failure (e.g. unable to create lease directory) fails closed — no write proceeds without a lease. Test-only dependency injection of a no-op lease is acceptable for unit tests but must not be available in production builds. |
| `delete(ref)` | **Same mandatory coordination as `put()`:** acquire writer lease (`operation: "delete"`), release in `finally`, reject if maintenance active. Coordination setup failure fails closed — no delete proceeds without a lease. |
| `get(ref)` | No change. Read-only; no lease required. |
| `ensureDirectory()` | No change to directory creation; no coordination bypass flag. |

### 3.2 `src/secret-rotation.ts` — `rotateSecrets()`

| Location | Required change |
|----------|-----------------|
| Start of `rotateSecrets()` | Acquire `RotationLock` first (`<directory>/.tenant-secret-rotation.lock` via `RotationLock.acquire()`), then acquire `MaintenanceLock` (`<directory>/.tenant-secret-maintenance.lock` via `acquireExclusive()`). Return fail-closed error if either acquisition fails. If `RotationLock` is held but `MaintenanceLock` acquisition fails, release `RotationLock` before returning the error. |
| After both locks acquired, before scanning | Call `drainWriterLeases({directory})`; fail closed on `WriterDrainTimeoutError` or ambiguous metadata. |
| After rotation + verification | Release `MaintenanceLock` then `RotationLock` in reverse order, each in its own `finally` block with ownership verification before unlink. |
| `recoverStartBackups()` | No change. |
| `atomicReplaceWithBackup()` | No change. |
| `cleanupStaleTemps()` | No change. |

### 3.3 `src/secret-rotation.ts` — `verifySecrets()`

| Location | Required change |
|----------|-----------------|
| Entry point | No lease acquisition. Optionally call `MaintenanceLock.isMaintenanceActive()` and include a warning in results if maintenance is active (results may be transient). No file modification. |

### 3.4 `src/secret-rotation-cli.ts`

| Location | Required change |
|----------|-----------------|
| `runRotate()` | Surface `MaintenanceActiveError` and `WriterDrainTimeoutError` with clear messages and exit code 1. |
| `runVerify()` | Optionally report whether maintenance is active (read-only informational field). |
| Help text | Update to mention write coordination and that writers must use the coordinated implementation. |

### 3.5 No changes to

- `src/maintenance-lock.ts` (already complete and audited)
- `src/maintenance-lock.test.ts` (already complete and audited)
- `src/errors.ts` (existing `SecretStoreError` sufficient; new error types already in maintenance-lock.ts)
- Migrations, commerce templates, or any other worker modules

### 3.6 Existing `RotationLock` — retention and ordering

The existing `RotationLock` class (`src/secret-rotation.ts`) coordinates rotation-vs-rotation only; it does NOT coordinate with live `put()`/`delete()` calls. After integrating `MaintenanceLock`/`WriterLease`:

| Question | Decision |
|----------|----------|
| Is `RotationLock` still needed? | **Yes, retained.** `RotationLock` continues to prevent two rotation processes from operating on the same directory simultaneously. `MaintenanceLock` adds coordination between rotation and live writers — a separate concern. |
| Is `RotationLock` replaced? | **No.** `MaintenanceLock` does not subsume `RotationLock`'s rotation-vs-rotation mutual exclusion. |
| Is `RotationLock` removed? | **No.** Removal would reintroduce the rotation-vs-rotation race that `RotationLock` already prevents. |
| Redundant or contradictory locking? | **Avoided.** The two locks serve distinct purposes and are acquired in a strict order: `RotationLock` is acquired first (rotation-vs-rotation exclusion), then `MaintenanceLock` (rotation-vs-writer exclusion). Both are released in reverse order in `finally` blocks. |
| Acquisition order | 1. `RotationLock.acquire()` (exclusive rotation lock) → 2. `MaintenanceLock.acquireExclusive()` (maintenance against writers) → 3. `drainWriterLeases()` → 4. rotate → 5. `MaintenanceLock.release()` → 6. `RotationLock.release()`. |
| Release order | Reverse of acquisition: maintenance lock released first, then rotation lock. Both in `finally` blocks with ownership verification before unlink. |
| `RotationLock.acquire()` fails (returns false) | Rotation cannot proceed; no `MaintenanceLock` is attempted. Return fail-closed error immediately. |
| `MaintenanceLock.acquireExclusive()` fails (returns false) | `RotationLock` is released first (ownership-verified unlink), then rotation returns fail-closed error. No rotation performed. |

**Rationale:** `RotationLock` protects against two concurrent rotation processes; `MaintenanceLock` protects rotation against live `put()`/`delete()` writers. They are complementary, not redundant. Acquiring `RotationLock` first ensures that only one rotation process can attempt maintenance-lock acquisition and writer drainage at a time, preventing two rotations from racing on the same writer leases.

---

## 4. Lock Lifecycle and Ordering

### 4.1 Writer (`put()` / `delete()`)

```
1. Call acquireWriterLease({directory, operation})
   a. Atomically create unique lease file (wx)
   b. Check maintenance lock via isMaintenanceActive()
   c. If maintenance active: release lease, throw MaintenanceActiveError
   d. Return WriterLease handle
2. Perform the write/delete (temp file + rename, or unlink)
3. Release writer lease in finally (verify pid+token before unlink)
```

**Key invariant:** A writer never holds a lease after the maintenance lock is acquired by rotation, because step 1c rejects any new lease once maintenance is active. A writer that obtained a lease before rotation acquired the lock is allowed to finish (R2/R3), and rotation's drain waits for it.

### 4.2 Rotation (`rotateSecrets()`)

```
1. RotationLock.acquire() -> fail closed if false (rotation lock held by live owner, or stale but not yet reclaimed)
2. MaintenanceLock.acquireExclusive() -> fail closed if false; if fails, release RotationLock first
3. drainWriterLeases({directory}) -> fail closed on timeout/ambiguity
   - Waits for confirmed-live writers to release leases
   - Reclaims only confirmed-dead-owner leases with metadata revalidation
4. Perform existing rotateSecrets logic (recoverStartBackups, walk, processFile)
5. Run verifySecrets(); require complete === true && failed === 0
6. MaintenanceLock.release() in finally (verify ownership before unlink)
7. RotationLock.release() in finally (verify ownership before unlink)
```

**Key invariant:** Rotation holds `RotationLock` and `MaintenanceLock` for the entire duration of steps 3–6. No new writer can pass the maintenance check during this window (R4). Confirmed-live writers that obtained leases before step 2 are allowed to finish (step 3 drains them).

### 4.3 Verification (`verifySecrets()`)

```
1. Read files only; no lease acquisition, no modification
2. Optionally: read MaintenanceLock state via readMetadata()/isMaintenanceActive()
   - Informational only; does not block verification
3. Return VerificationResult (read-only)
```

---

## 5. Error Propagation and Cleanup Behavior

### 5.1 `put()` / `delete()` error paths

| Error condition | Behavior |
|-----------------|----------|
| `acquireWriterLease()` throws `MaintenanceActiveError` | Propagate to caller; no lease held; no write performed |
| `acquireWriterLease()` throws `SecretStoreError` (filesystem/config) | Propagate; no write performed |
| Write fails after lease acquired | Release lease in `finally`; if lease release also fails, surface both errors via `AggregateError` (write error + cleanup error); preserve original write error as primary |
| Write succeeds, lease `release()` fails | Surface cleanup failure via `AggregateError` or dedicated `LeaseReleaseError`; clearly report that the write may have completed but coordination cleanup failed; lease file remains on disk |
| Lease `release()` fails due to ownership mismatch/unreadable | Do not automatically delete the lease file; fail closed; require operator intervention |

**Writer lease release failure handling:** A lease release failure must never be silently swallowed. If the write/delete succeeded but the lease could not be released, the operation result must clearly indicate that the secret change may have persisted but coordination cleanup failed. The lease file must remain on disk (it is harmless to `.secret` scanning but blocks rotation drainage until reclaimed as a confirmed-dead-owner lease).

**Writer lease cleanup — safe handling by lease metadata state:**

| Lease metadata state | Handling |
|----------------------|----------|
| Owner PID confirmed dead (`ESRCH`) | Reclaimed automatically by `drainWriterLeases()` with metadata revalidation (pid + token match + still dead). Never reclaimed by TTL alone. |
| Owner PID confirmed alive | Blocks rotation; fail closed; wait for drain timeout. TTL expiration alone does not authorize reclamation. |
| Owner PID unknown (`EPERM`/other) | Fail closed; treated as alive; blocks rotation. |
| Malformed/unreadable lease metadata | `drainWriterLeases()` classifies as ambiguous → `WriterDrainTimeoutError` (fail closed). No automatic reclamation. |
| Lease release ownership mismatch | `WriterLease.release()` does not unlink; fails closed; lease remains. |
| Lease cleanup filesystem error | Best effort; do not throw; lease remains on disk. |

**Unresolved operational requirement:** Manual recovery of malformed or ambiguous writer leases (where `drainWriterLeases()` cannot reclaim) is not defined by any operator API in `maintenance-lock.ts`. There is no `forceClearStaleLock()` equivalent for writer leases. Blind deletion of lease files is never recommended. An unresolved-gap entry should be tracked before production use: operators need a defined, safe procedure to clear stranded writer leases when automatic reclamation cannot proceed.


### 5.2 `rotateSecrets()` error paths

| Error condition | Behavior |
|-----------------|----------|
| `RotationLock.acquire()` returns false | Return error immediately; no rotation performed; no locks held |
| `MaintenanceLock.acquireExclusive()` returns false | Release `RotationLock` first (ownership-verified unlink), then return fail-closed error; no rotation performed |
| `drainWriterLeases()` throws `WriterDrainTimeoutError` | Release both locks in `finally` (maintenance first, then rotation); if either release also fails, surface both via `AggregateError`; no rotation performed |
| Individual file processing fails | Preserve original file (existing behavior); record failure; continue with other files |
| `verifySecrets()` reports incomplete | Return error; do not proceed as success; release both locks in `finally` |
| `MaintenanceLock.release()` fails ownership check / unlink fails | Do not silently ignore; preserve original rotation result/error and surface cleanup failure via `AggregateError`; lock file remains on disk; require operator recovery via `forceClearStaleLock()` after confirming all processes stopped |
| `RotationLock.release()` fails ownership check / unlink fails | Do not silently ignore; preserve original rotation result/error and surface cleanup failure via `AggregateError`; lock file remains on disk; RotationLock stale-lock recovery is built into `acquire()` (see Section 6) but operator intervention may be required if `acquire()` cannot reclaim |
| Both rotation operation and lock release fail | Surface via `AggregateError` combining operation error + lock-release error |

**Maintenance-lock release failure handling:** A maintenance-lock release failure must never be silently swallowed and must never trigger automatic `forceClearStaleLock()`. If rotation completed but the lock could not be released, the lock file remains and `isMaintenanceActive()` returns true (fail closed) until an operator explicitly clears it via `forceClearStaleLock()` after confirming all processes are stopped.

**RotationLock release failure handling:** `RotationLock` stale-lock recovery is built into its own `acquire()` method: a subsequent rotation process reads the stale lock, confirms the owning PID is dead via `process.kill(pid, 0) === ESRCH`, and unlinks + retries. If PID liveness cannot be established (`unknown`) or the owner is alive, `acquire()` returns false and fail closes. No separate operator API is required for RotationLock recovery, but if `acquire()` cannot reclaim a stale lock, operator intervention is needed.


### 5.3 `verifySecrets()` error paths

| Error condition | Behavior |
|-----------------|----------|
| File unreadable/malformed | Record as `unreadable`/`malformed`; `complete = false`; no exception |
| Maintenance lock active | Informational warning in results; verification still proceeds (read-only) |

---

## 6. Crash Recovery Behavior

### 6.1 Writer crashes while holding a lease

- Lease file remains on disk with timestamp.
- Rotation's `drainWriterLeases()` classifies it: `process.kill(pid, 0)` → `ESRCH` (dead) → reclaim with metadata revalidation; `alive`/`unknown` → fail closed (wait for drain timeout).
- TTL expiration alone never authorizes reclamation.

### 6.2 Rotation crashes before acquiring MaintenanceLock

- If `RotationLock` was acquired but the process crashed before `MaintenanceLock.acquireExclusive()`: the `RotationLock` file persists. A subsequent rotation's `RotationLock.acquire()` reads the stale lock, confirms the owning PID is dead via `process.kill(pid, 0) === ESRCH`, unlinks it, and retries acquisition. If the owner is alive or liveness is unknown, `acquire()` returns false (fail closed).
- Writers unaffected. Next rotation attempt retries normally.

### 6.3 Rotation crashes while holding RotationLock

- `RotationLock` file persists (exclusive, dead owner).
- Recovery is built into `RotationLock.acquire()`: the next rotation process reads the lock, confirms the owning PID is dead (`ESRCH`), unlinks the lock file, and retries acquisition. This is safe against concurrent rotation because `wx` ensures only one process can create the lock at a time.
- If PID liveness cannot be established (`unknown`) or the owner is alive, `acquire()` returns false and fail closes.
- No separate operator API is required for `RotationLock` recovery; recovery is automatic via `acquire()`.

### 6.4 Rotation crashes while holding MaintenanceLock

- `MaintenanceLock` file persists (exclusive, dead owner). `isMaintenanceActive()` returns true (fail closed) on the next run.
- Recovery is operator-controlled via `MaintenanceLock.forceClearStaleLock(lockFile, pid, token)`: the operator reads the stale lock metadata (via `inspectLockFile()`), confirms the owner PID is dead, and explicitly clears the lock. `forceClearStaleLock()` verifies pid + token match AND dead-PID status before unlinking.
- `forceClearStaleLock()` is **only** for the maintenance lock; it is NOT a writer-lease cleanup mechanism. Writer leases are reclaimed automatically by `drainWriterLeases()` only when the owner PID is confirmed dead.
- After the maintenance lock is cleared, `recoverStartBackups()` runs before scanning.

### 6.5 Rotation crashes during replacement

- `RotationLock` and/or `MaintenanceLock` file persists (exclusive, dead owner). Backups may exist. Original preserved until backup validated.
- `recoverStartBackups()` handles leftover backups (state 1: original missing → restore; state 2: both exist → delete redundant or restore).
- Lock recovery follows Section 6.3 (RotationLock, automatic via `acquire()`) and Section 6.4 (MaintenanceLock, operator-controlled).

### 6.6 Rotation crashes after replacement but before backup cleanup

- Backup + new original both exist. `recoverStartBackups()`: original valid + decryptable → delete backup; original invalid but backup valid → restore backup. Recoverable to known-good state.
- Locks persist as in Sections 6.3/6.4.

### 6.7 Machine reboot during rotation

- All processes dead. `RotationLock` + `MaintenanceLock` files + leases persist on disk.
- On restart: `RotationLock.acquire()` automatically reclaims a dead-owner `RotationLock` (PID `ESRCH`). `MaintenanceLock` requires operator clearing via `forceClearStaleLock()` (dead-PID confirmation + pid+token match).
- `recoverStartBackups()` runs before scanning once both locks are clear.

### 6.8 Two processes request rotation simultaneously

- Both attempt `RotationLock.acquire()` via `wx` on the rotation lock file. Only one succeeds. The other reads the lock, sees owner alive, fails closed (exit code 1). Mutual exclusion guaranteed at the rotation level.
- The winning rotation then attempts `MaintenanceLock.acquireExclusive()`; same `wx` mutual exclusion applies.


---

## 7. Windows ACL Limitations

- `chmod(0o600)` / `chmod(0o700)` is a no-op on Windows for ACL enforcement (documented in `maintenance-lock.ts` and `secrets.ts`).
- Lock file, lease files, and lease directory rely on POSIX mode bits that Windows does not enforce.
- **Operator requirement:** Configure NTFS ACLs on the secret directory, lease directory, lock file, and lease files to grant access only to the operator/service account. Remove "Everyone", "Authenticated Users", "Users" grants.
- Verify effective permissions with `icacls` or PowerShell `Get-Acl`; do not rely on `chmod` on Windows.
- `process.kill(pid, 0)` works on Windows (ESRCH = dead, EPERM = alive-but-unsignallable, other = unknown).
- `wx` atomic creation works on Windows.

---

## 8. Local Filesystem Limitations

- Coordination is designed for **local disk only** (matching the "local" worker scope).
- `wx` atomicity and `process.kill(pid, 0)` semantics may differ on NFS/network filesystems; unsupported unless separately validated.
- `forceClearStaleLock()` has a residual path-based read/unlink TOCTOU; recovery requires all provisioner, writer, and rotation processes to be stopped first.
- Directory fsync is not implemented; crash durability of directory entries not guaranteed (pre-existing limitation from Phase 3).

---

## 9. Backward Compatibility

### 9.1 Public interfaces preserved

| Interface | Status |
|-----------|--------|
| `put(ref, value)` | Signature unchanged; **always** acquires writer lease; may throw `MaintenanceActiveError` if maintenance is active or coordination setup fails |
| `delete(ref)` | Signature unchanged; **always** acquires writer lease; may throw `MaintenanceActiveError` if maintenance is active or coordination setup fails |
| `get(ref)` | Unchanged |
| `rotateSecrets(options)` | Signature unchanged; acquires `RotationLock` then `MaintenanceLock`; may return fail-closed errors (new) |
| `verifySecrets(directory, keyRing)` | Unchanged; read-only |

**No production bypass:** There is no configuration flag, environment variable, or runtime mode that silently disables writer-lease coordination for `put()`/`delete()`. Coordination setup failure fails closed — no write or delete proceeds without a successfully acquired lease. Test-only dependency injection of a no-op lease is acceptable for unit tests but must be excluded from production builds.

### 9.2 Mixed-version deployment risk

- **Critical precondition:** All writers sharing a secret directory must use the coordinated implementation (create leases via `acquireWriterLease()`).
- Old-version writers that do not create leases are invisible to rotation's drain. Rotation cannot detect them and cannot guarantee safety against them.
- **Deployment rule:** All writer processes and the rotation process must be upgraded together, or the directory must be quiesced (no writers) during the transition.

### 9.3 Existing secret directories

- Lock file (`.tenant-secret-maintenance.lock`) and lease directory (`.tenant-secret-writer-leases/`) are created lazily; existing directories without them continue to operate.
- Lock/lease files do not end in `.secret` and are ignored by existing `walkSecretFiles()` scanning.
- No data migration required.

---

## 10. Migration / Rollout Strategy

### Safe rollout sequence

1. **Add `maintenance-lock.ts`** (already complete and audited). Zero risk; not yet imported by any existing module.

2. **Instrument `EncryptedFileTenantSecretStore.put()` and `delete()`** to acquire/release writer leases.
   - Default behavior when no maintenance lock exists: writes proceed exactly as today (backward compatible).
   - When maintenance lock is active: writes rejected with `MaintenanceActiveError`.

3. **Instrument `rotateSecrets()`** to acquire exclusive maintenance lock and drain writer leases before rotating.
   - Rotations run with the new code coordinate with each other and with new-code writers.

4. **Deployment precondition:** All writer processes sharing a secret directory must be upgraded to the coordinated implementation before rotation is used in production. Coordination is mandatory for every `put()`/`delete()` call — not optional per-directory.

5. **No config change required** by default. `maintenance-lock.ts` uses safe defaults (TTL 30s, drain timeout 60s). No environment variable or flag disables coordination.

### Rollback

- Revert `put()`/`delete()`/`rotateSecrets()` instrumentation; lock/lease files are harmless extra files ignored by existing scanning.
- No data migration; no key changes.

---

## 11. Required Tests

### 11.1 Unit tests (single process, implementable now)

| Test | What it verifies |
|------|-----------------|
| `put()` acquires and releases writer lease | Lease lifecycle on write |
| `delete()` acquires and releases writer lease | Lease lifecycle on delete |
| `put()` rejected with `MaintenanceActiveError` when maintenance active | R4 |
| `delete()` rejected with `MaintenanceActiveError` when maintenance active | R4 |
| `put()` lease released in `finally` on write failure | R5 |
| `delete()` lease released in `finally` on write failure | R5 |
| `put()` write succeeds but lease release fails → surface via `AggregateError` | R5 |
| `delete()` write succeeds but lease release fails → surface via `AggregateError` | R5 |
| `rotateSecrets()` acquires `RotationLock` then `MaintenanceLock` in order | R2, 3.6 |
| `rotateSecrets()` acquires exclusive maintenance lock | R2 |
| `rotateSecrets()` drains writer leases before rotating | R3 |
| `rotateSecrets()` fails closed when drain times out | R6 |
| `rotateSecrets()` release failure surfaced via `AggregateError`; operator recovery required | R6 |
| `verifySecrets()` remains read-only (no lease, no modification) | R9 |
| `verifySecrets()` reports maintenance-active informational warning | R9 |
| Malformed lock fails closed (rotation) | R6 |
| Malformed lease fails closed (drain) | R6 |
| Dead-owner lease reclaimed during drain | R6 |
| Live-owner lease NOT reclaimed during drain (TTL expired) | R6 |

### 11.2 Genuine multi-process tests (separate OS processes, barrier synchronization)

| Test | What it verifies |
|------|-----------------|
| Two rotations concurrently: exactly one acquires lock | Mutual exclusion |
| Live rotation holds lock; second rotation fails | Mutual exclusion |
| Writer holds lease; rotation drain times out | R2/R3 |
| Writer releases lease; rotation drain proceeds | R2/R3 |
| Dead writer lease reclaimed by rotation | Crash recovery |
| Two writers concurrently: both get leases (different files) | Lease isolation |
| Writer vs rotation race interleavings | R1–R4 |
| `forceClearStaleLock()` vs concurrent acquire: no double ownership | Recovery safety |
| Mixed-version writer (no lease) undetected by rotation | R10 (documented risk) |
| Rotation completes but lock release fails → `AggregateError`; lock remains; operator recovery required | Recovery safety |
| Writer completes but lease release fails → `AggregateError`; write may have persisted; coordination cleanup failed | Recovery safety |

### 11.3 Test distinction

- **Unit tests:** Use isolated temporary directories, synthetic keys, synthetic secret files. No real credentials, no real secret directories, no network calls. Implementable now.
- **Genuine multi-process tests:** Spawn separate Node.js processes contending on the same lock/lease files on disk, coordinated through a barrier directory (not timing-only sleeps). Require compiled `dist/` output.

---

## 12. Rollback Plan

### When to roll back

- `put()`/`delete()` consistently fail with `MaintenanceActiveError` outside of planned maintenance windows.
- `rotateSecrets()` fails closed due to persistent drain timeouts (live writers not releasing leases).
- `forceClearStaleLock()` cannot be safely executed (processes cannot be stopped).

### Rollback procedure

1. Stop all rotation and writer processes sharing the directory.
2. Revert `put()`/`delete()`/`rotateSecrets()` instrumentation to pre-integration state.
3. Rollback safety for stale coordination artifacts:
   - Any remaining `.lease` files in `.tenant-secret-writer-leases/` are ignored by existing `walkSecretFiles()` scanning (they do not end in `.secret`) and are harmless to pre-integration writes.
   - Any remaining `.tenant-secret-maintenance.lock` file blocks future rotation until cleared via `forceClearStaleLock()` after confirming all processes stopped (operator-controlled recovery, per Phase 4 Step 1).
   - Do not automatically delete lock or lease files during rollback; they are harmless to scanning but must be managed through the operator recovery path if they persist.
4. Restart processes; writes proceed exactly as before integration.
5. No data migration needed; no key changes.

### What rollback does NOT require

- No decryption/re-encryption of existing `.secret` files.
- No key retirement or deletion.
- No migration of envelope format.

---

## 13. Implementation Sequence

| Step | Action | Verification |
|------|--------|--------------|
| 1 | `maintenance-lock.ts` already complete and audited | Unit + multi-process tests pass (40 tests) |
| 2 | Instrument `put()` to acquire/release writer lease | Unit tests pass; `put()` rejected during maintenance |
| 3 | Instrument `delete()` to acquire/release writer lease | Unit tests pass; `delete()` rejected during maintenance |
| 4 | Instrument `rotateSecrets()` to acquire lock + drain leases | Unit + multi-process tests pass; mutual exclusion verified |
| 5 | Optionally informational maintenance check in `verifySecrets()` | Read-only; no behavior change |
| 6 | Update CLI help text and error surfacing | CLI tests pass |
| 7 | Full test suite (`npx vitest run`) | All tests pass |
| 8 | `npx tsc --noEmit` | Clean |
| 9 | Independent security audit before production use | — |

---

## 14. Approval Gates

| Gate | Requirement before proceeding | Approver |
|------|------------------------------|----------|
| G1 | Unit tests for `put()`/`delete()` lease coordination pass | Developer |
| G2 | Multi-process mutual exclusion and drain tests pass | Developer + reviewer |
| G3 | Full test suite passes (287+ tests) | CI |
| G4 | `npx tsc --noEmit` clean | CI |
| G5 | Backward compatibility confirmed (existing tests unchanged) | Reviewer |
| G6 | Mixed-version deployment risk documented and acknowledged | Operator |
| G7 | Independent security audit sign-off | Security reviewer |

No gate may be bypassed. Proceeding past any gate without approval is a procedure violation.

---

## 15. Safety Boundaries (Reiteration)

- **Documentation and planning only.** No source modifications in this step.
- **Do not modify migrations or commerce templates.**
- **Do not access real secret directories.**
- **Do not read, request, print, or modify credentials or encryption keys.**
- **Do not make network or database calls.**
- **Do not run rotation or verification CLI against real directories.**
- **Do not enable managed provider mode.**
- **Do not start the worker.**
- **Do not create hosted Supabase projects.**
- **Do not delete or retire encryption keys.**
- **Do not claim production readiness.** Await independent security audit after implementation.

---
