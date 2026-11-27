# H2 Phase 4 Step 3 — Writer Lease Recovery Design

**Status:** Design only. No implementation changes.

**Objective:** Design a safe operator-controlled recovery mechanism for stranded writer lease files (`.tenant-secret-writer-leases/*.lease`) that `drainWriterLeases()` cannot automatically reclaim, and define the concurrency protections, crash scenarios, and test cases for writer lease recovery.

**Scope:** `src/maintenance-lock.ts` (specifically `WriterLease`, `drainWriterLeases`, `classifyLease`, `readJsonFile`, `processStatus`) and the integration plan in `docs/H2-PHASE-4-STEP-2-INTEGRATION-PLAN.md`.

**Target document:** `workers/tenant-provisioner-local/docs/H2-PHASE-4-STEP-3-WRITER-LEASE-RECOVERY-DESIGN.md`

**Safety boundaries:** Design and documentation only. No source code modifications. No migrations or commerce templates. No network, database, credentials, or real secret directory access. No rotation or verification CLI execution against real data. No source code changes.

---

## 1. Objective

Define how stranded writer lease files are handled when automatic reclamation by `drainWriterLeases()` cannot proceed. The design must:

- Handle confirmed-dead PID, live PID, unknown PID, malformed metadata, ownership mismatch, and filesystem errors safely.
- Never reclaim a lease based on TTL alone.
- Never blindly delete lease files.
- Define safe operator recovery and concurrency protections.
- Fail closed and document the limitation when safe recovery cannot be guaranteed.

---

## 2. Current Behavior (Verified from Implementation)

The following behavior is implemented in `src/maintenance-lock.ts` and is used as the basis for this design:

### 2.1 `drainWriterLeases()` automatic reclamation

`drainWriterLeases()` re-scans the lease directory each poll iteration and classifies each lease via `classifyLease()`:

- **`alive`** (PID confirmed via `process.kill(pid, 0)` success): lease blocks rotation. Rotation waits/polls until the writer releases it.
- **`dead`** (`ESRCH`): lease is eligible for automatic reclamation, but only after metadata revalidation (fresh read of the file confirming `pid` + `token` match). **PID liveness is NOT re-checked immediately before unlink** — only at classification time.
- **`unknown`** (unreadable file, malformed JSON, missing `pid`, or non-`ESRCH`/non-success `process.kill` result such as `EPERM`): classified as ambiguous. `drainWriterLeases()` throws `WriterDrainTimeoutError` (fail closed). **No automatic reclamation.**

Before unlinking a dead-owner lease, `drainWriterLeases()` re-reads the file and verifies `fresh.pid === c.metadata.pid` AND `fresh.token === c.metadata.token`. It does **NOT** re-check `processStatus(fresh.pid) === "dead"` immediately before unlinking. If anything changed, it skips unlinking.

### 2.2 `WriterLease.release()`

A writer releases its own lease by verifying `pid` + `token` match before unlinking. Idempotent. Does not unlink if ownership does not match.

### 2.3 TTL

Lease `ttlMs` is used for diagnostics and timeout reporting only. **TTL expiration alone never authorizes reclamation.** A live PID with an expired TTL continues to block rotation.

### 2.4 What does NOT exist

There is **no** `forceClearStaleLock()` equivalent for writer leases. `MaintenanceLock.forceClearStaleLock()` applies only to the maintenance lock (`.tenant-secret-maintenance.lock`), not to writer lease files. There is **no operator API** to inspect or manually clear a stranded writer lease. There is no read-only inspection API that returns writer lease metadata. This is an explicit design gap documented in Section 8.

---

## 3. Lease Metadata States and Safe Handling

| Lease metadata state | Detection | Automatic reclamation by `drainWriterLeases()` | Operator recovery | Notes |
|----------------------|-----------|-----------------------------------------------|-------------------|-------|
| Owner PID confirmed dead (`ESRCH`) | `classifyLease()` returns `dead` | Yes — only after metadata revalidation (pid + token match) | Not needed (auto-reclaimed) | Safe; metadata revalidated immediately before unlink, but PID liveness is NOT re-checked at unlink time |
| Owner PID confirmed alive | `classifyLease()` returns `alive` | No — blocks rotation; wait for drain timeout | No — writer is live; do not delete | TTL expiration alone does not change this |
| Owner PID unknown (`EPERM` or other non-`ESRCH` error) | `classifyLease()` returns `unknown` | No — `WriterDrainTimeoutError` (fail closed) | Not supported — see Section 8 | Ambiguous; fail closed |
| Malformed/unreadable lease metadata | `readJsonFile()` returns `null` | No — classified `unknown` → `WriterDrainTimeoutError` | Not supported — see Section 8 | Blind deletion never recommended |
| Ownership mismatch (pid/token do not match a live writer) | `WriterLease.release()` check fails | Not applicable (release() does not unlink) | No | Fail closed; lease remains |
| Lease cleanup filesystem error (unlink fails) | `fs.unlink()` throws | Best effort; lease remains; retried on next drain iteration | Not supported — see Section 8 | Lease remains on disk |

