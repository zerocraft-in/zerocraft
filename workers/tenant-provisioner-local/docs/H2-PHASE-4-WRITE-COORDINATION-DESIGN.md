# H2 Phase 4 — Write Coordination Design

**Status:** Design only. No implementation changes, no operational state changes.

**Objective:** Design a reliable coordination mechanism between `EncryptedFileTenantSecretStore.put()`, `EncryptedFileTenantSecretStore.delete()`, bulk secret rotation (`rotateSecrets()`), and secret verification (`verifySecrets()`), to prevent concurrent writes from corrupting or invalidating a rotation.

**Scope:** `workers/tenant-provisioner-local/src/secret-rotation.ts`, `workers/tenant-provisioner-local/src/secret-rotation-cli.ts`, `workers/tenant-provisioner-local/src/secrets.ts`, and related secret store implementations and tests.

---

## 1. Requirements

The coordination mechanism must provide the following guarantees:

**R1. No new secret writes while rotation owns the exclusive maintenance lock.**
Any `put()` or `delete()` invoked while an exclusive rotation is in progress must be rejected or blocked, not allowed to proceed.

**R2. Existing writes must finish before rotation begins.**
Rotation must not begin modifying files while a writer is mid-operation. In-flight writes must complete (or fail) before rotation acquires exclusive ownership.

**R3. A write must never proceed if maintenance mode is active.**
Once rotation has claimed exclusive ownership, subsequent `put()`/`delete()` calls must observe maintenance-active and reject.

**R4. Rotation must not begin if write coordination cannot be guaranteed.**
If the lock cannot be acquired, or writer status cannot be determined, rotation must fail closed and not proceed.

**R5. Process crashes must not silently leave the system in an unsafe state.**
A crashed writer or rotation process must not leave stale state that permits unsafe concurrent access without detection/recovery.

**R6. Lock ownership must be verified before release.**
Only the lock holder (PID + owner token) may release the lock, preventing a stale/resumed process from deleting another process's active lock after PID reuse.

**R7. Multiple processes must coordinate through shared filesystem state, not only in-memory mutexes.**
Coordination must work across separate Node.js processes using filesystem-based primitives; an in-memory mutex within a single process is insufficient.

**R8. Deployment compatibility.**
All writers sharing the secret directory must use the coordinated implementation. Old-version writers that do not create leases make the protocol unsafe because rotation cannot detect them. Coordination is designed for local filesystem assumptions only; NFS/network filesystems are unsupported unless separately validated.

---

## 2. Locking Model

### 2.1 Options evaluated

#### Option A — Shared/exclusive filesystem locks (OS-level `flock`/`LockFile`)

Uses OS advisory file locks (e.g., `flock` on POSIX, `LockFile` on Windows) on a dedicated lock file.

- **Reader/writer semantics:** Writers take shared (non-exclusive) locks; rotation takes an exclusive lock. OS grants exclusive lock only when no shared locks are held, and grants shared lock only when no exclusive lock is held. This naturally implements R1–R3.
- **Cross-process behavior:** OS-enforced; works across processes on the same machine.
- **Crash recovery:** OS releases locks automatically when the holding process dies or file descriptors close. Good crash safety.
- **Stale lock handling:** Minimal; OS cleans up on process death. Handles PID reuse gracefully because locks are tied to file descriptors, not PIDs.
- **Windows/POSIX differences:** POSIX `flock`/`fcntl` locking is well-supported; Windows `LockFile`/`LockFileEx` semantics differ (mandatory vs advisory, share modes). Node.js `fs` does not expose OS file locking directly; requires a native dependency or FFI.
- **Deadlock risks:** Low if lock ordering is consistent; writers block on exclusive, rotation blocks on shared holders.
- **Lock ownership/release:** OS ties lock to fd; close releases. No explicit ownership token needed for release safety.
- **Blocker:** Not available in Node.js standard library. Would require adding a native dependency (e.g., `file-lock`, `proper-lockfile`) or implementing FFI, which is outside "design only" scope and adds dependency risk.

#### Option B — Atomic lock-file protocol (current `RotationLock` approach)

Uses `fs.open(lockFile, "wx")` to atomically create a lock file containing PID + owner token + timestamp.

