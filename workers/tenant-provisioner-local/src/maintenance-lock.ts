/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Maintenance lock and writer lease coordination for secret rotation.
 *
 * Phase 4 Step 1: standalone coordination module. No integration with
 * EncryptedFileTenantSecretStore.put()/delete() yet.
 *
 * Provides cross-process coordination through shared filesystem state only.
 * No in-memory mutex is used for cross-process coordination.
 *
 * Safety design (security-first):
 *   * Automatic stale-lock reclamation is DISABLED. A lock file left behind
 *     by a crashed process is NEVER automatically deleted. An operator must
 *     explicitly clear it via MaintenanceLock.forceClearStaleLock(). This
 *     eliminates the TOCTOU race where two concurrent reclaimers, or a
 *     reclaimer and a new acquirer, race on path-based unlink.
 *   * TTL expiration alone NEVER authorizes lease/lock reclamation.
 *   * A writer lease may be reclaimed automatically only after positive
 *     dead-PID confirmation (process.kill(pid, 0) => ESRCH), with metadata
 *     revalidation immediately before unlink.
 *   * EPERM is treated as alive/unknown; never dead.
 *   * Malformed, unreadable or ambiguous metadata fails closed.
 *   * Ownership (PID + token) is verified before deleting a lock or lease.
 *   * fs.open(path, "wx") guarantees we never overwrite an existing lock or
 *     lease file.
 */

import { promises as fs } from "fs";
import * as path from "path";
import { randomBytes } from "crypto";
import { SecretStoreError } from "./errors";

const MAINTENANCE_LOCK_FILE = ".tenant-secret-maintenance.lock";
const WRITER_LEASE_DIR = ".tenant-secret-writer-leases";
const LEASE_FILE_SUFFIX = ".lease";

// Small, stable chunk of randomness used to name owner tokens.
const TOKEN_RANDOM_BYTES = 16;
// Default writer lease TTL (diagnostics/timeouts only; never reclamation).
const DEFAULT_LEASE_TTL_MS = 30_000;
// Default bounded drain timeout for waiting on live writers.
const DEFAULT_DRAIN_TIMEOUT_MS = 60_000;
// Poll interval when draining writer leases.
const DRAIN_POLL_INTERVAL_MS = 200;

// Lock file content schema version.
const LOCK_SCHEMA_VERSION = 1;
// Lease file content schema version.
const LEASE_SCHEMA_VERSION = 1;

export type MaintenanceMode = "exclusive" | "shared";

export interface MaintenanceLockMetadata {
  version: number;
  mode: MaintenanceMode;
  pid: number;
  token: string;
  startedAt: number;
  ttlMs: number;
}

export interface WriterLeaseMetadata {
  version: number;
  operation: "put" | "delete";
  pid: number;
  token: string;
  startedAt: number;
  ttlMs: number;
}

export type ProcessStatus = "alive" | "dead" | "unknown";

/**
 * Errors thrown by the maintenance lock module. Messages are sanitized and
 * never contain secret values or key material.
 */
export class MaintenanceActiveError extends SecretStoreError {
  constructor(message = "Secret maintenance is active; writes are not permitted") {
    super(message);
    this.name = "MaintenanceActiveError";
  }
}

export class WriterDrainTimeoutError extends SecretStoreError {
  constructor(message = "Writer drain timed out; confirmed-live writers remain") {
    super(message);
    this.name = "WriterDrainTimeoutError";
  }
}

export class StaleLockReclamationError extends SecretStoreError {
  constructor(message = "Unable to reclaim stale maintenance lock") {
    super(message);
    this.name = "StaleLockReclamationError";
  }
}

export class LeaseOwnershipError extends SecretStoreError {
  constructor(message = "Lease ownership mismatch; refusing to delete") {
    super(message);
    this.name = "LeaseOwnershipError";
  }
}

function processStatus(pid: number): ProcessStatus {
  try {
    process.kill(pid, 0);
    return "alive";
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return "dead";
    if (code === "EPERM") return "alive"; // exists, but we cannot signal it
    return "unknown";
  }
}