**Key rule:** TTL expiration alone never moves a lease from any state to "reclaimable." A live PID with an expired TTL is treated as `alive` and continues to block rotation.

---

## 4. Recovery Barrier for Operator Recovery (Proposed, Not Implemented)

This section describes a **proposed** mechanism to prevent new writers and rotations from starting during operator recovery of a stranded writer lease. It is **not implemented** in `maintenance-lock.ts` or any other source file. No source code changes have been made. This section exists solely to document what would be required for safe operator recovery.

### 4.1 Barrier design using existing locks

The existing locking primitives can, in combination, form a barrier that prevents new writers and rotations from starting:

| Lock | Purpose | Mechanism |
|------|---------|-----------|
| `RotationLock` | Prevents concurrent rotation processes | `fs.open(wx)` on `.tenant-secret-rotation.lock`; fail closed (returns false) if held by live owner; automatic stale reclamation if owner PID is dead (`ESRCH`) |
| `MaintenanceLock` | Prevents live writers | `fs.open(wx)` on `.tenant-secret-maintenance.lock`; fail closed (returns false) if any lock file exists; writers check `isMaintenanceActive()` after creating their lease |

### 4.2 Exact acquisition order

To establish the barrier, the following sequence must be followed **in order**:

1. `RotationLock.acquire()` — Acquire the rotation lock. If it returns false (held by live owner, or stale but not reclaimable), stop. Do not proceed.
2. `MaintenanceLock.acquireExclusive()` — Acquire the maintenance lock. If it returns false, **release `RotationLock` first** (ownership-verified unlink), then stop. Do not proceed.
3. `drainWriterLeases()` — Drain all confirmed-live writer leases. Reclaim only confirmed-dead-owner leases with metadata revalidation. If `WriterDrainTimeoutError` is thrown (live writers remain, or ambiguous/malformed leases exist), release both locks in reverse order and stop. Do not proceed to manual recovery.

Once both locks are held and leases are drained:
- **New writers are blocked:** Any call to `acquireWriterLease()` creates its lease file via `wx`, then checks `isMaintenanceActive()`. Since the maintenance lock file exists, `isMaintenanceActive()` returns true, and the writer releases its lease and throws `MaintenanceActiveError`. The writer never proceeds to write.
- **New rotations are blocked:** Any call to `RotationLock.acquire()` gets `EEXIST` on `fs.open(wx)` and returns false (fail closed). The rotation cannot proceed.
- **Existing live writers:** `drainWriterLeases()` waits for them to release their leases. If a writer is stuck (live PID, not releasing), rotation fails closed with `WriterDrainTimeoutError`.

### 4.3 Failure handling

| Failure | Handling |
|---------|----------|
| `RotationLock.acquire()` returns false | Rotation cannot proceed. No `MaintenanceLock` is attempted. Return fail-closed error immediately. |
| `MaintenanceLock.acquireExclusive()` returns false | Release `RotationLock` first (ownership-verified unlink), then return fail-closed error. No rotation performed. |
| `drainWriterLeases()` throws `WriterDrainTimeoutError` | Release both locks in reverse order (maintenance first, then rotation). If either release also fails, surface via `AggregateError`. No manual recovery performed. |
| Malformed/unknown lease remains after drain | `drainWriterLeases()` already threw `WriterDrainTimeoutError`. Both locks are released. Manual intervention required, but no operator API exists for lease inspection or deletion. |
| Lock release failure (ownership mismatch/unreadable) | Do not silently ignore. Surface via `AggregateError`. Lock file remains. Operator recovery of the lock (not the lease) is possible via `MaintenanceLock.forceClearStaleLock()` after confirming all processes stopped. |

### 4.4 Limitations of the barrier