- **Reader/writer semantics:** Not natively reader/writer. Current `RotationLock` is mutual-exclusion only (exclusive for rotation vs rotation). To support shared writer leases vs exclusive rotation, the protocol must be extended: writers create/renew short-lived lease entries; rotation takes exclusive ownership and checks for active leases.
- **Cross-process behavior:** Works across processes via shared lock file on disk.
- **Crash recovery:** Leases carry timestamps; rotation can treat leases older than a TTL as expired. Crashed writers leave leases that expire by TTL.
- **Stale lock handling:** Existing `RotationLock` removes a lock only when owner PID confirmed dead via `process.kill(pid, 0)`; unreadable/unparseable locks are conservatively not removed. PID reuse is mitigated by owner token.
- **Windows/POSIX differences:** `fs.open("wx")` works identically on both platforms. POSIX mode bits vs Windows ACLs apply to the lock file itself but not to the locking logic.
- **Deadlock risks:** Writers block/wait on rotation; rotation waits on writers. Need bounded wait/TTL to avoid indefinite blocking.
- **Lock ownership/release:** Verified via PID + owner token before unlink (matches R6).

#### Option C — Maintenance marker plus writer leases

A marker file indicates maintenance-active. Writers check the marker before writing and abort if present. Rotation sets the marker, waits for in-flight writers to finish (via a writer counter/lease file), then proceeds.

- **Reader/writer semantics:** Writers check marker (shared read of marker), rotation sets marker exclusively. Writers increment a counter on start, decrement on end; rotation waits for counter == 0.
- **Cross-process behavior:** Via shared marker/counter files.
- **Crash recovery:** Marker persists after crash; recovery must clear stale marker. Crashed writer leaves counter incremented; needs TTL or process-liveness check.
- **Stale lock handling:** Manual TTL-based cleanup; risk of false positives if TTL too short.
- **Windows/POSIX differences:** File-based; consistent across platforms.
- **Deadlock risks:** Rotation waits for writers; writers wait if rotation active. Circular wait possible if not ordered.
- **Lock ownership/release:** Marker ownership must be verified; rotation is the sole marker setter.

### 2.2 Comparison

| Criterion | Option A (OS file locks) | Option B (atomic lock file + leases) | Option C (marker + counter) |
|-----------|--------------------------|--------------------------------------|-----------------------------|
| Reader/writer semantics | Native | Extensible (leases + exclusive) | Manual (counter) |
| Cross-process | Yes (OS) | Yes (filesystem) | Yes (filesystem) |
| Crash recovery | Automatic (fd close) | TTL-based leases | TTL + manual clear |
| Stale handling | OS-managed | PID + token, conservative | TTL-based |
| Windows/POSIX | Differ significantly | Consistent | Consistent |
| Node.js stdlib support | No (needs native dep) | Yes | Yes |
| Dependency risk | High | Low | Low |
| Complexity | Medium | Medium | Medium-High |

### 2.3 Recommended design

**Recommended: Option B — Atomic lock-file protocol extended with writer leases**, building on the existing `RotationLock` pattern.

**Why:**
- Uses only Node.js standard library (`fs` promises), no new native dependencies.
- Consistent behavior on Windows and POSIX (file creation is atomic on both).
- Extends the existing, reviewed `RotationLock` rather than introducing a new locking paradigm.
- Supports reader/writer semantics via writer lease entries alongside exclusive rotation ownership.
- PID + owner token ownership verification already satisfies R6.
- Conservative stale-handling (fail closed) matches the safety posture of Phase 3.

---

## 3. Operation Semantics

### Core primitives (proposed)

- **Maintenance lock file:** `<directory>/.tenant-secret-maintenance.lock` (or reused lock file). Contains `{ pid, token, mode: "exclusive" | "shared", startedAt, ttlMs }`.
- **Writer lease file:** `<directory>/.tenant-secret-writer-leases/` directory containing per-writer lease files `{ pid, token, startedAt, ttlMs, op: "put" | "delete" }`. Each writer creates its own lease file atomically (`wx`).
- **Lease TTL:** bounded (e.g., 30 seconds). TTL is used for diagnostics, timeout reporting, and operator alerts only. TTL expiration alone MUST NEVER authorize deletion or reclamation of a writer lease.
- **Rotation exclusive claim:** Rotation creates the lock file with `wx` and mode `exclusive`. If it exists, rotation reads it; if mode is `exclusive` and owner PID is confirmed dead (`ESRCH` via `process.kill(pid, 0)`), rotation may reclaim. If owner is alive, rotation waits/fails. TTL expiration alone does not authorize reclamation. A live PID with an old TTL is treated as active, not stale.