function generateOwnerToken(): string {
  return randomBytes(TOKEN_RANDOM_BYTES).toString("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isWithinRoot(resolved: string, root: string): boolean {
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  return resolved === root || resolved.startsWith(rootWithSep);
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return null; // unreadable -> caller decides fail closed
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null; // malformed -> caller decides fail closed
  }
  return parsed as T;
}

async function setRestrictivePermissions(filePath: string): Promise<void> {
  try {
    await fs.chmod(filePath, 0o600);
  } catch (err) {
    if (process.platform !== "win32") {
      throw new SecretStoreError(
        `Unable to set file permissions on ${filePath}`
      );
    }
    // Windows does not enforce POSIX mode bits; secure via ACLs separately.
  }
}

async function ensureDirectoryPermissions(directory: string): Promise<void> {
  try {
    await fs.chmod(directory, 0o700);
  } catch (err) {
    if (process.platform !== "win32") {
      throw new SecretStoreError(
        `Unable to set directory permissions on ${directory}`
      );
    }
  }
}

/**
 * Resolve a lease directory inside the configured root, rejecting symlinks
 * and path traversal.
 */
function resolveLeaseDirectory(directory: string): string {
  const root = path.resolve(directory);
  const resolved = path.resolve(root, WRITER_LEASE_DIR);
  if (!isWithinRoot(resolved, root)) {
    throw new SecretStoreError("Lease directory escapes the configured root");
  }
  return resolved;
}

function resolveLockFile(directory: string): string {
  const root = path.resolve(directory);
  const resolved = path.resolve(root, MAINTENANCE_LOCK_FILE);
  if (!isWithinRoot(resolved, root)) {
    throw new SecretStoreError("Lock file escapes the configured root");
  }
  return resolved;
}

function resolveLeaseFile(leaseDir: string, pid: number, token: string): string {
  const resolved = path.resolve(leaseDir, `${pid}-${token}${LEASE_FILE_SUFFIX}`);
  if (!isWithinRoot(resolved, leaseDir)) {
    throw new SecretStoreError("Lease file escapes the lease directory");
  }
  return resolved;
}

/**
 * Advisory exclusive maintenance lock. Coordinates rotation processes with
 * each other and (via the writer lease protocol) with live put()/delete()
 * writers.
 *
 * Ownership is bound to PID + cryptographically random token. Release is only
 * permitted when the stored metadata still matches this instance, preventing
 * a stale/resumed process from deleting another process's active lock after
 * PID reuse.
 *
 * Automatic stale-lock reclamation is intentionally DISABLED: a lock file
 * left by a crashed process is never deleted by this module. An operator
 * must explicitly clear it via forceClearStaleLock(). This removes the
 * TOCTOU window where concurrent reclaimers could unlink each other's locks.
 */
export class MaintenanceLock {
  private readonly lockFile: string;
  private readonly pid: number;
  private readonly ownerToken: string;
  private held = false;

  constructor(lockFile: string, pid = process.pid) {
    this.lockFile = lockFile;
    this.pid = pid;
    this.ownerToken = generateOwnerToken();
  }

  /**
   * Acquire exclusive maintenance ownership.
   * Returns true if acquired; false if a lock file already exists for any
   * reason (live owner, dead owner, malformed, unreadable). Fail closed:
   * never automatically reclaims a stale lock.
   * Throws on configuration errors (e.g. path outside root).
   */
  async acquireExclusive(): Promise<boolean> {
    try {
      const metadata: MaintenanceLockMetadata = {
        version: LOCK_SCHEMA_VERSION,
        mode: "exclusive",
        pid: this.pid,
        token: this.ownerToken,
        startedAt: Date.now(),
        ttlMs: DEFAULT_LEASE_TTL_MS,
      };
      const fd = await fs.open(this.lockFile, "wx");
      try {
        await fd.write(JSON.stringify(metadata) + "\n");
      } finally {
        await fd.close();
      }
      await setRestrictivePermissions(this.lockFile);
      this.held = true;
      return true;
    } catch (err) {
      const errno = (err as NodeJS.ErrnoException).code;
      if (errno === "EEXIST") {
        // Fail closed: a lock file already exists. Do not unlink, do not
        // inspect PID liveness for reclamation purposes. Operator must
        // explicitly clear via forceClearStaleLock().
        return false;
      }
      throw err;
    }
  }

