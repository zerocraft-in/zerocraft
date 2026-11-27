# H2 Phase 4 Step 7 — Writer Lease Recovery Implementation Plan

**Status:** Design only. No implementation changes.

**Objective:** Design a safe operator-controlled recovery mechanism for stranded writer lease files (`.tenant-secret-writer-leases/*.lease`) that `drainWriterLeases()` cannot automatically reclaim, including inspection, PID liveness validation, PID + token ownership revalidation, crash recovery coordination, and audit logging.

**Scope:** `src/maintenance-lock.ts` (specifically `WriterLease`, `drainWriterLeases`, `classifyLease`, `readJsonFile`, `processStatus`, `MaintenanceLock`, `RotationLock`), `src/secrets.ts` (`put()`, `delete()`), `src/secret-rotation.ts` (`rotateSecrets()`, `verifySecrets()`), and the integration plan in `docs/H2-PHASE-4-STEP-2-INTEGRATION-PLAN.md` and `docs/H2-PHASE-4-STEP-3-WRITER-LEASE-RECOVERY-DESIGN.md`.

**Target document:** `workers/tenant-provisioner-local/docs/H2-PHASE-4-STEP-7-WRITER-LEASE-RECOVERY-IMPLEMENTATION-PLAN.md`

**Safety boundaries:** Design and documentation only. No source code modifications. No migrations or commerce templates. No network, database, credentials, or real secret directory access. No rotation or verification CLI execution against real data. No source code changes.

---

## 1. Current Implementation Facts (Verified from Source)

The following behavior is implemented in `src/maintenance-lock.ts` and is used as the basis for this design:

### 1.1 `drainWriterLeases()` Automatic Reclamation — `src/maintenance-lock.ts` lines 623-701

`drainWriterLeases()` re-scans the lease directory each poll iteration and classifies each lease via `classifyLease()`:

- **`alive`** (PID confirmed via `process.kill(pid, 0)` success at line 659): lease blocks rotation. Rotation waits/polls until writer releases.
- **`dead`** (`ESRCH` at line 111): lease is eligible for automatic reclamation, but **only after metadata revalidation** (fresh read of the file confirming `pid` + `token` match at lines 673-679). **PID liveness is NOT re-checked immediately before unlink** — only at classification time (line 599).
- **`unknown`** (unreadable file, malformed JSON, missing `pid`, or non-`ESRCH`/non-success `process.kill` such as `EPERM`): classified as ambiguous. Throws `WriterDrainTimeoutError` (fail closed). **No automatic reclamation.**

Before unlinking a dead-owner lease, `drainWriterLeases()` re-reads the file and verifies `fresh.pid === c.metadata.pid` AND `fresh.token === c.metadata.token` (lines 673-679). It does **NOT** re-check `processStatus(fresh.pid) === "dead"` immediately before unlinking. If anything changed, it skips unlinking.

### 1.2 `WriterLease.release()` — Lines 438-489

A writer releases its own lease by verifying `pid` + `token` match before unlinking. Idempotent. Does not unlink if ownership does not match. Does **not** check PID liveness before releasing (the writer releasing its own lease is alive by definition).

### 1.3 TTL — Lines 38-44

Lease `ttlMs` is used for diagnostics and timeout reporting only. **TTL expiration alone never authorizes reclamation.** A live PID with an expired TTL continues to block rotation.

### 1.4 What Does NOT Exist

- **No `forceClearStaleLock()` equivalent for writer leases.** `MaintenanceLock.forceClearStaleLock()` (lines 291-336) applies only to the maintenance lock (`.tenant-secret-maintenance.lock`), not writer lease files.
- **No operator API to inspect or manually clear a stranded writer lease.**
- **No read-only inspection API that returns writer lease metadata.**
- This is an explicit design gap documented in Section 8 of `H2-PHASE-4-STEP-3-WRITER-LEASE-RECOVERY-DESIGN.md`.

### 1.4 Related Source Files Inspected

| File | Role |
|------|------|
| `src/maintenance-lock.ts` | Defines `WriterLease`, `drainWriterLeases()`, `classifyLease()`, `readJsonFile()`, `processStatus()`, `MaintenanceLock`, `RotationLock`-adjacent patterns |
| `src/secrets.ts` | `put()` at line 497 acquires writer lease before writing; `delete()` at line 742 acquires writer lease before deleting |
| `src/secret-rotation.ts` | `rotateSecrets()` at line 1125 acquires `RotationLock` then `MaintenanceLock` then `drainWriterLeases()`; `verifySecrets()` at line 1285 is read-only |
| `src/secret-rotation-cli.ts` | CLI entry point for `rotate` and `verify` commands |