### 3.1 put()

```
1. Compute ref -> target file path.
2. Acquire writer lease:
   a. Create lease file <dir>/.tenant-secret-writer-leases/<pid>-<token>.lease with `wx`.
   b. Write { pid, token, op: "put", startedAt, ttlMs }.
   c. If `wx` fails with EEXIST (lease exists from crashed prior attempt by same pid/token), refresh or fail closed.
3. Check maintenance lock:
   a. Read lock file.
   b. If lock exists with mode == "exclusive" and owner PID is confirmed alive (`process.kill(pid, 0)` does not return `ESRCH`): maintenance active -> delete own lease, reject put with `MaintenanceActiveError`. TTL expiration alone does not make maintenance inactive; a live PID with an old lock is still active.
   c. If owner PID is confirmed dead (`ESRCH`): maintenance lock is stale; treat as not active (rotation will reclaim). `EPERM`, unreadable metadata, malformed lock files, and ambiguous ownership fail closed.
4. Perform write (write temp file, rename to target).
5. Release writer lease (delete own lease file) in finally.
   - Verify ownership (pid + token) before deleting.
6. On any error: delete own lease in finally, rethrow.
```

- **Reject or wait:** For simplicity and fail-closed safety, `put()` rejects immediately with `MaintenanceActiveError` if maintenance is active, rather than waiting indefinitely. An optional `waitMs` could be added later but is not required.
- **Lease in finally:** Always released even on write failure, so rotation is not blocked by a failed writer.

### 3.2 delete()

Identical to `put()` — same lease acquisition, maintenance check, write (unlink), lease release. Follows the same coordination policy as `put()`.

### 3.3 rotate()

```
1. Load key ring; validate active key present.
2. Acquire exclusive maintenance ownership:
   a. Attempt fs.open(lockFile, "wx") with mode "exclusive".
   b. If success: rotation owns the lock. Proceed to step 3.
   c. If EEXIST: read lock file.
      - If mode == "shared" (writer lease present in lock? no—writers use lease dir): treat as writer active.
      - If mode == "exclusive": check owner liveness (`process.kill(pid, 0)`).
        * Owner PID confirmed alive: cannot proceed -> return `MaintenanceActiveError` (fail closed).
        * Owner PID confirmed dead (`ESRCH`): stale. Attempt to unlink (ownership cannot be verified for a dead owner—conservative). If unlink succeeds, retry `wx`. If unlink fails, fail closed.
        * `EPERM`, unreadable metadata, malformed lock files, and ambiguous ownership fail closed.
        * TTL expiration alone never authorizes reclamation; a live PID with an expired TTL blocks rotation.
3. Prevent new writers: maintenance lock now active with mode "exclusive"; any subsequent put()/delete() lease check will see it and reject.
4. Wait for existing writers to finish:
   a. Scan lease directory.
   b. For each lease file, check owner liveness (`process.kill(pid, 0)`). A lease whose owner PID is confirmed alive blocks rotation, regardless of TTL. TTL is not used to determine liveness.
   c. Wait up to a bounded deadline (e.g., `writerDrainTimeoutMs`) for all confirmed-live writers to release their leases.
   d. Reclaim automatically only leases whose owner PID is positively confirmed dead (`ESRCH`).
   e. `EPERM`, unreadable metadata, malformed lease files, and ambiguous ownership fail closed.
   f. If confirmed-live leases remain after the drain deadline (writers still in flight): fail closed with `WriterDrainTimeoutError`. Do not proceed.
   g. Leases whose owner PID is confirmed dead may be removed by rotation after verifying it holds the exclusive lock.
5. Perform rotation (existing rotateSecrets logic): recoverStartBackups, walkSecretFiles, cleanupStaleTemps, processFile per file.
6. Verify results: run verifySecrets(); require complete === true, failed === 0.
7. Release exclusive ownership:
   a. Verify lock file still belongs to this rotation (pid + token match).
   b. Unlink lock file.
   c. If lock file missing or owned by another: do not unlink others' lock; log and mark released=false.
```

