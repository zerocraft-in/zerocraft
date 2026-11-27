/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Maintenance lock and writer lease tests.
 *
 * Uses isolated temporary directories and real filesystem operations only.
 * Never prints actual keys, plaintext secrets, or secret values.
 *
 * Includes genuine OS-level multi-process tests (spawned Node.js processes)
 * that contend on the same lock/lease files on disk, coordinated through a
 * deterministic barrier (not timing-only sleeps).
 */

import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MaintenanceLock,
  WriterLease,
  acquireWriterLease,
  drainWriterLeases,
  MaintenanceActiveError,
  WriterDrainTimeoutError,
} from "./maintenance-lock";

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tenant-maint-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop()!;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

function lockFilePath(directory: string): string {
  return path.join(directory, ".tenant-secret-maintenance.lock");
}

function leaseFilePath(directory: string, pid: number, token: string): string {
  const leaseDir = path.join(directory, ".tenant-secret-writer-leases");
  return path.join(leaseDir, `${pid}-${token}.lease`);
}

// ---------------------------------------------------------------------------
// Single-process unit tests
// ---------------------------------------------------------------------------

describe("MaintenanceLock - exclusive acquisition", () => {
  it("acquires and releases an exclusive lock", async () => {
    const directory = await temporaryDirectory();
    const lock = new MaintenanceLock(lockFilePath(directory));
    expect(await lock.acquireExclusive()).toBe(true);
    expect(lock.isHeld()).toBe(true);
    await lock.release();
    expect(lock.isHeld()).toBe(false);
  });

  it("second acquisition fails while first lock held by live owner", async () => {
    const directory = await temporaryDirectory();
    const lockA = new MaintenanceLock(lockFilePath(directory));
    const lockB = new MaintenanceLock(lockFilePath(directory));

    expect(await lockA.acquireExclusive()).toBe(true);
    expect(await lockB.acquireExclusive()).toBe(false);
    expect(lockB.isHeld()).toBe(false);

    await lockA.release();
    expect(await lockB.acquireExclusive()).toBe(true);
    await lockB.release();
  });

  it("release verifies ownership before deleting", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const lockA = new MaintenanceLock(lockFile);
    const lockB = new MaintenanceLock(lockFile);

    expect(await lockA.acquireExclusive()).toBe(true);
    await expect(lockB.release()).resolves.toBeUndefined();
    expect(lockA.isHeld()).toBe(true);
    expect(await fs.readFile(lockFile, "utf8")).toBeDefined();

    await lockA.release();
    expect(lockA.isHeld()).toBe(false);
  });

  // --- release() state tests (Finding C) ---

  it("release() keeps held=true when unlink fails", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const lock = new MaintenanceLock(lockFile);

    expect(await lock.acquireExclusive()).toBe(true);
    expect(lock.isHeld()).toBe(true);

    // Make the lock file read-only (no write/delete permission) so unlink fails.
    if (process.platform !== "win32") {
      await fs.chmod(lockFile, 0o444);
      try {
        await lock.release();
        // held should remain true because unlink failed.
        expect(lock.isHeld()).toBe(true);
        // Lock file must still exist.
        expect(await fs.readFile(lockFile, "utf8")).toBeDefined();
      } finally {
        await fs.chmod(lockFile, 0o600);
        await lock.release();
      }
    }
  });

  it("release() keeps held=true when ownership no longer matches", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const lockA = new MaintenanceLock(lockFile);
    const lockB = new MaintenanceLock(lockFile);

    expect(await lockA.acquireExclusive()).toBe(true);
    expect(lockA.isHeld()).toBe(true);

    // lockB has a different token, so its ownership check fails.
    await lockB.release();
    // lockA still holds the lock (lockB did not unlink it).
    expect(lockA.isHeld()).toBe(true);
    expect(await fs.readFile(lockFile, "utf8")).toBeDefined();

    await lockA.release();
    expect(lockA.isHeld()).toBe(false);
  });

  it("dead-PID lock is NOT automatically reclaimed by acquireExclusive", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const pid = await spawnAndKillPid();

    await fs.writeFile(
      lockFile,
      JSON.stringify({ pid, startedAt: Date.now() })
    );

    const lock = new MaintenanceLock(lockFile);
    expect(await lock.acquireExclusive()).toBe(false);
    expect(lock.isHeld()).toBe(false);
    // Lock file must remain intact for operator-controlled recovery.
    expect(await fs.readFile(lockFile, "utf8")).toContain(String(pid));
  });

  it("forceClearStaleLock clears a dead-owner lock when pid+token match", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const pid = await spawnAndKillPid();
    const token = "dead-owner-token";

    await fs.writeFile(
      lockFile,
      JSON.stringify({
        version: 1,
        mode: "exclusive",
        pid,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );

    const cleared = await MaintenanceLock.forceClearStaleLock(
      lockFile,
      pid,
      token
    );
    expect(cleared).toBe(true);
    // Lock file must be gone.
    await expect(fs.access(lockFile)).rejects.toBeTruthy();
  });

  it("forceClearStaleLock refuses mismatched pid or token", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const pid = await spawnAndKillPid();

    await fs.writeFile(
      lockFile,
      JSON.stringify({
        version: 1,
        mode: "exclusive",
        pid,
        token: "real-token",
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );

    // Wrong token must not clear.
    expect(
      await MaintenanceLock.forceClearStaleLock(lockFile, pid, "wrong-token")
    ).toBe(false);
    // Wrong pid must not clear.
    expect(
      await MaintenanceLock.forceClearStaleLock(lockFile, 999999, "real-token")
    ).toBe(false);
    // Lock file must remain intact.
    expect(await fs.readFile(lockFile, "utf8")).toContain("real-token");
  });

  it("forceClearStaleLock refuses malformed/unreadable lock", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    await fs.writeFile(lockFile, "not-json-at-all");

    expect(
      await MaintenanceLock.forceClearStaleLock(lockFile, 1, "token")
    ).toBe(false);
    expect(await fs.readFile(lockFile, "utf8")).toBe("not-json-at-all");
  });

  it("inspectLockFile returns metadata for a valid lock", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const lock = new MaintenanceLock(lockFile);
    expect(await lock.acquireExclusive()).toBe(true);

    const meta = await MaintenanceLock.inspectLockFile(lockFile);
    expect(meta).not.toBeNull();
    expect(meta!.pid).toBe(process.pid);
    expect(meta!.token).toBe(lock["ownerToken"]);

    await lock.release();
  });

  it("unreadable/malformed lock fails closed", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    await fs.writeFile(lockFile, "not-json-at-all");
    const lock = new MaintenanceLock(lockFile);
    expect(await lock.acquireExclusive()).toBe(false);
    expect(lock.isHeld()).toBe(false);
    expect(await fs.readFile(lockFile, "utf8")).toBe("not-json-at-all");
  });

  it("live PID with expired TTL is NOT reclaimed", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);

    const metadata = {
      version: 1,
      mode: "exclusive" as const,
      pid: process.pid,
      token: "some-token",
      startedAt: Date.now() - 100_000,
      ttlMs: 1000, // long expired
    };
    await fs.writeFile(lockFile, JSON.stringify(metadata));

    const lock = new MaintenanceLock(lockFile);
    expect(await lock.acquireExclusive()).toBe(false);
    expect(lock.isHeld()).toBe(false);
    const after = await fs.readFile(lockFile, "utf8");
    expect(JSON.parse(after).pid).toBe(process.pid);
  });

  // --- forceClearStaleLock unit tests (Finding D.1, D.2, D.3, D.7) ---

  it("forceClearStaleLock refuses a live lock with matching PID and token", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);

    // Create a lock owned by our own live PID with a known token.
    const token = "live-owner-token";
    await fs.writeFile(
      lockFile,
      JSON.stringify({
        version: 1,
        mode: "exclusive",
        pid: process.pid,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );

    // Matching pid+token but owner is alive -> must refuse.
    expect(
      await MaintenanceLock.forceClearStaleLock(lockFile, process.pid, token)
    ).toBe(false);
    // Lock file must remain intact.
    expect(await fs.readFile(lockFile, "utf8")).toContain(token);
  });

  it("forceClearStaleLock refuses unknown/ambiguous PID state", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);

    // Mock process.kill to throw a non-ESRCH error (EPERM = ambiguous/unknown).
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => {
      const err: NodeJS.ErrnoException = new Error("EPERM");
      err.code = "EPERM";
      throw err;
    });
    try {
      await fs.writeFile(
        lockFile,
        JSON.stringify({
          version: 1,
          mode: "exclusive",
          pid: 999999,
          token: "ambiguous-token",
          startedAt: Date.now(),
          ttlMs: 30000,
        })
      );

      // Even with correct pid+token, unknown PID state -> fail closed.
      expect(
        await MaintenanceLock.forceClearStaleLock(
          lockFile,
          999999,
          "ambiguous-token"
        )
      ).toBe(false);
      // Lock file must remain intact.
      expect(await fs.readFile(lockFile, "utf8")).toContain("ambiguous-token");
    } finally {
      killSpy.mockRestore();
    }
  });

  it("forceClearStaleLock refuses PID/token mismatch (cannot remove another owner's lock)", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const deadPid = await spawnAndKillPid();

    await fs.writeFile(
      lockFile,
      JSON.stringify({
        version: 1,
        mode: "exclusive",
        pid: deadPid,
        token: "real-token",
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );

    // Wrong token must not clear.
    expect(
      await MaintenanceLock.forceClearStaleLock(lockFile, deadPid, "wrong-token")
    ).toBe(false);
    // Wrong pid must not clear.
    expect(
      await MaintenanceLock.forceClearStaleLock(lockFile, 999999, "real-token")
    ).toBe(false);
    // Lock file must remain intact.
    expect(await fs.readFile(lockFile, "utf8")).toContain("real-token");
  });

  it("forceClearStaleLock succeeds for dead-owner recovery with matching PID and token", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const deadPid = await spawnAndKillPid();
    const token = "dead-owner-token";

    await fs.writeFile(
      lockFile,
      JSON.stringify({
        version: 1,
        mode: "exclusive",
        pid: deadPid,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );

    const cleared = await MaintenanceLock.forceClearStaleLock(
      lockFile,
      deadPid,
      token
    );
    expect(cleared).toBe(true);
    // Lock file must be gone.
    await expect(fs.access(lockFile)).rejects.toBeTruthy();
  });

  it("EPERM is treated as alive/unknown and fails closed", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const metadata = {
      version: 1,
      mode: "exclusive" as const,
      pid: 999999,
      token: "some-token",
      startedAt: Date.now(),
      ttlMs: 1000,
    };
    await fs.writeFile(lockFile, JSON.stringify(metadata));

    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => {
      const err: NodeJS.ErrnoException = new Error("EPERM");
      err.code = "EPERM";
      throw err;
    });
    try {
      const lock = new MaintenanceLock(lockFile);
      expect(await lock.acquireExclusive()).toBe(false);
      expect(lock.isHeld()).toBe(false);
    } finally {
      killSpy.mockRestore();
    }
  });

  it("isMaintenanceActive fails closed on malformed lock", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    await fs.writeFile(lockFile, "not-json");
    const lock = new MaintenanceLock(lockFile);
    expect(await lock.isMaintenanceActive()).toBe(true);
  });

  it("isMaintenanceActive returns true when owner dead (fail closed)", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const pid = await spawnAndKillPid();
    await fs.writeFile(lockFile, JSON.stringify({ pid, startedAt: Date.now() }));
    const lock = new MaintenanceLock(lockFile);
    // Dead-owner lock is NOT reclaimed -> treated as active.
    expect(await lock.isMaintenanceActive()).toBe(true);
  });

  it("isMaintenanceActive returns false when no lock file exists", async () => {
    const directory = await temporaryDirectory();
    const lock = new MaintenanceLock(lockFilePath(directory));
    expect(await lock.isMaintenanceActive()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Writer lease inspection and operator recovery (H2 Phase 4 Step 6 / Step 7)
// ---------------------------------------------------------------------------

describe("MaintenanceLock - inspectWriterLease", () => {
  it("returns metadata for a dead-owner lease", async () => {
    const directory = await temporaryDirectory();
    const deadPid = await spawnAndKillPid();
    const token = "dead-owner-token";
    const lf = leaseFilePath(directory, deadPid, token);
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(
      lf,
      JSON.stringify({
        version: 1,
        operation: "put",
        pid: deadPid,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );
    await fs.chmod(lf, 0o600);

    const meta = await MaintenanceLock.inspectWriterLease(lf);
    expect(meta).not.toBeNull();
    expect(meta!.pid).toBe(deadPid);
    expect(meta!.token).toBe(token);
    expect(meta!.version).toBe(1);
    expect(meta!.operation).toBe("put");
  });

  it("returns metadata for a live-owner lease", async () => {
    const directory = await temporaryDirectory();
    const token = "live-owner-token";
    const lf = leaseFilePath(directory, process.pid, token);
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(
      lf,
      JSON.stringify({
        version: 1,
        operation: "delete",
        pid: process.pid,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );
    await fs.chmod(lf, 0o600);

    const meta = await MaintenanceLock.inspectWriterLease(lf);
    expect(meta).not.toBeNull();
    expect(meta!.pid).toBe(process.pid);
    expect(meta!.token).toBe(token);
  });

  it("returns metadata for an unknown PID (EPERM) lease", async () => {
    const directory = await temporaryDirectory();
    const token = "ambiguous-token";
    const lf = leaseFilePath(directory, 999999, token);
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(
      lf,
      JSON.stringify({
        version: 1,
        operation: "put",
        pid: 999999,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );
    await fs.chmod(lf, 0o600);

    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => {
      const err: NodeJS.ErrnoException = new Error("EPERM");
      err.code = "EPERM";
      throw err;
    });
    try {
      const meta = await MaintenanceLock.inspectWriterLease(lf);
      expect(meta).not.toBeNull();
      expect(meta!.pid).toBe(999999);
      expect(meta!.token).toBe(token);
    } finally {
      killSpy.mockRestore();
    }
  });

  it("returns null for malformed lease metadata", async () => {
    const directory = await temporaryDirectory();
    const lf = leaseFilePath(directory, 1, "token");
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(lf, "not-json-at-all");
    await fs.chmod(lf, 0o600);

    const meta = await MaintenanceLock.inspectWriterLease(lf);
    expect(meta).toBeNull();
  });

  it("returns null for an unreadable lease file", async () => {
    const directory = await temporaryDirectory();
    const lf = leaseFilePath(directory, 1, "token");
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(lf, JSON.stringify({ version: 1, pid: 1, token: "token" }));

    const meta = await MaintenanceLock.inspectWriterLease(lf);
    expect(meta).not.toBeNull();

    // Make it unreadable.
    if (process.platform !== "win32") {
      await fs.chmod(lf, 0o000);
      try {
        const meta2 = await MaintenanceLock.inspectWriterLease(lf);
        expect(meta2).toBeNull();
      } finally {
        await fs.chmod(lf, 0o600);
      }
    }
  });

  it("returns null for a missing lease file", async () => {
    const directory = await temporaryDirectory();
    const lf = leaseFilePath(directory, 999999, "nonexistent");

    const meta = await MaintenanceLock.inspectWriterLease(lf);
    expect(meta).toBeNull();
  });
});

describe("MaintenanceLock - forceClearStaleLease", () => {
  it("clears a dead-owner lease with matching PID and token", async () => {
    const directory = await temporaryDirectory();
    const deadPid = await spawnAndKillPid();
    const token = "dead-owner-token";
    const lf = leaseFilePath(directory, deadPid, token);
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(
      lf,
      JSON.stringify({
        version: 1,
        operation: "put",
        pid: deadPid,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );
    await fs.chmod(lf, 0o600);

    const cleared = await MaintenanceLock.forceClearStaleLease(lf, deadPid, token);
    expect(cleared).toBe(true);
    await expect(fs.access(lf)).rejects.toBeTruthy();
  });

  it("refuses to clear a live-owner lease with matching PID and token", async () => {
    const directory = await temporaryDirectory();
    const token = "live-owner-token";
    const lf = leaseFilePath(directory, process.pid, token);
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(
      lf,
      JSON.stringify({
        version: 1,
        operation: "put",
        pid: process.pid,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );
    await fs.chmod(lf, 0o600);

    const cleared = await MaintenanceLock.forceClearStaleLease(lf, process.pid, token);
    expect(cleared).toBe(false);
    expect(await fs.readFile(lf, "utf8")).toContain(token);
  });

  it("refuses to clear when PID state is unknown (EPERM)", async () => {
    const directory = await temporaryDirectory();
    const token = "ambiguous-token";
    const lf = leaseFilePath(directory, 999999, token);
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(
      lf,
      JSON.stringify({
        version: 1,
        operation: "put",
        pid: 999999,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );
    await fs.chmod(lf, 0o600);

    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => {
      const err: NodeJS.ErrnoException = new Error("EPERM");
      err.code = "EPERM";
      throw err;
    });
    try {
      const cleared = await MaintenanceLock.forceClearStaleLease(lf, 999999, token);
      expect(cleared).toBe(false);
      expect(await fs.readFile(lf, "utf8")).toContain(token);
    } finally {
      killSpy.mockRestore();
    }
  });

  it("refuses to clear when PID does not match", async () => {
    const directory = await temporaryDirectory();
    const deadPid = await spawnAndKillPid();
    const token = "real-token";
    const lf = leaseFilePath(directory, deadPid, token);
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(
      lf,
      JSON.stringify({
        version: 1,
        operation: "put",
        pid: deadPid,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );
    await fs.chmod(lf, 0o600);

    const cleared = await MaintenanceLock.forceClearStaleLease(lf, 999999, token);
    expect(cleared).toBe(false);
    expect(await fs.readFile(lf, "utf8")).toContain(token);
  });

  it("refuses to clear when token does not match", async () => {
    const directory = await temporaryDirectory();
    const deadPid = await spawnAndKillPid();
    const token = "real-token";
    const lf = leaseFilePath(directory, deadPid, token);
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(
      lf,
      JSON.stringify({
        version: 1,
        operation: "put",
        pid: deadPid,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );
    await fs.chmod(lf, 0o600);

    const cleared = await MaintenanceLock.forceClearStaleLease(lf, deadPid, "wrong-token");
    expect(cleared).toBe(false);
    expect(await fs.readFile(lf, "utf8")).toContain(token);
  });

  it("refuses to clear malformed lease metadata", async () => {
    const directory = await temporaryDirectory();
    const lf = leaseFilePath(directory, 1, "token");
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(lf, "not-json-at-all");
    await fs.chmod(lf, 0o600);

    const cleared = await MaintenanceLock.forceClearStaleLease(lf, 1, "token");
    expect(cleared).toBe(false);
    expect(await fs.readFile(lf, "utf8")).toBe("not-json-at-all");
  });

  it("refuses to clear an unreadable lease file", async () => {
    const directory = await temporaryDirectory();
    const lf = leaseFilePath(directory, 1, "token");
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(lf, JSON.stringify({ version: 1, pid: 1, token: "token" }));
    await fs.chmod(lf, 0o600);

    if (process.platform !== "win32") {
      await fs.chmod(lf, 0o000);
      try {
        const cleared = await MaintenanceLock.forceClearStaleLease(lf, 1, "token");
        expect(cleared).toBe(false);
      } finally {
        await fs.chmod(lf, 0o600);
      }
    }
  });

  it("refuses to clear when TTL is expired but PID is live", async () => {
    const directory = await temporaryDirectory();
    const token = "live-owner-token";
    const lf = leaseFilePath(directory, process.pid, token);
    const leaseDir = path.dirname(lf);
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);
    await fs.writeFile(
      lf,
      JSON.stringify({
        version: 1,
        operation: "put",
        pid: process.pid,
        token,
        startedAt: Date.now() - 100_000,
        ttlMs: 1000, // long expired, but PID is live
      })
    );
    await fs.chmod(lf, 0o600);

    const cleared = await MaintenanceLock.forceClearStaleLease(lf, process.pid, token);
    expect(cleared).toBe(false);
    expect(await fs.readFile(lf, "utf8")).toContain(token);
  });
});

describe("MaintenanceLock - forceClearStaleLease symlink safety", () => {
  it("clearing a symlink lease path does not delete or modify the target", async () => {
    if (process.platform === "win32") {
      // Windows symlink creation requires elevated privileges; skip on Windows.
      return;
    }
    const directory = await temporaryDirectory();
    const deadPid = await spawnAndKillPid();
    const token = "dead-owner-token";

    // Create a real target lease file.
    const targetDir = path.join(directory, "target-leases");
    await fs.mkdir(targetDir, { recursive: true });
    await fs.chmod(targetDir, 0o700);
    const target = path.join(targetDir, `${deadPid}-${token}.lease`);
    await fs.writeFile(
      target,
      JSON.stringify({
        version: 1,
        operation: "put",
        pid: deadPid,
        token,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );
    await fs.chmod(target, 0o600);
    const targetBefore = await fs.readFile(target, "utf8");

    // Create a symlink in the lease directory pointing at the target.
    const linkDir = path.join(directory, ".tenant-secret-writer-leases");
    await fs.mkdir(linkDir, { recursive: true });
    await fs.chmod(linkDir, 0o700);
    const link = leaseFilePath(directory, deadPid, token);
    await fs.symlink(target, link);

    // fs.unlink on a symlink removes the link itself, not the target.
    // The target file must remain intact.
    const cleared = await MaintenanceLock.forceClearStaleLease(link, deadPid, token);
    expect(cleared).toBe(false);
    // The symlink may or may not have been removed (depends on readJsonFile
    // succeeding through the symlink), but the target must be unmodified.
    const targetAfter = await fs.readFile(target, "utf8");
    expect(targetAfter).toBe(targetBefore);
  });
});

// ---------------------------------------------------------------------------
// WriterLease - acquire/release (existing tests continue below)
// ---------------------------------------------------------------------------

describe("WriterLease - acquire/release", () => {
  it("acquires and releases a writer lease", async () => {
    const directory = await temporaryDirectory();
    const lease = await acquireWriterLease({
      directory,
      operation: "put",
    });
    expect(lease.isReleased()).toBe(false);
    await lease.release();
    expect(lease.isReleased()).toBe(true);
  });

  it("lease release verifies ownership; mismatched token does not delete", async () => {
    const directory = await temporaryDirectory();
    const leaseDir = path.join(directory, ".tenant-secret-writer-leases");
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.chmod(leaseDir, 0o700);

    const leaseFile = path.join(leaseDir, `${process.pid}-wrong-token.lease`);
    await fs.writeFile(
      leaseFile,
      JSON.stringify({
        version: 1,
        operation: "put",
        pid: process.pid,
        token: "wrong-token",
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );
    await fs.chmod(leaseFile, 0o600);

    const lease = new WriterLease(leaseFile, process.pid, "different-token");
    await lease.release();
    expect(await fs.readFile(leaseFile, "utf8")).toContain("wrong-token");
  });

  it("release is idempotent", async () => {
    const directory = await temporaryDirectory();
    const lease = await acquireWriterLease({ directory, operation: "delete" });
    await lease.release();
    await lease.release();
    expect(lease.isReleased()).toBe(true);
  });
});

describe("Writer rejected during maintenance", () => {
  it("acquireWriterLease rejects when maintenance lock is active", async () => {
    const directory = await temporaryDirectory();
    const lock = new MaintenanceLock(lockFilePath(directory));
    expect(await lock.acquireExclusive()).toBe(true);

    await expect(
      acquireWriterLease({ directory, operation: "put" })
    ).rejects.toBeInstanceOf(MaintenanceActiveError);

    await lock.release();
    const lease = await acquireWriterLease({
      directory,
      operation: "put",
    });
    await lease.release();
  });

  it("delete operation is also rejected during maintenance", async () => {
    const directory = await temporaryDirectory();
    const lock = new MaintenanceLock(lockFilePath(directory));
    expect(await lock.acquireExclusive()).toBe(true);
    await expect(
      acquireWriterLease({ directory, operation: "delete" })
    ).rejects.toBeInstanceOf(MaintenanceActiveError);
    await lock.release();
  });

  it("dead-owner lock blocks writers (fail closed, no auto-reclaim)", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const pid = await spawnAndKillPid();
    await fs.writeFile(lockFile, JSON.stringify({ pid, startedAt: Date.now() }));

    // Writer lease acquisition must reject because lock file exists (fail closed).
    await expect(
      acquireWriterLease({ directory, operation: "put" })
    ).rejects.toBeInstanceOf(MaintenanceActiveError);
  });
});

describe("Writer-vs-rotation race (single process)", () => {
  it("rotation drains a live writer's lease before proceeding", async () => {
    const directory = await temporaryDirectory();

    const lease = await acquireWriterLease({
      directory,
      operation: "put",
    });

    const rotationLock = new MaintenanceLock(lockFilePath(directory));
    expect(await rotationLock.acquireExclusive()).toBe(true);

    const drainPromise = drainWriterLeases({ directory, timeoutMs: 5000 });
    setTimeout(async () => {
      await lease.release();
    }, 50);

    const reclaimed = await drainPromise;
    expect(reclaimed).toBe(0);
    await rotationLock.release();
  });

  it("rotation fails closed when confirmed-live writer does not release", async () => {
    const directory = await temporaryDirectory();

    const lease = await acquireWriterLease({
      directory,
      operation: "put",
    });

    const rotationLock = new MaintenanceLock(lockFilePath(directory));
    expect(await rotationLock.acquireExclusive()).toBe(true);

    await expect(
      drainWriterLeases({ directory, timeoutMs: 300 })
    ).rejects.toBeInstanceOf(WriterDrainTimeoutError);

    await lease.release();
    await rotationLock.release();
  });

  it("rotation reclaims dead-owner lease during drain with revalidation", async () => {
    const directory = await temporaryDirectory();
    const rotationLock = new MaintenanceLock(lockFilePath(directory));
    expect(await rotationLock.acquireExclusive()).toBe(true);

    const leaseDir = path.join(directory, ".tenant-secret-writer-leases");
    await fs.mkdir(leaseDir, { recursive: true });
    const deadPid = await spawnAndKillPid();
    const deadLease = path.join(leaseDir, `${deadPid}-deadtoken.lease`);
    await fs.writeFile(
      deadLease,
      JSON.stringify({
        version: 1,
        operation: "put",
        pid: deadPid,
        token: "deadtoken",
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );
    await fs.chmod(deadLease, 0o600);

    const reclaimed = await drainWriterLeases({
      directory,
      timeoutMs: 5000,
    });
    expect(reclaimed).toBe(1);
    expect(await fs.readdir(leaseDir)).toHaveLength(0);
    await rotationLock.release();
  });
});

describe("drainWriterLeases - ambiguity and timeout", () => {
  it("fails closed on unreadable lease metadata", async () => {
    const directory = await temporaryDirectory();
    const rotationLock = new MaintenanceLock(lockFilePath(directory));
    expect(await rotationLock.acquireExclusive()).toBe(true);

    const leaseDir = path.join(directory, ".tenant-secret-writer-leases");
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.writeFile(
      path.join(leaseDir, "bad.lease"),
      "not-json-at-all"
    );

    await expect(
      drainWriterLeases({ directory, timeoutMs: 300 })
    ).rejects.toBeInstanceOf(WriterDrainTimeoutError);

    await rotationLock.release();
  });
});

describe("MaintenanceLock - simultaneous acquisition (single process)", () => {
  it("two locks on same file: only one succeeds", async () => {
    const directory = await temporaryDirectory();
    const lockA = new MaintenanceLock(lockFilePath(directory));
    const lockB = new MaintenanceLock(lockFilePath(directory));

    const results = await Promise.all([
      lockA.acquireExclusive(),
      lockB.acquireExclusive(),
    ]);
    const successes = results.filter((r) => r === true).length;
    expect(successes).toBe(1);

    if (lockA.isHeld()) await lockA.release();
    if (lockB.isHeld()) await lockB.release();
  });
});

describe("Security - symlinks and permissions", () => {
  it("POSIX: lock file and lease file are 0600, lease dir is 0700", async () => {
    if (process.platform === "win32") {
      return;
    }
    const directory = await temporaryDirectory();
    const lock = new MaintenanceLock(lockFilePath(directory));
    expect(await lock.acquireExclusive()).toBe(true);

    const lockStat = await fs.stat(lockFilePath(directory));
    expect(lockStat.mode & 0o777).toBe(0o600);

    const lease = await acquireWriterLease({
      directory,
      operation: "put",
    });
    const leaseDir = path.join(directory, ".tenant-secret-writer-leases");
    const leaseStat = await fs.stat(leaseDir);
    expect(leaseStat.mode & 0o777).toBe(0o700);

    const leaseFiles = await fs.readdir(leaseDir);
    expect(leaseFiles.length).toBe(1);
    const leaseFileStat = await fs.stat(
      path.join(leaseDir, leaseFiles[0])
    );
    expect(leaseFileStat.mode & 0o777).toBe(0o600);

    await lease.release();
    await lock.release();
  });

  it("Windows: ACL behavior is documented, not enforced via chmod", async () => {
    if (process.platform !== "win32") {
      return;
    }
    const directory = await temporaryDirectory();
    const lock = new MaintenanceLock(lockFilePath(directory));
    expect(await lock.acquireExclusive()).toBe(true);
    await lock.release();
  });
});

// ---------------------------------------------------------------------------
// Multi-process test infrastructure
// ---------------------------------------------------------------------------

/**
 * Child process entry point written to a temporary .js file. Each child runs
 * under plain Node.js and requires the compiled CommonJS output of
 * maintenance-lock.ts (from dist/). Coordination between siblings happens
 * through a barrier directory; results are written to per-process files.
 */
const MP_CHILD_SCRIPT = `
const fs = require("fs").promises;
const path = require("path");
const { MaintenanceLock, acquireWriterLease, drainWriterLeases } = require(process.env.MP_MODULE_PATH);

(async () => {
  const scenario = process.env.MP_SCENARIO;
  const directory = process.env.MP_DIRECTORY;
  const barrierDir = process.env.MP_BARRIER_DIR;
  const resultsFile = process.env.MP_RESULTS_FILE;
  const numProcs = parseInt(process.env.MP_NUM_PROCS, 10);
  const procIndex = parseInt(process.env.MP_PROC_INDEX, 10);
  const timeoutMs = parseInt(process.env.MP_TIMEOUT_MS, 10);
  const lockFile = path.join(directory, ".tenant-secret-maintenance.lock");

  let result = { ok: false, detail: "" };

  try {
    // Barrier: signal readiness, then wait for all siblings.
    const readyFile = path.join(barrierDir, "ready-" + procIndex);
    await fs.writeFile(readyFile, String(process.pid));
    const barrierDeadline = Date.now() + 5000;
    while (Date.now() < barrierDeadline) {
      const entries = await fs.readdir(barrierDir).catch(() => []);
      if (entries.filter((e) => e.startsWith("ready-")).length >= numProcs) {
        break;
      }
      await new Promise((r) => setTimeout(r, 20));
    }

    // Small extra delay to encourage true concurrency on acquisition.
    await new Promise((r) => setTimeout(r, 5));

    if (scenario === "concurrent-acquire") {
      const lock = new MaintenanceLock(lockFile, process.pid);
      const acquired = await lock.acquireExclusive();
      if (acquired) {
        await new Promise((r) => setTimeout(r, 50));
        await lock.release();
      }
      result = { ok: true, detail: "acquired=" + acquired };
    } else if (scenario === "holder-blocks-acquirer") {
      if (procIndex === 0) {
        const lock = new MaintenanceLock(lockFile, process.pid);
        const acquired = await lock.acquireExclusive();
        if (!acquired) throw new Error("holder failed to acquire");
        await new Promise((r) => setTimeout(r, 200));
        await lock.release();
        result = { ok: true, detail: "holder-acquired-and-released" };
      } else {
        await new Promise((r) => setTimeout(r, 30));
        const lock2 = new MaintenanceLock(lockFile, process.pid);
        const acquired = await lock2.acquireExclusive();
        result = { ok: !acquired, detail: "acquirer-acquired=" + acquired };
      }
    } else if (scenario === "writer-lease-blocks-drain") {
      const heldMarker = path.join(directory, ".mp-writer-held");
      if (procIndex === 0) {
        // Writer: acquire lease, signal via marker, hold it.
        const lease = await acquireWriterLease({ directory, operation: "put" });
        await fs.writeFile(heldMarker, String(process.pid));
        await new Promise((r) => setTimeout(r, 600));
        await lease.release();
        try {
          await fs.unlink(heldMarker);
        } catch {}
        result = { ok: true, detail: "writer-held-and-released" };
      } else {
        // Rotation: wait until the writer is confirmed holding a lease,
        // then acquire the maintenance lock and drain (must time out).
        const markerDeadline = Date.now() + 2000;
        while (Date.now() < markerDeadline) {
          try {
            await fs.access(heldMarker);
            break;
          } catch {
            await new Promise((r) => setTimeout(r, 20));
          }
        }
        await new Promise((r) => setTimeout(r, 30));
        const rotLock = new MaintenanceLock(lockFile, process.pid);
        const acquired = await rotLock.acquireExclusive();
        if (!acquired) throw new Error("rotation failed to acquire lock");
        try {
          await drainWriterLeases({ directory, timeoutMs: 400 });
          result = { ok: false, detail: "drain-did-not-timeout" };
        } catch (err) {
          result = {
            ok: true,
            detail: "drain-timed-out=" + (err instanceof Error ? err.message : String(err)),
          };
        } finally {
          await rotLock.release();
        }
      }
    } else if (scenario === "stale-lock-concurrent-reject") {
      const lock = new MaintenanceLock(lockFile, process.pid);
      const acquired = await lock.acquireExclusive();
      result = { ok: !acquired, detail: "acquired=" + acquired };
    } else if (scenario === "process-termination-recovery") {
      if (procIndex === 0) {
        const lock = new MaintenanceLock(lockFile, process.pid);
        const acquired = await lock.acquireExclusive();
        if (!acquired) throw new Error("p0 failed to acquire");
        await fs.writeFile(
          path.join(directory, ".p0-stale.json"),
          JSON.stringify({ pid: process.pid, token: lock.ownerToken })
        );
        result = { ok: true, detail: "p0-acquired-and-exited" };
        await fs.writeFile(
          resultsFile + ".proc-" + procIndex,
          JSON.stringify(result)
        );
        // Exit without releasing: simulate a crash. The lock file remains
        // for operator-controlled recovery.
        process.exit(0);
      } else {
        await new Promise((r) => setTimeout(r, 100));
        const lock = new MaintenanceLock(lockFile, process.pid);
        const acquired = await lock.acquireExclusive();
        result = { ok: !acquired, detail: "acquired=" + acquired };
      }
    } else if (scenario === "force-clear-vs-concurrent-acquire") {
      // D.4: Recovery and concurrent acquisition cannot produce double ownership.
      // A dead-owner lock is pre-planted by the parent. Process 0 force-clears
      // it then tries acquireExclusive(); Process 1 concurrently tries
      // acquireExclusive(). Exactly one acquireExclusive() must succeed.
      if (procIndex === 0) {
        const cleared = await MaintenanceLock.forceClearStaleLock(
          lockFile,
          parseInt(process.env.MP_STALE_PID, 10),
          process.env.MP_STALE_TOKEN
        );
        const acquired = await new MaintenanceLock(
          lockFile,
          process.pid
        ).acquireExclusive();
        result = {
          ok: true,
          detail: "cleared=" + cleared + ",acquired=" + acquired,
        };
      } else {
        await new Promise((r) => setTimeout(r, 10));
        const acquired = await new MaintenanceLock(
          lockFile,
          process.pid
        ).acquireExclusive();
        result = { ok: true, detail: "acquired=" + acquired };
      }
    } else if (scenario === "concurrent-drain-only-one") {
      // D.5: Only one process can hold the maintenance lock and drain at a time.
      if (procIndex === 0) {
        const lock = new MaintenanceLock(lockFile, process.pid);
        const acquired = await lock.acquireExclusive();
        // Hold the lock for 300ms so Process 1's concurrent attempt finds it held.
        await new Promise((r) => setTimeout(r, 300));
        const reclaimed = await drainWriterLeases({
          directory,
          timeoutMs: 500,
        });
        await lock.release();
        result = {
          ok: true,
          detail: "drainer-0-acquired=" + acquired + ",reclaimed=" + reclaimed,
        };
      } else {
        // Try to acquire immediately while Process 0 holds the lock.
        const lock = new MaintenanceLock(lockFile, process.pid);
        const acquired = await lock.acquireExclusive();
        result = { ok: true, detail: "drainer-1-acquired=" + acquired };
      }
    } else {
      result = { ok: false, detail: "unknown-scenario" };
    }
  } catch (err) {
    result = { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }

  await fs.writeFile(resultsFile + ".proc-" + procIndex, JSON.stringify(result));
  process.exit(0);
})().catch((err) => {
  try {
    fs.writeFileSync(
      process.env.MP_RESULTS_FILE + ".proc-" + process.env.MP_PROC_INDEX,
      JSON.stringify({ ok: false, detail: String(err) })
    );
  } catch {}
  process.exit(1);
});
`;

/**
 * Spawn numProcs child processes running MP_CHILD_SCRIPT via plain Node.js,
 * waiting for all to exit, then collect per-process result files.
 */
/**
 * Ensure the compiled CommonJS output (dist/) exists so child processes can
 * require maintenance-lock.js. Builds on demand via `tsc` if missing.
 * dist/ is gitignored build output; this keeps `npx vitest run` self-contained.
 */
async function ensureDistBuilt(): Promise<void> {
  const distLock = path.resolve(__dirname, "..", "dist", "maintenance-lock.js");
  try {
    await fs.access(distLock);
    return;
  } catch {
    // build on demand
  }
  const { spawn } = await import("child_process");
  await new Promise<void>((resolve, reject) => {
    const child = spawn("tsc", [], { shell: true, stdio: ["ignore", "pipe", "pipe"] });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("tsc build failed"))));
  });
}

async function runMpScenario(
  scenario: string,
  directory: string,
  numProcs: number,
  timeoutMs = 10000,
  stalePid?: number,
  staleToken?: string
): Promise<Array<{ procIndex: number; ok: boolean; detail?: string }>> {
  await ensureDistBuilt();
  const barrierDir = path.join(directory, ".mp-barrier");
  const resultsFile = path.join(directory, ".mp-results");
  const childScript = path.join(directory, ".mp-child.js");
  await fs.mkdir(barrierDir, { recursive: true });

  await fs.writeFile(childScript, MP_CHILD_SCRIPT);

  const existing = await fs.readdir(directory).catch(() => []);
  for (const name of existing) {
    if (name.startsWith(".mp-results.proc-")) {
      await fs.unlink(path.join(directory, name)).catch(() => undefined);
    }
  }

  const { spawn } = await import("child_process");
  const modulePath = path.resolve(__dirname, "..", "dist", "maintenance-lock.js");

  const children = Array.from({ length: numProcs }, (_, i) => {
    return new Promise<{ code: number }>((resolve) => {
      const child = spawn(process.execPath, [childScript], {
        env: {
          ...process.env,
          MP_SCENARIO: scenario,
          MP_DIRECTORY: directory,
          MP_BARRIER_DIR: barrierDir,
          MP_RESULTS_FILE: resultsFile,
          MP_NUM_PROCS: String(numProcs),
          MP_PROC_INDEX: String(i),
          MP_TIMEOUT_MS: String(timeoutMs),
          MP_MODULE_PATH: modulePath,
          ...(stalePid !== undefined ? { MP_STALE_PID: String(stalePid) } : {}),
          ...(staleToken !== undefined ? { MP_STALE_TOKEN: staleToken } : {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.on("exit", (code) => resolve({ code: code ?? 1 }));
    });
  });

  await Promise.all(children);

  const outcomes: Array<{ procIndex: number; ok: boolean; detail?: string }> = [];
  for (let i = 0; i < numProcs; i++) {
    const raw = await fs
      .readFile(resultsFile + ".proc-" + i, "utf8")
      .catch(() => null);
    if (raw) {
      outcomes.push({ procIndex: i, ...JSON.parse(raw) });
    } else {
      outcomes.push({ procIndex: i, ok: false, detail: "no-result-file" });
    }
  }
  return outcomes;
}

async function spawnAndKillPid(): Promise<number> {
  const { spawn } = await import("child_process");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [
      "-e",
      "setTimeout(()=>process.exit(0), 50)",
    ]);
    child.on("exit", () => {
      setTimeout(() => resolve(child.pid), 100);
    });
    child.kill();
  });
}

// ---------------------------------------------------------------------------
// Genuine multi-process tests
// ---------------------------------------------------------------------------

describe("MaintenanceLock - genuine multi-process", () => {
  it("two live processes concurrently acquire same lock: exactly one succeeds", async () => {
    const directory = await temporaryDirectory();
    const outcomes = await runMpScenario("concurrent-acquire", directory, 2);
    const successes = outcomes.filter(
      (o) => o.ok && o.detail.includes("acquired=true")
    ).length;
    expect(successes).toBe(1);
    expect(outcomes.every((o) => o.ok)).toBe(true);
  });

  it("a live process holds the lock while another attempt fails", async () => {
    const directory = await temporaryDirectory();
    const outcomes = await runMpScenario("holder-blocks-acquirer", directory, 2);
    const holder = outcomes.find((o) => o.procIndex === 0);
    const acquirer = outcomes.find((o) => o.procIndex === 1);
    expect(holder?.ok).toBe(true);
    expect(holder?.detail).toContain("holder-acquired-and-released");
    expect(acquirer?.ok).toBe(true);
    expect(acquirer?.detail).toContain("acquirer-acquired=false");
  });

  it("a writer holds a lease while another process drain times out", async () => {
    const directory = await temporaryDirectory();
    const outcomes = await runMpScenario(
      "writer-lease-blocks-drain",
      directory,
      2
    );
    const writer = outcomes.find((o) => o.procIndex === 0);
    const rotator = outcomes.find((o) => o.procIndex === 1);
    expect(writer?.ok).toBe(true);
    expect(rotator?.ok).toBe(true);
    expect(rotator?.detail).toContain("drain-timed-out");
  });

  it("multiple processes encounter a stale lock concurrently: all fail closed", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const deadPid = await spawnAndKillPid();
    await fs.writeFile(
      lockFile,
      JSON.stringify({ pid: deadPid, startedAt: Date.now() })
    );

    const outcomes = await runMpScenario(
      "stale-lock-concurrent-reject",
      directory,
      3
    );
    expect(outcomes.length).toBe(3);
    expect(
      outcomes.every(
        (o) => o.ok && o.detail.includes("acquired=false")
      )
    ).toBe(true);
    expect(await fs.readFile(lockFile, "utf8")).toContain(String(deadPid));
  });

  it("process termination leaves a stale lock that is not auto-reclaimed", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const outcomes = await runMpScenario(
      "process-termination-recovery",
      directory,
      2
    );
    const p0 = outcomes.find((o) => o.procIndex === 0);
    const p1 = outcomes.find((o) => o.procIndex === 1);
    expect(p0?.ok).toBe(true);
    expect(p1?.ok).toBe(true);
    expect(p1?.detail).toContain("acquired=false");
    const meta = await MaintenanceLock.inspectLockFile(lockFile);
    expect(meta).not.toBeNull();
  });

  it("force-clear and concurrent acquire cannot produce double ownership", async () => {
    const directory = await temporaryDirectory();
    const lockFile = lockFilePath(directory);
    const deadPid = await spawnAndKillPid();
    const deadToken = "dead-owner-token";
    await fs.writeFile(
      lockFile,
      JSON.stringify({
        version: 1,
        mode: "exclusive",
        pid: deadPid,
        token: deadToken,
        startedAt: Date.now(),
        ttlMs: 30000,
      })
    );

    const outcomes = await runMpScenario(
      "force-clear-vs-concurrent-acquire",
      directory,
      2,
      10000,
      deadPid,
      deadToken
    );
    expect(outcomes.length).toBe(2);
    // Both processes must complete without crashing.
    expect(outcomes.every((o) => o.ok)).toBe(true);
    // Exactly one acquireExclusive() must succeed across both processes
    // (no double ownership).
    const acquisitions = outcomes.filter(
      (o) => o.detail.includes("acquired=true")
    ).length;
    expect(acquisitions).toBe(1);
    // Exactly one lock file exists (owned by the winner of the wx race).
    const stat = await fs.stat(lockFile).catch(() => null);
    expect(stat).not.toBeNull();
  });

  it("concurrent drain: only one process holds the maintenance lock", async () => {
    const directory = await temporaryDirectory();
    const outcomes = await runMpScenario(
      "concurrent-drain-only-one",
      directory,
      2
    );
    expect(outcomes.length).toBe(2);
    expect(outcomes.every((o) => o.ok)).toBe(true);
    // Exactly one process acquired the lock; the other's concurrent attempt
    // found it held and returned false.
    const p0 = outcomes.find((o) => o.procIndex === 0);
    const p1 = outcomes.find((o) => o.procIndex === 1);
    const p0Acquired = p0?.detail.includes("drainer-0-acquired=true");
    const p1Acquired = p1?.detail.includes("drainer-1-acquired=true");
    expect(p0Acquired !== p1Acquired).toBe(true); // XOR: exactly one acquired
    // The lock holder performed a drain (reclaimed=0 since no leases).
    const drained = outcomes.filter(
      (o) => o.detail.includes("reclaimed=")
    ).length;
    expect(drained).toBe(1);
  });
});