---

## 2. Threat Model

### 2.1 Threat Actors

| Actor | Capability | Goal |
|-------|-----------|------|
| Crashed writer process | Leaves lease file behind with dead PID | Block rotation indefinitely |
| Live writer process | Holds valid lease, actively writing | Block rotation (by design) |
| PID-reused process | New process gets same PID as dead writer | Attempt to delete another writer's lease via token mismatch |
| Operator | Can read/write files in secret directory | Recover stranded leases safely |
| Concurrent rotation | Competing rotation process | Double-acquire lock, corrupt state |

### 2.2 Security Properties Required

| Property | Description |
|----------|-------------|
| **No blind deletion** | Lease files are never deleted without PID + token + dead-PID confirmation + immediate-before-unlink revalidation. |
| **No TTL-based reclamation** | TTL expiration alone never moves a lease to reclaimable state. |
| **Ownership verification** | Only the lease owner (matching PID + token) can release or delete their own lease. |
| **Operator gatekeeping** | Operator recovery requires explicit confirmation of dead PID and metadata match. |
| **Fail closed** | Any ambiguous state (live, unknown, malformed, mismatch, filesystem error) results in lease remaining and rotation failing closed. |

---

## 3. Lease Metadata States and Safe Handling

| Lease metadata state | Detection | Automatic reclamation by `drainWriterLeases()` | Operator recovery | Notes |
|----------------------|-----------|-----------------------------------------------|-------------------|-------|
| Owner PID confirmed dead (`ESRCH`) | `classifyLease()` returns `dead` | Yes — only after metadata revalidation (pid + token match + still dead) | Not needed (auto-reclaimed) | Safe; metadata revalidated before unlink |
| Owner PID confirmed alive | `classifyLease()` returns `alive` | No — blocks rotation; wait for drain timeout | No — writer is live; do not delete | TTL expiration alone does not change this |
| Owner PID unknown (`EPERM` or other non-`ESRCH`) | `classifyLease()` returns `unknown` | No — `WriterDrainTimeoutError` (fail closed) | Not supported — see Section 8 | Ambiguous; fail closed |
| Malformed/unreadable lease metadata | `readJsonFile()` returns `null` | No — classified `unknown` → `WriterDrainTimeoutError` | Not supported — see Section 8 | Blind deletion never recommended |
| Ownership mismatch (pid/token do not match a live writer) | `WriterLease.release()` check fails | Not applicable (release() does not unlink) | No | Fail closed; lease remains |
| Lease cleanup filesystem error (unlink fails) | `fs.unlink()` throws | Best effort; lease remains; retried on next drain iteration | Not supported — see Section 8 | Lease remains on disk |

**Key rule:** TTL expiration alone never moves a lease from any state to "reclaimable." A live PID with an expired TTL is treated as `alive` and continues to block rotation.

---

## 4. Proposed Operator Recovery API

### 4.1 Design Decision

The design document proposes **two new exported functions** on `MaintenanceLock` (static methods) for operator-controlled writer lease recovery. These are **proposed, not implemented**. Any implementation must follow this design.

### 4.2 `inspectWriterLease()` — Read-Only Inspection

```typescript
static async inspectWriterLease(
  leaseFile: string
): Promise<WriterLeaseMetadata | null>
```

- Reads the lease file without modifying it.
- Returns parsed `WriterLeaseMetadata` or `null` if file is absent, unreadable, or malformed.
- Returns metadata including `pid`, `token`, `startedAt`, `ttlMs`, `operation`, `version`.
- **Security:** Output includes owner token. Treat as operator-only recovery credentials. Anyone who can read the lease file (protected by `0o600` POSIX permissions or Windows ACLs) can recover the token and use it with `forceClearStaleLease()`. Do not expose to unprivileged callers.

### 4.3 `forceClearStaleLease()` — Operator-Controlled Recovery

```typescript
static async forceClearStaleLease(
  leaseFile: string,
  pid: number,
  token: string
): Promise<boolean>
```

**Preconditions (all must hold):**

1. **Operator has read lease metadata via `inspectWriterLease()`** and recorded `pid` and `token`.
2. **Operator has confirmed the owning PID is dead** via `process.kill(pid, 0) === ESRCH`.
3. **All writer processes sharing the secret directory are stopped.** No `put()`/`delete()` calls are in flight.
4. **No rotation process is running.** `RotationLock` and `MaintenanceLock` are not held, or rotation has been quiesced.