### 3.5 Writer/Rotation Race Protocol

The following ordering is required to guarantee that no write proceeds while rotation owns the exclusive maintenance lock, and that no rotation begins while a writer is mid-operation.

**Writer ordering (per `put()`/`delete()`):**
1. Atomically create its unique lease file (`wx`) — this is a reservation of intent, not write permission.
2. Check that no exclusive maintenance lock exists.
3. If maintenance is active, release its lease and reject the operation.
4. Only then perform the write (temp file + rename, or unlink for `delete`).
5. Release the lease in `finally`.

**Rotation ordering:**
1. Atomically acquire the exclusive maintenance lock (`wx`).
2. Prevent new writers from passing their maintenance check (the lock now exists with mode `exclusive`).
3. Scan existing writer leases.
4. Wait until all confirmed-live writers finish (release their leases).
5. Reclaim only leases whose owner PID is positively confirmed dead.
6. Fail closed on ambiguous leases or drain timeout.
7. Rotate and verify.
8. Release maintenance ownership only after safe completion.

**Why a writer creating a lease after maintenance acquisition cannot proceed with a write:**

Lease creation (writer step 1) and the maintenance check (writer step 2–3) are separate operations. Once rotation holds the exclusive maintenance lock, the lock file exists with mode `exclusive`. Any writer that reaches step 2 will read the lock, observe maintenance-active, and reject at step 3 — releasing its lease in step 5 without ever performing the write. Creating a lease therefore does not grant write permission; the maintenance check is the gate that comes after lease creation and before the write.

**Race: writer creates lease, then rotation acquires maintenance lock, then writer checks maintenance.**
- The writer already holds a live lease and has passed an earlier (pre-maintenance) check only if it checked before rotation acquired the lock.
- Rotation scans leases during its drain phase and finds this writer's live lease with a confirmed-alive PID.
- Rotation waits. The writer proceeds to its maintenance check, finds maintenance-active, rejects, and releases its lease.
- Rotation's drain observes the lease released and proceeds.
- This satisfies R2 (existing writes finish before rotation begins): if the writer had already passed its maintenance check and was mid-write when rotation acquired the lock, rotation waits for that write to finish and its lease to release.

**Race: rotation acquires maintenance lock, then a new writer creates a lease and checks maintenance.**
- The writer creates its lease (step 1), then checks maintenance (step 2) and finds the exclusive lock active.
- The writer rejects at step 3 and releases its lease at step 5.
- Rotation's drain either never sees this lease, or sees it already released. Either way the writer never performs a write while maintenance is active.
- This satisfies R3 (a write must never proceed if maintenance mode is active).

**Lease creation alone is never sufficient to authorize a write.** The maintenance check after lease creation is what enforces R1 and R3. A lease file that exists without a corresponding successful maintenance check is harmless; it is cleaned up by the writer's `finally` block or reclaimed by rotation only after dead-PID confirmation.

### 3.4 verify()

**Decision: verify does not require exclusive access; it is read-only.**

- `verifySecrets()` reads files only; it does not modify, delete, or replace anything.
- It can safely run while writes are active because reads are consistent with the file at read time (atomic rename in put means a reader sees either old or new envelope, never a torn write).
- However, if the operator wants a consistent snapshot for retirement-eligibility decisions, verify should acquire a **shared** maintenance indication (or at least check that no exclusive rotation is active) to avoid reporting mid-rotation transient states (e.g., a file temporarily missing between backup and replace).
- Recommended: `verify()` takes a **shared** indication via the same lock file (mode "shared") or simply proceeds read-only but documents that results reflect a point-in-time and may change under concurrent writes. For retirement eligibility decisions, the operator should quiesce writes first.

**Semantics:**
- Read-only; no lease required.
- If exclusive maintenance lock is active, verify can still run (read-only) but results may be transient; document this.
- If the goal is a stable retirement-eligibility assessment, coordinate: stop writes, run verify, then decide.

---

## 4. Crash and Recovery Scenarios