- **The barrier only prevents NEW writers and rotations.** It cannot retract a lease that a writer already created and is actively using. `drainWriterLeases()` must wait for that writer to release its lease.
- **The barrier does not provide a mechanism to delete a stranded writer lease.** Even with both locks held, there is no API function to unlink a lease file. The operator would have to manually delete the file outside the API, which is **not supported**.
- **Residual TOCTOU:** Between the operator's read-only inspection of a lease file and any manual `unlink()`, a new writer could create a lease at the same path (via `wx`). There is no atomic compare-and-unlink primitive. This residual risk is honestly documented.
- **If safe recovery cannot be guaranteed** (e.g., liveness cannot be established, a writer might be alive, metadata cannot be revalidated), **fail closed** and do not delete the lease.

### 4.5 Conclusion: Manual writer-lease recovery is NOT SUPPORTED

**Manual writer-lease recovery is NOT SUPPORTED by any implemented API.** There is no `forceClearStaleLease()` or equivalent function. There is no read-only inspection API that returns writer lease metadata. The operator cannot safely delete a stranded writer lease through the provided code. This is an explicit design gap that must be resolved before production use.

---

## 5. Crash Scenarios

| Scenario | Behavior | Safety posture |
|----------|----------|----------------|
| Writer crashes while holding a lease | Lease file remains with timestamp. `drainWriterLeases()` classifies: dead → reclaim with revalidation; alive/unknown → fail closed (wait for drain timeout). | Fail closed; no blind deletion |
| Writer crashes, PID reused by a new process | New process has a different token. `drainWriterLeases()` metadata revalidation (pid + token match) prevents reclaiming the old lease under the new process's identity. `WriterLease.release()` ownership check prevents the new process from deleting the old lease. | Safe against PID reuse |
| Rotation crashes during `drainWriterLeases()` | Lease files remain. Next rotation run re-scans and re-classifies. Dead-owner leases are reclaimed with revalidation; live/unknown block. | Fail closed; idempotent re-scan |
| Rotation crashes after unlinking a dead-owner lease but before completing rotation | Lease already removed (safe — owner was dead). Rotation lock state recovered per `RotationLock.acquire()` stale reclamation. | Safe |
| Machine reboot during writer lease holding | All processes dead. Lease files persist. On restart, `drainWriterLeases()` sees dead PIDs and reclaims with revalidation. Any lease whose PID liveness is unknown blocks. | Fail closed |
| Operator recovery runs concurrently with a writer creating a lease | Possible TOCTOU: operator unlinks a lease just as a writer creates one at the same path. The `wx` atomic create ensures the new lease is a distinct file; the operator's unlink targets a specific path. Residual risk remains — honestly documented. | Residual TOCTOU; operator must quiesce writers |
| Operator recovery runs concurrently with rotation's `drainWriterLeases()` | Both may target the same dead-owner lease. `wx`-based lease creation prevents double-creation, but concurrent unlink of the same path: second unlink gets `ENOENT` (best effort, no error). Metadata revalidation before each unlink reduces but does not eliminate the window. | Residual TOCTOU; operator must quiesce rotation |

---

## 6. Test Cases

### 6.1 Simulated unit tests (single process, executable now)

| Test | Scenario | Expected outcome |
|------|----------|------------------|
| `classifyLease()` dead PID | Lease metadata with dead PID. | Returns `dead` |
| `classifyLease()` alive PID | Lease metadata with live PID (own process). | Returns `alive` |
| `classifyLease()` unknown PID (mocked `EPERM`) | `process.kill` mocked to throw `EPERM`. | Returns `unknown` |
| `classifyLease()` malformed metadata | Lease file contains non-JSON. | Returns `unknown` |
| `drainWriterLeases()` reclaims dead-owner lease | Dead PID lease present. | Reclaimed; count = 1 |
| `drainWriterLeases()` does NOT reclaim by TTL alone | Expired TTL but live PID. | Not reclaimed; blocks |
| `drainWriterLeases()` fails closed on ambiguous lease | Malformed lease present. | `WriterDrainTimeoutError` |
| `WriterLease.release()` ownership mismatch | Lease with different token. | Does not unlink; file remains |
| `WriterLease.release()` idempotent | Call release twice. | Second call is no-op; file unlinked once |

### 6.2 Genuine multi-process tests (separate OS processes, barrier synchronization)