**Steps:**

1. **Read** lease file. If unreadable/malformed → return `false` (fail closed).
2. **Verify PID + token** match supplied values. If mismatch → return `false` (do not delete another writer's lease).
3. **Confirm dead PID** via `processStatus(metadata.pid)`. If `alive` or `unknown` → return `false` (fail closed).
4. **Revalidate metadata immediately before unlink:** re-read lease file, confirm `pid` + `token` still match, confirm `processStatus(pid) === "dead"` still holds. If changed → return `false`.
5. **Unlink** the lease file. If unlink fails → return `false` (lease remains).
6. Return `true` on successful unlink.

**Limitations (honestly documented):**

- **Path-based filesystem operation.** Between reading metadata and calling `fs.unlink()`, another process could create a new lease at the same path. There is no atomic compare-and-unlink primitive available on all target filesystems.
- **Recovery MUST only be performed after all provisioner, writer, and rotation processes are stopped.**
- **If safe recovery cannot be guaranteed** (e.g., liveness cannot be established, a writer might be alive, metadata cannot be revalidated), **prefer refusing automatic recovery and requiring offline manual intervention** instead of calling this function.

---

## 5. Recovery Barrier for Operator Recovery

### 5.1 Barrier Design Using Existing Locks

| Lock | Purpose | Mechanism |
|------|---------|-----------|
| `RotationLock` | Prevents concurrent rotation processes | `fs.open(wx)` on `.tenant-secret-rotation.lock`; fail closed if held by live owner; automatic stale reclamation if owner PID is dead (`ESRCH`) |
| `MaintenanceLock` | Prevents live writers | `fs.open(wx)` on `.tenant-secret-maintenance.lock`; fail closed if any lock file exists; writers check `isMaintenanceActive()` after creating their lease |

### 5.2 Exact Acquisition Order

To establish the barrier, the following sequence **must** be followed in order:

1. **`RotationLock.acquire()`** — Acquire rotation lock. If returns false (held by live owner, or stale but not reclaimable), stop. Do not proceed.
2. **`MaintenanceLock.acquireExclusive()`** — Acquire maintenance lock. If returns false, **release `RotationLock` first** (ownership-verified unlink), then stop. Do not proceed.
3. **`drainWriterLeases()`** — Drain all confirmed-live writer leases. Reclaim only confirmed-dead-owner leases with metadata revalidation. If `WriterDrainTimeoutError` is thrown (live writers remain, or ambiguous/malformed leases exist), release both locks in reverse order and stop. Do not proceed to manual recovery.

### 5.3 Barrier Effects

Once both locks are held and leases are drained:

- **New writers are blocked:** Any call to `acquireWriterLease()` creates its lease file via `wx`, then checks `isMaintenanceActive()`. Since the maintenance lock file exists, `isMaintenanceActive()` returns `true`, and the writer releases its lease and throws `MaintenanceActiveError`. The writer never proceeds to write.
- **New rotations are blocked:** Any call to `RotationLock.acquire()` gets `EEXIST` on `fs.open(wx)` and returns `false` (fail closed). The rotation cannot proceed.
- **Existing live writers:** `drainWriterLeases()` waits for them to release their leases. If a writer is stuck (live PID, not releasing), rotation fails closed with `WriterDrainTimeoutError`.

### 5.4 Failure Handling

| Failure | Handling |
|---------|----------|
| `RotationLock.acquire()` returns false | Rotation cannot proceed. No `MaintenanceLock` is attempted. Return fail-closed error immediately. |
| `MaintenanceLock.acquireExclusive()` returns false | Release `RotationLock` first (ownership-verified unlink), then return fail-closed error. No rotation performed. |
| `drainWriterLeases()` throws `WriterDrainTimeoutError` | Release both locks in reverse order (maintenance first, then rotation). If either release also fails, surface both via `AggregateError`. No manual recovery performed. |
| Malformed/unknown lease remains after drain | `drainWriterLeases()` already threw `WriterDrainTimeoutError`. Both locks are released. Manual intervention required, but no operator API exists for lease inspection or deletion. |
| Lock release failure (ownership mismatch/unreadable) | Do not silently ignore. Surface via `AggregateError`. Lock file remains. Operator recovery of the lock (not the lease) is possible via `MaintenanceLock.forceClearStaleLock()` after confirming all processes stopped. |

### 5.5 Limitations of the Barrier

- **The barrier only prevents NEW writers and rotations.** It cannot retract a lease that a writer already created and is actively using. `drainWriterLeases()` must wait for that writer to release its lease.
- **The barrier does not provide a mechanism to delete a stranded writer lease.** Even with both locks held, there is no API function to unlink a lease file. The operator would have to manually delete the file outside the API, which is **not supported**.
- **Residual TOCTOU:** Between the operator's read-only inspection of a lease file and any manual `unlink()`, a new writer could create a lease at the same path (via `wx`). There is no atomic compare-and-unlink primitive. This residual risk is honestly documented.
- **If safe recovery cannot be guaranteed** (e.g., liveness cannot be established, a writer might be alive, metadata cannot be revalidated), **fail closed** and do not delete the lease.

---

## 6. Recovery Barrier Process Flow

```
1. Operator identifies stranded writer lease(s) via inspectWriterLease()
2. Operator confirms all writer processes are stopped (OS-level process check)
3. Operator confirms no rotation process is running
4. Operator acquires RotationLock (fail closed if held)
5. Operator acquires MaintenanceLock (fail closed if held; release RotationLock first if this fails)
6. Operator calls drainWriterLeases() to drain any remaining live writer leases
   - If drainWriterLeases() throws WriterDrainTimeoutError: release both locks, stop
7. Operator calls forceClearStaleLease(leaseFile, pid, token) for each stranded lease
   - If forceClearStaleLease() returns false: do not proceed further, log failure
8. Operator releases MaintenanceLock, then RotationLock (reverse order)
```

---

## 7. Crash Scenarios

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

## 8. Windows ACL Limitations

- `chmod(0o600)` / `chmod(0o700)` is a no-op on Windows for ACL enforcement (documented in `maintenance-lock.ts` and `secrets.ts`).
- Lock file, lease files, and lease directory rely on POSIX mode bits that Windows does not enforce.
- **Operator requirement:** Configure NTFS ACLs on the secret directory, lease directory, lock file, and lease files to grant access only to the operator/service account. Remove "Everyone", "Authenticated Users", "Users" grants.
- Verify effective permissions with `icacls` or PowerShell `Get-Acl`; do not rely on `chmod` on Windows.
- `process.kill(pid, 0)` works on Windows (ESRCH = dead, EPERM = alive-but-unsignallable, other = unknown).
- `wx` atomic creation works on Windows.

---

## 9. Test Plan

### 9.1 Simulated Unit Tests (Single Process, Executable Now)

| Test | Scenario | Expected outcome | Executable? |
|------|----------|------------------|-------------|
| `inspectWriterLease()` dead PID | Lease metadata with dead PID. | Returns metadata with `pid`, `token`, etc. | Yes |
| `inspectWriterLease()` alive PID | Lease metadata with live PID (own process). | Returns metadata. | Yes |
| `inspectWriterLease()` unknown PID (mocked `EPERM`) | `process.kill` mocked to throw `EPERM`. | Returns metadata (metadata still readable even if PID unknown). | Yes |
| `inspectWriterLease()` malformed metadata | Lease file contains non-JSON. | Returns `null`. | Yes |
| `inspectWriterLease()` unreadable lease | Lease file unreadable. | Returns `null`. | Yes |
| `forceClearStaleLease()` dead owner, matching PID + token | Dead PID lease present with matching PID + token. | Lease reclaimed (file deleted). Returns `true`. | **No** — API not yet implemented |
| `forceClearStaleLease()` live owner, matching PID + token | Live PID lease present with matching PID + token. | Lease NOT reclaimed. Returns `false`. | **No** — API not yet implemented |
| `forceClearStaleLease()` unknown PID, matching PID + token | Unknown PID lease present with matching PID + token. | Lease NOT reclaimed. Returns `false`. | **No** — API not yet implemented |
| `forceClearStaleLease()` PID mismatch | Lease present with different PID. | Lease NOT reclaimed. Returns `false`. | **No** — API not yet implemented |
| `forceClearStaleLease()` token mismatch | Lease present with different token. | Lease NOT reclaimed. Returns `false`. | **No** — API not yet implemented |
| `forceClearStaleLease()` malformed metadata | Lease file contains non-JSON. | Lease NOT reclaimed. Returns `false`. | **No** — API not yet implemented |
| `forceClearStaleLease()` unreadable lease | Lease file unreadable. | Lease NOT reclaimed. Returns `false`. | **No** — API not yet implemented |
| `forceClearStaleLease()` TTL expired but live PID | Lease with expired TTL but live PID. | Lease NOT reclaimed. Returns `false`. | **No** — API not yet implemented |

### 9.2 Genuine Multi-Process Tests (Separate OS Processes, Barrier Synchronization)

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

## 8. Failure Scenarios

| Scenario | Behavior | Safety posture |
|----------|----------|----------------|
| Operator calls `forceClearStaleLease()` with wrong PID | Metadata mismatch → return `false`. Lease remains. | Fail closed; no deletion |
| Operator calls `forceClearStaleLease()` with wrong token | Metadata mismatch → return `false`. Lease remains. | Fail closed; no deletion |
| Operator calls `forceClearStaleLease()` with live PID | `processStatus` returns `alive` → return `false`. Lease remains. | Fail closed; no deletion |
| Operator calls `forceClearStaleLease()` with unknown PID | `processStatus` returns `unknown` → return `false`. Lease remains. | Fail closed; no deletion |
| Metadata changes between inspection and unlink | Revalidation fails → return `false`. Lease remains. | Fail closed; no deletion |
| `fs.unlink()` fails (permission denied, etc.) | Catch error → return `false`. Lease remains. | Fail closed; no deletion |
| `drainWriterLeases()` encounters malformed lease | Throws `WriterDrainTimeoutError`. Rotation fails closed. Lease remains. | Fail closed; rotation blocked until lease resolved |

---

## 9. Unresolved Gaps and Fail-Closed Limitations

| Gap | Description | Disposition |
|-----|-------------|-------------|
| No operator API for writer lease recovery | `forceClearStaleLock()` exists only for the maintenance lock, not writer leases. No `forceClearStaleLease()` or equivalent is implemented. No read-only inspection API returns writer lease metadata. | **Unresolved.** Documented here; must be defined before production use. Blind deletion never recommended. Manual writer-lease recovery is NOT SUPPORTED. |
| Residual path-based TOCTOU in operator recovery | Between lease metadata read and `unlink()`, another process could create a new lease at the same path. No atomic compare-and-unlink primitive is available on all target filesystems. | **Unresolved.** Honestly documented. Operator must quiesce all writers and rotation before recovery. |
| `drainWriterLeases()` fail-closed on ambiguous leases | A single malformed or unknown-PID lease causes the entire drain to throw `WriterDrainTimeoutError`, blocking rotation until the lease is resolved. | **By design (fail closed).** Operator must resolve the stranded lease (but no API exists yet — see Gap 1). |
| TTL never authorizes reclamation | A live PID with an expired TTL blocks rotation indefinitely until the writer releases the lease or the process dies. | **By design (fail closed).** Operator must stop the live writer or wait for process exit. |
| No PID liveness re-check before unlink in `drainWriterLeases()` | `drainWriterLeases()` revalidates pid + token but does NOT re-check `processStatus(fresh.pid) === "dead"` immediately before `unlink()`. | **Documented limitation.** Mitigated by token randomization and unique lease filenames (`${pid}-${token}.lease`), but the documentation should not overstate the guarantee. |

---

## 10. Decision Summary

- **Automatic reclamation:** Only confirmed-dead-owner leases, with metadata revalidation (pid + token match) immediately before unlink. PID liveness is NOT re-checked immediately before unlink in `drainWriterLeases()`. TTL never authorizes reclamation.
- **Operator recovery:** Not implemented. No operator API exists for writer lease inspection or deletion. Proposed barrier (RotationLock → MaintenanceLock → drainWriterLeases) can prevent new writers and rotations but cannot delete a stranded lease. Manual writer-lease recovery is NOT SUPPORTED by any API.
- **Fail closed:** All ambiguous states (live, unknown, malformed, mismatch, filesystem error) result in the lease remaining on disk and rotation failing closed rather than proceeding unsafely.
- **No blind deletion:** Lease files are never deleted without pid + token + dead-PID confirmation + immediate-before-unlink revalidation. Even then, PID liveness is not re-checked at unlink time in `drainWriterLeases()`.

---

## 11. Safety Boundaries (Reiteration)

- Design and documentation only. No source code modifications.
- No migrations or commerce templates modified.
- No network, database, credentials, or real secret directory access.
- No rotation or verification CLI execution against real data.
- No source code changes.
- No implementation code written in this step.