| Scenario | Behavior | Guarantee |
|----------|----------|-----------|
| Writer crashes while holding a lease | Lease file remains with timestamp. Rotation scans leases; a lease may be reclaimed automatically only when its owner PID is positively confirmed dead (`ESRCH`). TTL expiration alone never authorizes reclamation. A live PID with an expired TTL continues to block rotation. `EPERM`, unreadable metadata, malformed lease files, and ambiguous ownership fail closed. | Fail closed: rotation waits for drain timeout; only confirmed-dead-owner leases are reclaimed. |
| Rotation crashes before acquiring exclusive ownership | No lock file created (wx failed or process died before write). No maintenance state. Writers unaffected. Next rotation attempt retries normally. | Safe; no partial state. |
| Rotation crashes during replacement | Lock file remains (exclusive, dead owner). Backups may exist. Original preserved or replaced partially. recoverStartBackups handles leftover backups (state 1: original missing -> restore; state 2: both exist -> delete redundant or restore). Next rotation reclaims stale lock after PID-dead check. | Original always preserved until backup validated; backups never auto-deleted when ambiguous. |
| Rotation crashes after replacement but before backup cleanup | Backup + new original both exist. recoverStartBackups: original valid + decryptable => delete backup. Original invalid but backup valid => restore backup. | Recoverable to known-good state. |
| Lock file exists with dead PID | Rotation reads lock; `process.kill(pid, 0)` => `ESRCH`; treats as stale; attempts unlink; retries `wx`. TTL expiration alone never authorizes reclamation. | Stale lock reclaimed only after positive dead-PID confirmation. |
| PID reused by another process | Owner token in lock file differs from new process's token. Release() verifies pid+token before unlink, so a reused-PID process cannot delete another's active lock. Stale detection uses PID liveness; if PID alive but different process, rotation treats lock as held (fail closed) rather than assuming stale. | Safe against PID reuse; fail closed when ambiguous. |
| Machine reboot during rotation | All processes dead. Lock file + leases persist on disk. On restart, rotation sees lock with dead PID; reclaims after liveness check. Writer leases have dead PIDs; reclaimed only after positive dead-PID confirmation. `recoverStartBackups` runs before scanning. | State recoverable on next rotation run; no silent unsafe state. |
| Two processes request rotation simultaneously | Both attempt `wx` on lock file. Only one succeeds. The other reads the lock, sees owner alive, fails closed with MaintenanceActiveError (exit code 1). | Mutual exclusion guaranteed. |

**Fail-closed rule:** Whenever ownership or recovery state is ambiguous (unreadable lock, alive-but-unknown owner, unexpired TTL with dead process uncertainty), rotation must not proceed without explicit operator intervention.

---

## 5. API and Implementation Proposal

### 5.1 New classes/modules

**New module:** `src/maintenance-lock.ts`

- `MaintenanceLock` class: extends/reuses `RotationLock` pattern; supports `acquireExclusive()`, `acquireShared()`, `release()`, `isHeld()`, `ownerToken`, `pid`, `mode`.
- `WriterLease` class / `acquireWriterLease(directory, op)`: creates lease file, returns a releasable handle; `release()` deletes own lease after ownership verification.
- `MaintenanceActiveError` (extends SecretStoreError): thrown by put/delete when maintenance is active.
- `WriterDrainTimeoutError`: thrown when rotation cannot drain writers within deadline.

**Existing methods requiring changes:**
- `EncryptedFileTenantSecretStore.put()`: acquire writer lease, check maintenance, write, release lease in finally.
- `EncryptedFileTenantSecretStore.delete()`: same as put().
- `rotateSecrets()`: acquire exclusive maintenance lock, drain writer leases, run rotation, verify, release lock.
- `verifySecrets()`: optional shared-lock check; document read-only behavior under concurrency.
- `secret-rotation-cli.ts`: expose maintenance errors with clear exit codes/messages.

### 5.2 Configuration changes

- `TENANT_SECRET_MAINTENANCE_TTL_MS` (optional, default e.g. 30000): writer lease TTL.
- `TENANT_SECRET_WRITER_DRAIN_TIMEOUT_MS` (optional, default e.g. 60000): how long rotation waits for writers to finish.
- Lock file path and lease directory path remain under the secret directory (configurable via options, consistent with existing `lockFile` override).

### 5.3 Error types

- `MaintenanceActiveError`: put/delete/reject because rotation holds exclusive lock.
- `WriterDrainTimeoutError`: rotation could not drain writers within deadline.
- `StaleLockReclamationError`: could not reclaim stale lock; operator intervention needed.
- `LeaseOwnershipError`: attempt to release a lease not owned by this pid/token.