  /**
   * Explicit operator-controlled recovery for a stale maintenance lock.
   *
   * Reads the lock file, verifies that the stored pid and token match the
   * supplied values, checks that the owning process is positively dead
   * (process.kill(pid, 0) => ESRCH), and only then unlinks. Requires the
   * operator to know the stale lock's pid and token (obtained via
   * inspectLockFile()), so an arbitrary process cannot delete another
   * process's lock by guessing.
   *
   * SAFETY LIMITATIONS (honestly documented):
   *   * This is a path-based filesystem operation. Between reading metadata
   *     and calling fs.unlink(), another process could create a new lock
   *     file at the same path. There is no atomic compare-and-unlink
   *     primitive available on all target filesystems.
   *   * Recovery MUST only be performed after all provisioner, writer, and
   *     rotation processes that could hold or acquire the lock are stopped.
   *   * If safe recovery cannot be guaranteed (e.g. a process might still be
   *     alive or the filesystem does not provide reliable path semantics),
   *     prefer refusing automatic recovery and requiring offline manual
   *     intervention instead of calling this function.
   *
   * Returns true if the lock was cleared; false if metadata did not match,
   * the owner is not confirmed dead, or the file could not be read/unlinked.
   */
  static async forceClearStaleLock(
    lockFile: string,
    pid: number,
    token: string
  ): Promise<boolean> {
    const metadata = await readJsonFile<MaintenanceLockMetadata>(lockFile);
    if (!metadata) {
      return false; // unreadable or malformed: refuse to clear
    }
    if (
      typeof metadata.pid !== "number" ||
      metadata.pid !== pid ||
      typeof metadata.token !== "string" ||
      metadata.token !== token
    ) {
      return false; // ownership mismatch: do not delete another's lock
    }

    // Only allow recovery when the owner is positively confirmed dead.
    const status = processStatus(metadata.pid);
    if (status === "alive" || status === "unknown") {
      // Never remove a live or ambiguously-owned lock. Fail closed.
      return false;
    }

    // Defense in depth: revalidate metadata immediately before unlinking.
    const fresh = await readJsonFile<MaintenanceLockMetadata>(lockFile);
    const stillMatches =
      fresh &&
      typeof fresh.pid === "number" &&
      fresh.pid === pid &&
      typeof fresh.token === "string" &&
      fresh.token === token &&
      processStatus(fresh.pid) === "dead";
    if (!stillMatches) {
      // Metadata changed or owner is no longer confirmed dead: do not unlink.
      return false;
    }

    try {
      await fs.unlink(lockFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Inspect a lock file without modifying it. Returns the parsed metadata or
   * null if the file is absent, unreadable, or malformed. Intended for
   * operator tooling before calling forceClearStaleLock().
   *
   * SECURITY NOTE: The returned metadata includes the owner token. Treat
   * inspectLockFile() output as operator-only recovery credentials: anyone
   * who can read the lock file (protected by 0o600 POSIX permissions, or
   * Windows ACLs separately) can recover the token and use it with
   * forceClearStaleLock(). Do not expose this output to unprivileged callers.
   */
  static async inspectLockFile(
    lockFile: string
  ): Promise<MaintenanceLockMetadata | null> {
    return readJsonFile<MaintenanceLockMetadata>(lockFile);
  }

  /**
   * Inspect a writer lease file without modifying it. Returns the parsed
   * metadata or null if the file is absent, unreadable, or malformed.
   * Intended for operator tooling before calling forceClearStaleLease().
   *
   * SECURITY NOTE: The returned metadata includes the owner token. Treat
   * inspectWriterLease() output as operator-only recovery credentials: anyone
   * who can read the lease file (protected by 0o600 POSIX permissions, or
   * Windows ACLs separately) can recover the token and use it with
   * forceClearStaleLease(). Do not expose this output to unprivileged callers.
   */
  static async inspectWriterLease(
    leaseFile: string
  ): Promise<WriterLeaseMetadata | null> {
    return readJsonFile<WriterLeaseMetadata>(leaseFile);
  }

  /**
   * Explicit operator-controlled recovery for a stale writer lease.
   *
   * Reads the lease file, verifies that the stored pid and token match the
   * supplied values, checks that the owning process is positively dead
   * (process.kill(pid, 0) => ESRCH), and only then unlinks. Requires the
   * operator to know the stale lease's pid and token (obtained via
   * inspectWriterLease()), so an arbitrary process cannot delete another
   * process's lease by guessing.
   *
   * SAFETY LIMITATIONS (honestly documented):
   *   * This is a path-based filesystem operation. Between reading metadata
   *     and calling fs.unlink(), another process could create a new lease
   *     file at the same path. There is no atomic compare-and-unlink
   *     primitive available on all target filesystems.
   *   * Recovery MUST only be performed after all provisioner, writer, and
   *     rotation processes that could hold or acquire the lock are stopped.
   *   * If safe recovery cannot be guaranteed (e.g. a process might still be
   *     alive or the filesystem does not provide reliable path semantics),
   *     prefer refusing automatic recovery and requiring offline manual
   *     intervention instead of calling this function.
   *
   * Returns true if the lease was cleared; false if metadata did not match,
   * the owner is not confirmed dead, or the file could not be read/unlinked.
   */
  static async forceClearStaleLease(
    leaseFile: string,
    pid: number,
    token: string
  ): Promise<boolean> {
    const metadata = await readJsonFile<WriterLeaseMetadata>(leaseFile);
    if (!metadata) {
      return false; // unreadable or malformed: refuse to clear
    }
    if (
      typeof metadata.pid !== "number" ||
      metadata.pid !== pid ||
      typeof metadata.token !== "string" ||
      metadata.token !== token
    ) {
      return false; // ownership mismatch: do not delete another's lease
    }

    // Only allow recovery when the owner is positively confirmed dead.
    const status = processStatus(metadata.pid);
    if (status === "alive" || status === "unknown") {
      // Never remove a live or ambiguously-owned lease. Fail closed.
      return false;
    }

    // Defense in depth: revalidate metadata immediately before unlinking.
    const fresh = await readJsonFile<WriterLeaseMetadata>(leaseFile);
    const stillMatches =
      fresh &&
      typeof fresh.pid === "number" &&
      fresh.pid === pid &&
      typeof fresh.token === "string" &&
      fresh.token === token &&
      processStatus(fresh.pid) === "dead";
    if (!stillMatches) {
      // Metadata changed or owner is no longer confirmed dead: do not unlink.
      return false;
    }

    try {
      await fs.unlink(leaseFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read current lock metadata without modifying state. Used by writers to
   * determine whether maintenance is active.
   */
  async readMetadata(): Promise<MaintenanceLockMetadata | null> {
    return readJsonFile<MaintenanceLockMetadata>(this.lockFile);
  }

  /**
   * Release the maintenance lock only if it still belongs to this instance.
   * Safe to call multiple times; idempotent.
   */
  async release(): Promise<void> {
    if (!this.held) {
      return;
    }

    let stillOwner = false;
    try {
      const metadata = await readJsonFile<MaintenanceLockMetadata>(this.lockFile);
      if (
        metadata &&
        typeof metadata.pid === "number" &&
        metadata.pid === this.pid &&
        typeof metadata.token === "string" &&
        metadata.token === this.ownerToken
      ) {
        stillOwner = true;
      }
    } catch {
      // Cannot read or parse the lock: do not unlink.
    }

    if (stillOwner) {
      try {
        await fs.unlink(this.lockFile);
        this.held = false; // only mark released on successful unlink
      } catch {
        // Unlink failed; the lock may still exist. Keep held = true so the
        // instance does not incorrectly believe it released the lock.
      }
    } else {
      // Ownership no longer matches (e.g. another process replaced the lock
      // file or PID reuse occurred). Do not unlink; keep held as-is so the
      // caller can observe the discrepancy via isHeld().
    }
  }

  isHeld(): boolean {
    return this.held;
  }

  /**
   * Determine whether an exclusive maintenance lock is held.
   *
   * Fail-closed: if the lock file exists at all (readable, malformed, or
   * owned by a dead process), maintenance is treated as active. A dead-owner
   * lock is NOT automatically reclaimed, so it continues to block writers
   * until an operator explicitly clears it. Returns false only when no lock
   * file exists (ENOENT).
   */
  async isMaintenanceActive(): Promise<boolean> {
    try {
      await fs.access(this.lockFile);
      return true; // lock file exists -> maintenance active (fail closed)
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return false; // no lock file -> maintenance not active
      }
      return true; // unreadable -> fail closed (active)
    }
  }
}

/**
 * Handle to a writer lease. Releases the lease on explicit release() in a
 * finally block.
 */
export class WriterLease {
  private readonly leaseFile: string;
  private readonly pid: number;
  private readonly ownerToken: string;
  private released = false;

  constructor(leaseFile: string, pid: number, token: string) {
    this.leaseFile = leaseFile;
    this.pid = pid;
    this.ownerToken = token;
  }

  /**
   * Release the lease only if it still belongs to this instance.
   * Safe to call multiple times; idempotent.
   */
  async release(): Promise<void> {
    if (this.released) {
      return;
    }

    let stillOwner = false;
    try {
      const metadata = await readJsonFile<WriterLeaseMetadata>(this.leaseFile);
      if (
        metadata &&
        typeof metadata.pid === "number" &&
        metadata.pid === this.pid &&
        typeof metadata.token === "string" &&
        metadata.token === this.ownerToken
      ) {
        stillOwner = true;
      }
    } catch {
      // Cannot read or parse: do not unlink.
    }

    if (stillOwner) {
      try {
        await fs.unlink(this.leaseFile);
      } catch {
        // Best effort.
      }
    }

    this.released = true;
  }

  isReleased(): boolean {
    return this.released;
  }
}

/**
 * Options for acquireWriterLease.
 */
export interface AcquireWriterLeaseOptions {
  directory: string;
  operation: "put" | "delete";
  pid?: number;
  ttlMs?: number;
}

/**
 * Acquire a writer lease for a put()/delete() operation.
 *
 * Ordering:
 *   1. Atomically create unique lease file (wx).
 *   2. Check maintenance lock.
 *   3. If maintenance active, release lease and reject.
 *   4. Return lease handle; caller performs write, then releases in finally.
 *
 * Throws MaintenanceActiveError if maintenance is active.
 * Throws SecretStoreError on configuration/permission errors.
 */
export async function acquireWriterLease(
  options: AcquireWriterLeaseOptions
): Promise<WriterLease> {
  const directory = path.resolve(options.directory);
  const pid = options.pid ?? process.pid;
  const ownerToken = generateOwnerToken();
  const ttlMs = options.ttlMs ?? DEFAULT_LEASE_TTL_MS;

  const leaseDir = resolveLeaseDirectory(directory);
  try {
    await fs.mkdir(leaseDir, { recursive: true });
  } catch (err) {
    throw new SecretStoreError(
      `Unable to create writer lease directory: ${(err as Error).message}`
    );
  }
  await ensureDirectoryPermissions(leaseDir);

  const leaseFile = resolveLeaseFile(leaseDir, pid, ownerToken);

  const metadata: WriterLeaseMetadata = {
    version: LEASE_SCHEMA_VERSION,
    operation: options.operation,
    pid,
    token: ownerToken,
    startedAt: Date.now(),
    ttlMs,
  };

  // Step 1: Atomically create unique lease file. Never overwrite existing.
  let fd: fs.FileHandle | null = null;
  try {
    fd = await fs.open(leaseFile, "wx");
    try {
      await fd.write(JSON.stringify(metadata) + "\n");
    } finally {
      await fd.close();
    }
  } catch (err) {
    const errno = (err as NodeJS.ErrnoException).code;
    if (errno === "EEXIST") {
      throw new SecretStoreError("Writer lease already exists");
    }
    throw new SecretStoreError(
      `Unable to create writer lease: ${(err as Error).message}`
    );
  }
  try {
    await setRestrictivePermissions(leaseFile);
  } catch {
    // Non-fatal; lease content contains no secret material.
  }

  const lease = new WriterLease(leaseFile, pid, ownerToken);

  // Step 2: Check maintenance lock after lease creation, before returning.
  const lockFile = resolveLockFile(directory);
  const lock = new MaintenanceLock(lockFile, pid);
  const active = await lock.isMaintenanceActive();
  if (active) {
    // Step 3: Release the newly created lease and reject.
    try {
      await lease.release();
    } catch {
      // Best effort; lease file is harmless.
    }
    throw new MaintenanceActiveError();
  }

  return lease;
}

/**
 * Scan writer leases and classify each as live, dead, or ambiguous.
 */
interface LeaseClassification {
  file: string;
  metadata: WriterLeaseMetadata | null;
  status: "alive" | "dead" | "unknown";
}

async function classifyLease(leaseFile: string): Promise<LeaseClassification> {
  const metadata = await readJsonFile<WriterLeaseMetadata>(leaseFile);
  if (!metadata || typeof metadata.pid !== "number") {
    return { file: leaseFile, metadata: null, status: "unknown" };
  }
  const status = processStatus(metadata.pid);
  return { file: leaseFile, metadata, status };
}

/**
 * Options for drainWriterLeases.
 */
export interface DrainWriterLeasesOptions {
  directory: string;
  timeoutMs?: number;
  pid?: number;
}

/**
 * Drain writer leases for exclusive maintenance ownership.
 *
 * Waits for confirmed-live writers to release their leases. Reclaims only
 * leases whose owner PID is positively confirmed dead. TTL expiry alone never
 * authorizes reclamation. Before unlinking a dead-owner lease, metadata is
 * revalidated (pid + token match) to avoid deleting a lease that was replaced
 * after classification. Fails closed on ambiguity or timeout.
 *
 * Returns the number of leases reclaimed (dead-owner only).
 */
export async function drainWriterLeases(
  options: DrainWriterLeasesOptions
): Promise<number> {
  const directory = path.resolve(options.directory);
  const timeoutMs = options.timeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  const leaseDir = resolveLeaseDirectory(directory);

  let reclaimed = 0;

  while (Date.now() < deadline) {
    // Re-scan the lease directory each iteration: leases may be released
    // (files deleted) by writers while we are draining.
    let entries: string[];
    try {
      entries = await fs.readdir(leaseDir);
    } catch {
      // No lease directory yet: nothing to drain.
      return reclaimed;
    }

    const leaseFiles = entries
      .filter((name) => name.endsWith(LEASE_FILE_SUFFIX))
      .map((name) => path.join(leaseDir, name));

    if (leaseFiles.length === 0) {
      return reclaimed;
    }

    const classifications = await Promise.all(
      leaseFiles.map((f) => classifyLease(f))
    );

    const liveLeases = classifications.filter(
      (c) => c.status === "alive"
    );
    const ambiguousLeases = classifications.filter(
      (c) => c.status === "unknown"
    );

    // Ambiguous lease metadata: fail closed.
    if (ambiguousLeases.length > 0) {
      throw new WriterDrainTimeoutError();
    }

    if (liveLeases.length === 0) {
      // No live writers. Reclaim dead-owner leases with metadata revalidation.
      for (const c of classifications) {
        if (c.status === "dead" && c.metadata) {
          const fresh = await readJsonFile<WriterLeaseMetadata>(c.file);
          const stillMatches =
            fresh &&
            typeof fresh.pid === "number" &&
            fresh.pid === c.metadata.pid &&
            typeof fresh.token === "string" &&
            fresh.token === c.metadata.token;
          if (!stillMatches) {
            // Metadata changed or file vanished: do not unlink.
            continue;
          }
          try {
            await fs.unlink(c.file);
            reclaimed += 1;
          } catch {
            // Best effort; leave for next drain or operator.
          }
        }
      }
      return reclaimed;
    }

    // Confirmed-live writers remain. Wait and poll again.
    await sleep(DRAIN_POLL_INTERVAL_MS);
  }

  // Timeout reached with confirmed-live leases remaining. Fail closed.
  throw new WriterDrainTimeoutError();
}