| Test | Scenario | Expected outcome | Executable? |
|------|----------|------------------|-------------|
| Writer crash leaves dead-owner lease | Process A creates lease, exits without releasing. Process B (rotation) runs `drainWriterLeases()`. | Lease reclaimed (count = 1); no live writer blocked | Yes |
| Writer crash leaves dead-owner lease; PID reused | Process A exits (dead PID). New process C reuses the PID with a different token and creates its own lease. Rotation drains. | Only Process C's lease (or neither) reclaimed; old lease not reclaimed under C's identity | Yes |
| Live writer lease blocks rotation | Process A holds a live lease. Process B (rotation) runs `drainWriterLeases()` with short timeout. | `WriterDrainTimeoutError`; lease remains | Yes |
| Unknown PID lease blocks rotation | Lease file with `pid` that cannot be signaled (`EPERM`) or malformed metadata. Rotation drains. | `WriterDrainTimeoutError`; fail closed; lease remains | Yes |
| Malformed lease metadata | Lease file contains non-JSON. Rotation drains. | `WriterDrainTimeoutError`; fail closed; lease remains | Yes |
| Two rotations drain concurrently | Two rotation processes both hold `MaintenanceLock`? Not possible — `wx` mutual exclusion. Only one rotation holds the lock. | Only one rotation drains; the other fails to acquire lock | Yes |
| Operator recovery vs concurrent writer | Operator attempts to clear a dead-owner lease while a writer creates a new lease at the same path. | **NOT EXECUTABLE** — no operator recovery API exists for writer leases. Residual TOCTOU possible; test documents behavior but cannot be run. | No |
| Operator recovery vs concurrent rotation | Operator attempts recovery while rotation holds `MaintenanceLock` and runs `drainWriterLeases()`. | **NOT EXECUTABLE** — no operator recovery API exists for writer leases. | No |
| Recovery barrier (RotationLock + MaintenanceLock) | Rotation acquires `RotationLock` then `MaintenanceLock`; writer attempts `acquireWriterLease()`. | Writer rejected with `MaintenanceActiveError`; second rotation fails `RotationLock.acquire()` | Yes (barrier behavior only, not lease deletion) |

---

## 7. Unresolved Gaps and Fail-Closed Limitations

| Gap | Description | Disposition |
|-----|-------------|-------------|
| No operator API for writer lease recovery | `forceClearStaleLock()` exists only for the maintenance lock, not writer leases. No `forceClearStaleLease()` or equivalent is implemented. No read-only inspection API returns writer lease metadata. | **Unresolved.** Documented here; must be defined before production use. Blind deletion never recommended. Manual writer-lease recovery is NOT SUPPORTED. |
| Residual path-based TOCTOU in operator recovery | Between lease metadata read and `unlink()`, another process could create a new lease at the same path. No atomic compare-and-unlink primitive is available. | **Unresolved.** Honestly documented. Operator must quiesce all writers and rotation before recovery. |
| `drainWriterLeases()` fail-closed on ambiguous leases | A single malformed or unknown-PID lease causes the entire drain to throw `WriterDrainTimeoutError`, blocking rotation until the lease is resolved. | **By design (fail closed).** Operator must resolve the stranded lease (but no API exists yet — see Gap 1). |
| TTL never authorizes reclamation | A live PID with an expired TTL blocks rotation indefinitely until the writer releases the lease or the process dies. | **By design (fail closed).** Operator must stop the live writer or wait for process exit. |
| No PID liveness re-check before unlink in `drainWriterLeases()` | `drainWriterLeases()` revalidates pid + token but does NOT re-check `processStatus(fresh.pid) === "dead"` immediately before `unlink()`. | **Documented limitation.** Mitigated by token randomization and unique lease filenames (`${pid}-${token}.lease`), but the documentation should not overstate the guarantee. |

---

## 8. Decision Summary

- **Automatic reclamation:** Only confirmed-dead-owner leases, with metadata revalidation (pid + token match) immediately before unlink. PID liveness is NOT re-checked immediately before unlink. TTL never authorizes reclamation.
- **Operator recovery:** Not implemented. No operator API exists for writer lease inspection or deletion. Proposed barrier (RotationLock → MaintenanceLock → drainWriterLeases) can prevent new writers and rotations but cannot delete a stranded lease. Manual writer-lease recovery is NOT SUPPORTED by any API.
- **Fail closed:** All ambiguous states (live, unknown, malformed, mismatch, filesystem error) result in the lease remaining on disk and rotation failing closed rather than proceeding unsafely.
- **No blind deletion:** Lease files are never deleted without pid + token + dead-PID confirmation + immediate-before-unlink revalidation. Even then, PID liveness is not re-checked at unlink time in `drainWriterLeases()`.

---

## 9. Safety Boundaries (Reiteration)

- Design and documentation only. No source code modifications.
- No migrations or commerce templates modified.
- No network, database, credentials, or real secret directory access.
- No rotation or verification CLI execution against real data.
- No source code changes.
- No implementation code written in this step.