All extend `SecretStoreError` and use sanitized messages (no plaintext/key material).

### 5.4 Pseudocode

```
// Writer lease handle
class WriterLease {
  constructor(directory, op) { ... }
  async acquire(): Promise<void> {
    const leaseFile = leasePath(pid, token);
    const fd = await fs.open(leaseFile, "wx"); // fail if exists
    await fd.write(JSON.stringify({pid, token, op, startedAt, ttlMs}));
    await fd.close();
  }
  async release(): Promise<void> {
    // verify pid+token match file contents, then unlink
  }
}

// put()
async put(ref, value) {
  const lease = new WriterLease(directory, "put");
  await lease.acquire();
  try {
    if (await isMaintenanceActive()) {
      throw new MaintenanceActiveError("rotation in progress");
    }
    // existing write logic: temp file + rename
  } finally {
    await lease.release();
  }
}

// rotate()
async rotateSecrets(options) {
  const lock = new MaintenanceLock(lockFile);
  const acquired = await lock.acquireExclusive(); // wx + owner check
  if (!acquired) throw new MaintenanceActiveError("lock held");
  try {
    await drainWriterLeases(directory, deadline); // wait/clear stale
    const result = await rotateSecretsCore({...options});
    await verifySecrets(directory, keyRing); // require complete
    return result;
  } finally {
    await lock.releaseExclusive(); // verify ownership before unlink
  }
}
```

### 5.5 Test cases

- Writer acquires and releases lease successfully.
- put() rejected when maintenance lock active.
- delete() rejected when maintenance lock active.
- Rotation waits for in-flight writer lease to clear, then proceeds.
- Rotation fails closed when writer lease cannot be drained within deadline.
- Two rotations: second fails closed.
- Crashed writer lease (dead PID) cleared by rotation as stale.
- Crashed rotation lock (dead PID) reclaimed by next rotation.
- PID reuse: new process cannot release another's lock (token mismatch).
- verify() runs read-only while writes active (no corruption).
- Windows vs POSIX behavior (file creation atomicity, chmod no-op on Windows).

---

## 6. Testing Strategy

Distinguish **simulated unit tests** (single process, mocked fs/time, temp directories) from **genuine multi-process filesystem tests** (spawned child processes, real lock/lease files on disk).

### Simulated unit tests (implementable now)

- `WriterLease.acquire`/`release` correctness with fake fs.
- `put()` rejects with `MaintenanceActiveError` when mock maintenance active.
- `rotateSecrets` acquires exclusive lock; second concurrent acquire returns false.
- Stale lock detection: mock `process.kill` returns `ESRCH` => lock reclaimed only after dead-PID confirmation; TTL expiration alone does not trigger reclamation.
- PID reuse + token mismatch: release() refuses to unlink.
- Lease TTL expiration: old lease with a live PID is NOT treated as stale; TTL is diagnostic only. Dead-PID confirmation (`ESRCH`) is required before any lease reclamation.
- `verifySecrets()` read-only under concurrent simulated writes (no file modification).

### Genuine multi-process filesystem tests (future)

- Spawn two Node processes: Process A holds writer lease; Process B attempts rotation; B waits then proceeds after A releases.
- Spawn writer process doing repeated `put()`; rotation process runs concurrently; verify no `put()` succeeds while rotation exclusive, and no rotation begins while writer lease active.
- Crash simulation: kill writer mid-lease; rotation reclaims and proceeds.
- Kill rotation mid-replacement; next run recovers via `recoverStartBackups`.
- Two rotation processes simultaneously: exactly one succeeds, other exits code 1.
- Windows-specific: run lock-file `wx` atomicity and lease creation on Windows; confirm `chmod` no-op does not break locking.
- POSIX-specific: confirm directory 0700 / file 0600 alongside locking.

---

## 7. Migration Strategy

**Goal:** Introduce coordination without breaking existing callers of `put()`, `delete()`, `rotateSecrets()`, `verifySecrets()`.

### Safe rollout sequence

1. **Add `maintenance-lock.ts`** with `MaintenanceLock`, `WriterLease`, error types. No existing code imports it yet. Zero risk.
2. **Instrument `put()`/`delete()`** to acquire a writer lease and check maintenance, but **default to permissive mode**: if the maintenance lock file does not exist (i.e., no rotation has ever been run with the new code), writes proceed exactly as today. This preserves backward compatibility for existing deployments.
3. **Instrument `rotateSecrets()`** to acquire exclusive maintenance lock and drain writer leases. Rotations run with the new code coordinate with each other and with new-code writers.
4. **Operator opt-in:** Existing callers continue to work unchanged. New coordination behavior activates when both writer and rotation use the new code and share the same secret directory.
5. **No config change required** by default (TTL/drain timeout have safe defaults). Operators may tune via env vars.

### Backward-compatibility considerations

- Public signatures of `put(ref, value)`, `delete(ref)`, `rotateSecrets(options)`, `verifySecrets(directory, keyRing)` remain unchanged.
- `RotationLock` class remains available; `MaintenanceLock` builds on the same pattern.
- If a deployment mixes old-code writers (no lease) with new-code rotation, rotation cannot detect old-code writers. **Documentation must warn:** all writers in a deployment must be upgraded to the new code for coordination to be effective. Rotation will fail closed only if it detects active leases/locks; it cannot detect writers that do not participate in the protocol.
- The lease directory and lock file are created lazily; existing directories without them continue to operate.

### Rollback

- If issues arise, revert `put()`/`delete()`/`rotateSecrets()` instrumentation; the lock/lease files are harmless extra files in the secret directory (ignored by existing scanning because they don't end in `.secret`). No data migration needed.

---

## 8. Deliverable

### Architecture decision
Recommended: **Option B — Atomic lock-file protocol extended with writer leases**, implemented in a new `maintenance-lock.ts` module, building on the existing `RotationLock` pattern (PID + owner token, `wx` creation, conservative stale handling, fail-closed).

### Lock lifecycle
1. Writer creates lease file (`wx`) -> writes lease JSON -> performs put/delete -> releases lease (verify pid+token, unlink) in finally.
2. Rotation creates exclusive lock file (`wx`) -> if held by live owner, fails closed -> drains writer leases (wait for clear, clear stale) -> rotates -> verifies -> releases exclusive lock (verify ownership, unlink).
3. Lock file and lease files live under the secret directory; cleaned by rotation (stale leases) and by writers (own leases).

### State machine

```
Writer states: IDLE -> LEASE_HELD (maintenance check) -> WRITING -> RELEASED -> IDLE
                                   |-> REJECTED (maintenance active) -> IDLE

Rotation states: IDLE -> ACQUIRING_EXCLUSIVE -> LOCK_HELD -> DRAINING_WRITERS
                  -> ROTATING -> VERIFYING -> RELEASING -> IDLE
                  |-> FAILED_CLOSED (at any transition if precondition unmet)
```

### Pseudocode
Provided in Section 5.4.

### Failure matrix
Provided in Section 4.

### Test plan
Provided in Section 6 (simulated + genuine multi-process).

### Migration plan
Provided in Section 7.

### Open questions and limitations

- **Mixed-version deployments:** Old-code writers do not create leases; rotation cannot detect them. Coordination is effective only when all writers are upgraded. This must be documented; rotation cannot guarantee safety against non-participating writers.
- **Blocking vs rejecting writers:** Current design rejects `put()` immediately when maintenance is active (fail fast). An alternative is bounded waiting (retry until rotation completes). Rejected writers must retry at the application level; this is an operational consideration.
- **Lease directory cleanup:** Empty lease files from crashed writers are cleared by rotation during drain; if rotation never runs, stale lease files accumulate. They are harmless (not `.secret` files) but should be documented.
- **NFS/network filesystems:** `wx` atomicity and `process.kill(pid, 0)` semantics may differ on network filesystems; coordination is designed for local disk (matching the "local" worker scope).
- **verify() under concurrent writes:** verify is read-safe but results are point-in-time; retirement-eligibility decisions should be made with writes quiesced.
- **No OS-level file lock:** Relies on file-existence protocol rather than `flock`/`LockFile`; a process that crashes without releasing leaves lease/lock files until PID-liveness cleanup (dead-owner confirmation). TTL expiration alone never triggers cleanup. This is acceptable given fail-closed semantics but means brief windows where stale state exists until the next rotation/run.
- **Not yet implemented:** All of the above is design only; no code changes have been made.

---
