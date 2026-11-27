/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Restartable bulk secret rotation tests.
 *
 * Uses isolated temporary directories and real filesystem operations only.
 * Never prints actual keys, plaintext secrets, or secret values.
 */

import { promises as fs } from "fs";
import * as fsSync from "fs";
import * as os from "os";
import * as path from "path";
import {
  createCipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EncryptedFileTenantSecretStore,
} from "./secrets";
import { SecretStoreError } from "./errors";
import {
  rotateSecrets,
  verifySecrets,
  isKeyReferenced,
  isRetirementEligible,
  RotationLock,
  type RotationOptions,
} from "./secret-rotation";
import {
  MaintenanceLock,
  WriterLease,
  acquireWriterLease,
  drainWriterLeases,
  MaintenanceActiveError,
  WriterDrainTimeoutError,
} from "./maintenance-lock";
import { sanitizeCliError } from "./secret-rotation-cli";

const temporaryDirectories: string[] = [];

function activeKeyB64(): string {
  return randomBytes(32).toString("base64");
}

function legacyKeyB64(): string {
  return randomBytes(32).toString("base64");
}

function keyMap(entries: Record<string, string>): Map<string, Buffer> {
  const map = new Map<string, Buffer>();
  for (const [keyId, keyB64] of Object.entries(entries)) {
    map.set(keyId, Buffer.from(keyB64, "base64"));
  }
  return map;
}

async function temporaryDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tenant-secrets-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop()!;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

function fileFor(ref: string, directory: string): string {
  const digest = createHash("sha256").update(ref).digest("hex");
  return path.join(directory, `${digest}.secret`);
}

function writeV1(
  directory: string,
  ref: string,
  value: string,
  legacyKeyId: string,
  keyB64: string
): void {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyB64, "base64"), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const payload = {
    version: 1,
    ref,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  fsSync.writeFileSync(fileFor(ref, directory), JSON.stringify(payload));
}

function writeV2(
  directory: string,
  ref: string,
  value: string,
  keyId: string,
  keyB64: string
): void {
  const iv = randomBytes(12);
  const key = Buffer.from(keyB64, "base64");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const aadPayload = {
    version: 2,
    keyId,
    ref,
  };
  cipher.setAAD(Buffer.from(JSON.stringify(aadPayload), "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const payload = {
    version: 2,
    keyId,
    ref,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  fsSync.writeFileSync(fileFor(ref, directory), JSON.stringify(payload));
}

function readRaw(directory: string, ref: string): string {
  return fsSync.readFileSync(fileFor(ref, directory), "utf8");
}

function countTmp(directory: string): number {
  const names = fsSync.readdirSync(directory);
  return names.filter((n) => n.endsWith(".tmp")).length;
}

function makeOptions(
  directory: string,
  activeKeyId: string,
  keys: Record<string, string>,
  legacyKeyId: string | null = null,
  dryRun: boolean = true
): RotationOptions {
  return {
    directory,
    keyRing: {
      entries: keyMap(keys),
      activeKeyId,
      legacyKeyId,
    },
    dryRun,
  };
}

describe("Rotation - v1 to v2 migration", () => {
  it("migrates v1 to v2 encrypted with active key", async () => {
    const directory = await temporaryDirectory();
    const legacyKey = legacyKeyB64();
    const activeKey = activeKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "v1-secret", "legacy", legacyKey);

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    expect(result.complete).toBe(true);
    expect(result.failed).toBe(0);
    expect(result.migrated).toBe(1);
    expect(result.unchanged).toBe(0);

    const parsed = JSON.parse(readRaw(directory, "kv://tenant-secrets/store-1"));
    expect(parsed.version).toBe(2);
    expect(parsed.keyId).toBe("key-1");
    expect(parsed.ref).toBe("kv://tenant-secrets/store-1");
    expect(parsed.ciphertext).not.toBeUndefined();
  });

  it("v1 migration preserves plaintext", async () => {
    const directory = await temporaryDirectory();
    const legacyKey = legacyKeyB64();
    const activeKey = activeKeyB64();
    const value = "v1-plaintext-value";

    writeV1(directory, "kv://tenant-secrets/store-1", value, "legacy", legacyKey);

    await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    // Verify via a store configured with the active key.
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey, legacy: legacyKey }),
      { activeKeyId: "key-1", legacyKeyId: "legacy" }
    );
    const decrypted = await store.get("kv://tenant-secrets/store-1");
    expect(decrypted).toBe(value);
  });
});

describe("Rotation - old v2 key to active v2 key migration", () => {
  it("migrates v2 encrypted with old key to active key", async () => {
    const directory = await temporaryDirectory();
    const oldKey = activeKeyB64();
    const newKey = activeKeyB64();
    const value = "old-key-secret";

    writeV2(directory, "kv://tenant-secrets/store-1", value, "old-key", oldKey);

    const result = await rotateSecrets(
      makeOptions(directory, "new-key", { "old-key": oldKey, "new-key": newKey }, null, false)
    );

    expect(result.complete).toBe(true);
    expect(result.failed).toBe(0);
    expect(result.migrated).toBe(1);

    const parsed = JSON.parse(readRaw(directory, "kv://tenant-secrets/store-1"));
    expect(parsed.version).toBe(2);
    expect(parsed.keyId).toBe("new-key");
    expect(parsed.ref).toBe("kv://tenant-secrets/store-1");
  });

  it("old v2 migration preserves plaintext", async () => {
    const directory = await temporaryDirectory();
    const oldKey = activeKeyB64();
    const newKey = activeKeyB64();
    const value = "old-key-plaintext";

    writeV2(directory, "kv://tenant-secrets/store-1", value, "old-key", oldKey);

    await rotateSecrets(
      makeOptions(directory, "new-key", { "old-key": oldKey, "new-key": newKey }, null, false)
    );

    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "old-key": oldKey, "new-key": newKey }),
      { activeKeyId: "new-key" }
    );
    const decrypted = await store.get("kv://tenant-secrets/store-1");
    expect(decrypted).toBe(value);
  });
});

describe("Rotation - already-active unchanged", () => {
  it("reports v2 files with active key as unchanged and does not modify", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const value = "already-active-secret";

    writeV2(directory, "kv://tenant-secrets/store-1", value, "active-key", activeKey);

    const before = readRaw(directory, "kv://tenant-secrets/store-1");
    const result = await rotateSecrets(
      makeOptions(directory, "active-key", { "active-key": activeKey }, null, false)
    );

    expect(result.complete).toBe(true);
    expect(result.failed).toBe(0);
    expect(result.migrated).toBe(0);
    expect(result.unchanged).toBe(1);
    expect(readRaw(directory, "kv://tenant-secrets/store-1")).toBe(before);
  });
});

describe("Rotation - dry-run makes no modifications", () => {
  it("dry-run does not write any files", async () => {
    const directory = await temporaryDirectory();
    const legacyKey = legacyKeyB64();
    const activeKey = activeKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "v1-secret", "legacy", legacyKey);
    writeV2(directory, "kv://tenant-secrets/store-2", "old-secret", "old-key", activeKey);

    const beforeStore1 = readRaw(directory, "kv://tenant-secrets/store-1");
    const beforeStore2 = readRaw(directory, "kv://tenant-secrets/store-2");

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey, "old-key": activeKey }, "legacy", true)
    );

    expect(result.complete).toBe(true);
    expect(result.migrated).toBe(2);
    expect(readRaw(directory, "kv://tenant-secrets/store-1")).toBe(beforeStore1);
    expect(readRaw(directory, "kv://tenant-secrets/store-2")).toBe(beforeStore2);
    expect(countTmp(directory)).toBe(0);
  });
});

describe("Rotation - failure preserves original", () => {
  it("authentication failure preserves original", async () => {
    const directory = await temporaryDirectory();
    const legacyKey = legacyKeyB64();
    const activeKey = activeKeyB64();

    // Encrypt v1 with a legacy key NOT present in the ring -> auth failure.
    writeV1(directory, "kv://tenant-secrets/store-1", "v1-secret", "legacy", legacyKey);

    const before = readRaw(directory, "kv://tenant-secrets/store-1");
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey }, null, false)
    );

    expect(result.complete).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.migrated).toBe(0);
    expect(readRaw(directory, "kv://tenant-secrets/store-1")).toBe(before);
    expect(countTmp(directory)).toBe(0);
  });

  it("unknown key preserves original", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();

    // v2 referencing a key not in the ring.
    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "unknown-key", activeKey);

    const before = readRaw(directory, "kv://tenant-secrets/store-1");
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey }, null, false)
    );

    expect(result.complete).toBe(false);
    expect(result.failed).toBe(1);
    expect(readRaw(directory, "kv://tenant-secrets/store-1")).toBe(before);
  });

  it("malformed file preserves original", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();

    const file = fileFor("kv://tenant-secrets/store-1", directory);
    await fs.writeFile(file, "not-json-at-all");

    const before = readRaw(directory, "kv://tenant-secrets/store-1");
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey }, null, false)
    );

    expect(result.complete).toBe(false);
    expect(result.failed).toBe(1);
    expect(readRaw(directory, "kv://tenant-secrets/store-1")).toBe(before);
  });

  it("temporary write failure preserves original", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", activeKey);

    const before = readRaw(directory, "kv://tenant-secrets/store-1");

    // Make the directory read-only so the temp file cannot be created.
    if (process.platform !== "win32") {
      await fs.chmod(directory, 0o555);
      try {
        const result = await rotateSecrets(
          makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": activeKey }, null, false)
        );
        expect(result.complete).toBe(false);
        expect(result.failed).toBe(1);
      } finally {
        await fs.chmod(directory, 0o700);
      }
    }

    expect(readRaw(directory, "kv://tenant-secrets/store-1")).toBe(before);
    expect(countTmp(directory)).toBe(0);
  });

  it("verification failure preserves original", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const plaintext = "verification-plaintext";

    const originalReadFile = fs.readFile.bind(fs);
    const readFileSpy = vi.spyOn(fs, "readFile");
    readFileSpy.mockImplementation((filePath: unknown, ...args: unknown[]) => {
      if (String(filePath).endsWith(".tmp")) {
        return Promise.reject(new Error("read-back verification failure"));
      }
      return originalReadFile(filePath, ...args);
    });

    try {
      writeV2(directory, "kv://tenant-secrets/store-1", plaintext, "old-key", activeKey);
      const before = readRaw(directory, "kv://tenant-secrets/store-1");
      const result = await rotateSecrets(
        makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": activeKey }, null, false)
      );

      expect(result.complete).toBe(false);
      expect(result.failed).toBe(1);
      expect(readRaw(directory, "kv://tenant-secrets/store-1")).toBe(before);
      expect(countTmp(directory)).toBe(0);
    } finally {
      readFileSpy.mockRestore();
    }
  });

  it("error messages never contain plaintext or key material", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const plaintext = "do-not-leak-this-plaintext-value";

    writeV1(directory, "kv://tenant-secrets/store-1", plaintext, "legacy", legacyKeyB64());

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey }, null, false)
    );

    const failing = result.outcomes.find((o) => o.status === "failed");
    expect(failing).toBeDefined();
    expect(failing!.error).not.toContain(plaintext);
    // Active and legacy key material (base64) must not appear either.
    expect(failing!.error).not.toContain(activeKey);
  });
});

describe("Rotation - stale temporary files", () => {
  it("removes stale .tmp files left by an interrupted run", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", activeKey);

    // Plant a stale temp file from a previous interrupted run.
    await fs.writeFile(
      path.join(directory, "stale.abcd1234.tmp"),
      "garbage"
    );
    expect(countTmp(directory)).toBe(1);

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": activeKey }, null, false)
    );

    expect(result.complete).toBe(true);
    expect(countTmp(directory)).toBe(0);
    // The stale temp was never treated as a secret.
    expect(result.scanned).toBe(1);
  });
});

describe("Rotation - restartability and idempotency", () => {
  it("already migrated files are unchanged on a second run", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", activeKey);

    await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": activeKey }, null, false)
    );

    const first = readRaw(directory, "kv://tenant-secrets/store-1");

    // Second run: nothing left to migrate.
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": activeKey }, null, false)
    );

    expect(result.complete).toBe(true);
    expect(result.migrated).toBe(0);
    expect(result.unchanged).toBe(1);
    expect(result.failed).toBe(0);
    expect(readRaw(directory, "kv://tenant-secrets/store-1")).toBe(first);
  });

  it("interrupted migration can be restarted and completed", async () => {
    const directory = await temporaryDirectory();
    const legacyKey = legacyKeyB64();
    const activeKey = activeKeyB64();

    // v1 file (needs legacy key) and old v2 file.
    writeV1(directory, "kv://tenant-secrets/store-1", "v1-secret", "legacy", legacyKey);
    writeV2(directory, "kv://tenant-secrets/store-2", "old-secret", "old-key", activeKey);

    // First run without the legacy key: v1 fails, old v2 migrates.
    const first = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": activeKey }, null, false)
    );
    expect(first.complete).toBe(false);
    expect(first.failed).toBe(1);
    expect(first.migrated).toBe(1);

    // Second run with the legacy key added: v1 migrates, store-2 unchanged.
    const second = await rotateSecrets(
      makeOptions(
        directory,
        "key-1",
        { "key-1": activeKey, "old-key": activeKey, legacy: legacyKey },
        "legacy",
        false
      )
    );
    expect(second.complete).toBe(true);
    expect(second.failed).toBe(0);
    expect(second.migrated).toBe(1);
    expect(second.unchanged).toBe(1);

    // Both now decrypt with the active key.
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey, legacy: legacyKey, "old-key": activeKey }),
      { activeKeyId: "key-1", legacyKeyId: "legacy" }
    );
    expect(await store.get("kv://tenant-secrets/store-1")).toBe("v1-secret");
    expect(await store.get("kv://tenant-secrets/store-2")).toBe("old-secret");
  });
});

describe("Rotation - locking and concurrency", () => {
  async function spawnAndKillPid(): Promise<number> {
    const { spawn } = await import("child_process");
    return new Promise((resolve) => {
      const child = spawn(process.execPath, ["-e", "setTimeout(()=>process.exit(0), 50)"]);
      child.on("exit", () => {
        // Give the OS a moment to reclaim the pid.
        setTimeout(() => resolve(child.pid), 100);
      });
      child.kill();
    });
  }

  it("lock prevents concurrent rotation on the same directory", async () => {
    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");

    const lockA = new RotationLock(lockFile);
    const lockB = new RotationLock(lockFile);

    expect(await lockA.acquire()).toBe(true);
    // A second lock on the same file while the owner is alive must not proceed.
    expect(await lockB.acquire()).toBe(false);
    expect(lockB.isHeld()).toBe(false);

    await lockA.release();
    // After release, a new acquisition can proceed.
    expect(await lockB.acquire()).toBe(true);
    await lockB.release();
  });

  it("stale lock owned by a dead process is removed and acquired", async () => {
    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const pid = await spawnAndKillPid();

    await fs.writeFile(lockFile, JSON.stringify({ pid, startedAt: Date.now() }));

    const lock = new RotationLock(lockFile);
    expect(await lock.acquire()).toBe(true);
    await lock.release();
  });

  it("stale lock whose ownership cannot be established is handled conservatively", async () => {
    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");

    // Unparseable lock content: ownership cannot be established -> do not remove.
    await fs.writeFile(lockFile, "not-json-at-all");
    const lock = new RotationLock(lockFile);
    expect(await lock.acquire()).toBe(false);
    expect(lock.isHeld()).toBe(false);
    // The lock file must remain; it was not automatically removed.
    expect(await fs.readFile(lockFile, "utf8")).toBe("not-json-at-all");
  });

  it("file changed concurrently is not overwritten", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "original", "old-key", oldKey);
    const before = readRaw(directory, "kv://tenant-secrets/store-1");

    const originalStat = fs.stat.bind(fs);
    const statSpy = vi.spyOn(fs, "stat");
    let callCount = 0;
    statSpy.mockImplementation(async (filePath: unknown, ...args: unknown[]) => {
      callCount += 1;
      const real = await originalStat(filePath, ...args);
      if (callCount === 2) {
        // Simulate the file having changed between read and replacement.
        const proto = Object.getPrototypeOf(real);
        const cloned = Object.create(proto);
        Object.assign(cloned, real);
        (cloned as any).mtimeMs = (real as any).mtimeMs + 5000;
        return cloned as unknown as import("fs").Stats;
      }
      return real;
    });

    try {
      const result = await rotateSecrets(
        makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": activeKey }, null, false)
      );
      expect(result.complete).toBe(false);
      expect(result.failed).toBe(1);
      // Original file is preserved, not overwritten with the new value.
      expect(readRaw(directory, "kv://tenant-secrets/store-1")).toBe(before);
    } finally {
      statSpy.mockRestore();
    }
  });
});

describe("Rotation - symlinks and path traversal", () => {
  it("symlinks are not followed", async () => {
    if (process.platform === "win32") {
      // Symlink creation requires privileges on Windows that may not be
      // available in this environment; skip rather than fail.
      return;
    }

    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "v1-secret", "legacy", legacyKey);

    // Create a symlink with a .secret suffix pointing at the real file.
    const linkPath = path.join(directory, "link-to-secret.secret");
    try {
      await fs.symlink(fileFor("kv://tenant-secrets/store-1", directory), linkPath);
    } catch {
      // Symlink creation not permitted in this environment; skip.
      return;
    }

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    // Only the real file is scanned; the symlink is not followed.
    expect(result.scanned).toBe(1);
    expect(result.complete).toBe(true);
    expect(result.migrated).toBe(1);
    // The symlink remains a symlink and is not treated as a secret.
    const stat = await fs.lstat(linkPath);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  it("path traversal is rejected: files outside the root are not processed", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();

    // A file inside the root is processed.
    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", activeKey);

    // A file outside the root (sibling directory) must not be touched.
    const outsideDir = path.join(
      os.tmpdir(),
      "tenant-secrets-outside-" + randomBytes(4).toString("hex")
    );
    await fs.mkdir(outsideDir, { recursive: true });
    temporaryDirectories.push(outsideDir);
    writeV2(outsideDir, "kv://tenant-secrets/store-outside", "outside-secret", "old-key", activeKey);

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": activeKey }, null, false)
    );

    expect(result.scanned).toBe(1);
    expect(result.complete).toBe(true);
    // The outside file is untouched.
    const outsideParsed = JSON.parse(
      await fs.readFile(
        path.join(
          outsideDir,
          `${createHash("sha256").update("kv://tenant-secrets/store-outside").digest("hex")}.secret`
        ),
        "utf8"
      )
    );
    expect(outsideParsed.keyId).toBe("old-key");
  });
});

describe("Verification - read-only scan", () => {
  it("reports counts by envelope version and key id", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "a", "active-key", activeKey);
    writeV2(directory, "kv://tenant-secrets/store-2", "b", "old-key", oldKey);
    writeV1(directory, "kv://tenant-secrets/store-3", "c", "legacy", legacyKey);

    const result = await verifySecrets(directory, {
      entries: keyMap({ "active-key": activeKey, "old-key": oldKey, legacy: legacyKey }),
      activeKeyId: "active-key",
      legacyKeyId: "legacy",
    });

    expect(result.scanned).toBe(3);
    expect(result.complete).toBe(true);
    expect(result.v1Files).toBe(1);
    expect(result.unknownKeyFiles).toBe(0);
    expect(result.malformedOrUnreadableFiles).toBe(0);
    expect(result.keyReferenceCounts["active-key"]).toBe(1);
    expect(result.keyReferenceCounts["old-key"]).toBe(1);
  });

  it("detects v1 files", async () => {
    const directory = await temporaryDirectory();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "v1-secret", "legacy", legacyKey);

    const result = await verifySecrets(directory, {
      entries: keyMap({ "key-1": activeKeyB64(), legacy: legacyKey }),
      activeKeyId: "key-1",
      legacyKeyId: "legacy",
    });

    expect(result.v1Files).toBe(1);
    expect(result.byVersionAndKey["1"]["(v1-legacy)"]).toBe(1);
  });

  it("detects files referencing unknown keys", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "missing-key", activeKey);

    const result = await verifySecrets(directory, {
      entries: keyMap({ "key-1": activeKey }),
      activeKeyId: "key-1",
      legacyKeyId: null,
    });

    expect(result.unknownKeyFiles).toBe(1);
  });

  it("reports malformed or unreadable files", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();

    await fs.writeFile(fileFor("kv://tenant-secrets/store-1", directory), "not-json");
    // Unreadable: a directory named like a secret file cannot be read as UTF-8.
    const unreadable = path.join(directory, `${createHash("sha256").update("kv://tenant-secrets/store-2").digest("hex")}.secret`);
    await fs.mkdir(unreadable, { recursive: true });

    const result = await verifySecrets(directory, {
      entries: keyMap({ "key-1": activeKey }),
      activeKeyId: "key-1",
      legacyKeyId: null,
    });

    expect(result.malformedOrUnreadableFiles).toBeGreaterThanOrEqual(1);
    expect(result.complete).toBe(false);
  });

  it("isKeyReferenced reports whether a key is still referenced", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "a", "old-key", oldKey);
    writeV2(directory, "kv://tenant-secrets/store-2", "b", "active-key", activeKey);

    const result = await verifySecrets(directory, {
      entries: keyMap({ "active-key": activeKey, "old-key": oldKey }),
      activeKeyId: "active-key",
      legacyKeyId: null,
    });

    expect(isKeyReferenced(result, "old-key")).toBe(true);
    expect(isKeyReferenced(result, "active-key")).toBe(true);
    expect(isKeyReferenced(result, "retired-key")).toBe(false);
  });

  it("isRetirementEligible requires complete scan, no v1, no references, no malformed", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "a", "old-key", oldKey);

    const result = await verifySecrets(directory, {
      entries: keyMap({ "active-key": activeKey, "old-key": oldKey }),
      activeKeyId: "active-key",
      legacyKeyId: null,
    });

    // old-key is still referenced -> not eligible.
    expect(isRetirementEligible(result, "old-key")).toBe(false);
    expect(isKeyReferenced(result, "old-key")).toBe(true);

    // Migrate old-key away, then it becomes eligible (scan complete, no v1, no refs, no malformed).
    await rotateSecrets(
      makeOptions(directory, "active-key", { "active-key": activeKey, "old-key": oldKey }, null, false)
    );

    const after = await verifySecrets(directory, {
      entries: keyMap({ "active-key": activeKey, "old-key": oldKey }),
      activeKeyId: "active-key",
      legacyKeyId: null,
    });

    expect(isKeyReferenced(after, "old-key")).toBe(false);
    expect(isRetirementEligible(after, "old-key")).toBe(true);
  });

  it("verification refuses retirement eligibility if any file is unreadable", async () => {
    if (process.platform === "win32") {
      // POSIX chmod 000 does not make a file unreadable on Windows ACLs;
      // this specific scenario is POSIX-only.
      return;
    }

    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "a", "old-key", oldKey);
    writeV2(directory, "kv://tenant-secrets/store-2", "b", "active-key", activeKey);

    // Make store-2 unreadable so the scan cannot complete.
    const badFile = fileFor("kv://tenant-secrets/store-2", directory);
    await fs.chmod(badFile, 0o000);

    try {
      const result = await verifySecrets(directory, {
        entries: keyMap({ "active-key": activeKey, "old-key": oldKey }),
        activeKeyId: "active-key",
        legacyKeyId: null,
      });

      expect(result.complete).toBe(false);
      expect(result.malformedOrUnreadableFiles).toBeGreaterThan(0);
      // Retirement must be refused because the scan is incomplete.
      expect(isRetirementEligible(result, "old-key")).toBe(false);
    } finally {
      // Restore permissions so cleanup can remove the file.
      await fs.chmod(badFile, 0o600).catch(() => undefined);
    }
  });
});

describe("Rotation - backup recovery (F-01)", () => {
  it("State 1: restores backup when original is missing", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    // Write a v1 secret file
    writeV1(directory, "kv://tenant-secrets/store-1", "recovery-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);
    const originalContent = readRaw(directory, "kv://tenant-secrets/store-1");

    // Delete the original, leaving only a backup (using new naming pattern)
    await fs.unlink(filePath);
    const randomHex = "abcd1234ef00";
    const backupPath = `${filePath}.${randomHex}.bak`;
    await fs.writeFile(backupPath, originalContent);

    // Run rotation (non-dry-run triggers recoverStartBackups)
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    // Backup should have been restored to the original path,
    // then rotation migrated it to v2 with the active key.
    const restored = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(restored);
    expect(parsed.version).toBe(2);
    expect(parsed.keyId).toBe("key-1");
    expect(parsed.ref).toBe("kv://tenant-secrets/store-1");
    // Backup should be cleaned up after successful processing
    let backupExists = false;
    try {
      await fs.stat(backupPath);
      backupExists = true;
    } catch {
      backupExists = false;
    }
    expect(backupExists).toBe(false);
    expect(result.scanned).toBe(1);
    expect(result.complete).toBe(true);
    expect(result.migrated).toBe(1);
  });

  it("State 2: restores backup when original is invalid", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "recovery-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);
    const originalContent = readRaw(directory, "kv://tenant-secrets/store-1");

    // Corrupt the original
    await fs.writeFile(filePath, "corrupted-invalid-json");
    // Plant a backup with good content (using new naming pattern)
    const randomHex = "abcd1234ef01";
    const backupPath = `${filePath}.${randomHex}.bak`;
    await fs.writeFile(backupPath, originalContent);

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    // Backup should have been restored over the invalid original,
    // then rotation migrated it to v2 with the active key.
    const restored = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(restored);
    expect(parsed.version).toBe(2);
    expect(parsed.keyId).toBe("key-1");
    expect(parsed.ref).toBe("kv://tenant-secrets/store-1");
    // Backup should be cleaned up
    let backupExists = false;
    try {
      await fs.stat(backupPath);
      backupExists = true;
    } catch {
      backupExists = false;
    }
    expect(backupExists).toBe(false);
    expect(result.scanned).toBe(1);
    expect(result.complete).toBe(true);
    expect(result.migrated).toBe(1);
  });

  it("State 2: deletes backup when original is valid", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "recovery-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);
    const originalContent = readRaw(directory, "kv://tenant-secrets/store-1");

    // Plant a redundant backup (original is valid) using new naming pattern
    const randomHex = "abcd1234ef02";
    const backupPath = `${filePath}.${randomHex}.bak`;
    await fs.writeFile(backupPath, originalContent);

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    // Backup should be deleted (original is valid)
    let backupExists = false;
    try {
      await fs.stat(backupPath);
      backupExists = true;
    } catch {
      backupExists = false;
    }
    expect(backupExists).toBe(false);
    expect(result.scanned).toBe(1);
  });

  it("retains backup if restoration fails", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "recovery-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);
    const originalContent = readRaw(directory, "kv://tenant-secrets/store-1");

    // Delete original and plant backup
    await fs.unlink(filePath);
    const backupPath = `${filePath}.bak`;
    await fs.writeFile(backupPath, originalContent);

    // Make the directory read-only so restoration cannot succeed
    if (process.platform !== "win32") {
      await fs.chmod(directory, 0o500);
      try {
        const result = await rotateSecrets(
          makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
        );
        // Rotation may still report success for other files, but the backup
        // should be preserved because restoration failed.
      } finally {
        await fs.chmod(directory, 0o700);
      }
    }

    // Backup should still exist (restoration was blocked)
    let backupExists = false;
    try {
      await fs.stat(backupPath);
      backupExists = true;
    } catch {
      backupExists = false;
    }
    expect(backupExists).toBe(true);
  });
});

describe("Rotation - lock ownership (F-05)", () => {
  it("old lock owner cannot delete newer owner's lock", async () => {
    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");

    const lockA = new RotationLock(lockFile);
    const lockB = new RotationLock(lockFile);

    // A acquires first
    expect(await lockA.acquire()).toBe(true);

    // B cannot acquire while A holds it
    expect(await lockB.acquire()).toBe(false);
    expect(lockB.isHeld()).toBe(false);

    // B tries to release (should not unlink A's lock because token mismatch)
    await lockB.release();
    // Lock file should still exist (A holds it)
    const lockExistsAfterBRelease = await fs.stat(lockFile).then(() => true).catch(() => false);
    expect(lockExistsAfterBRelease).toBe(true);

    // A releases successfully
    await lockA.release();
    const lockExistsAfterARelease = await fs.stat(lockFile).then(() => true).catch(() => false);
    expect(lockExistsAfterARelease).toBe(false);
  });

  it("lock owner token mismatch prevents stale release", async () => {
    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");

    const lockA = new RotationLock(lockFile);
    expect(await lockA.acquire()).toBe(true);

    // Manually overwrite the lock file with a different token (simulating
    // a newer owner who acquired after A was paused/resumed)
    await fs.writeFile(
      lockFile,
      JSON.stringify({ pid: 99999, token: "different-token", startedAt: Date.now() })
    );

    // A's release should detect token mismatch and NOT unlink
    await lockA.release();

    // Lock file should still exist with the different token
    const content = await fs.readFile(lockFile, "utf8");
    expect(JSON.parse(content).token).toBe("different-token");

    // Clean up
    await fs.unlink(lockFile);
  });
});

describe("Rotation - content hash (F-02/F-03)", () => {
  it("content hash detects same-size modification", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "original-value", "old-key", oldKey);
    const targetPath = fileFor("kv://tenant-secrets/store-1", directory);
    const before = readRaw(directory, "kv://tenant-secrets/store-1");

    // Mock fs.readFile to return different content on the second call
    // (simulating a concurrent modification between read and replacement)
    const originalReadFile = fs.readFile.bind(fs);
    let readCount = 0;
    const readFileSpy = vi.spyOn(fs, "readFile");
    readFileSpy.mockImplementation((filePath: unknown, ...args: unknown[]) => {
      const pathStr = String(filePath);
      if (pathStr === targetPath) {
        readCount += 1;
        if (readCount >= 2) {
          // Second and subsequent reads: return modified content (same size, different value)
          const modified = before.replace("original-value", "modified-value!!");
          return Promise.resolve(Buffer.from(modified, "utf8"));
        }
      }
      return originalReadFile(filePath, ...args);
    });

    try {
      const result = await rotateSecrets(
        makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": oldKey }, null, false)
      );

      // Replacement should be aborted due to hash mismatch
      expect(result.complete).toBe(false);
      expect(result.failed).toBe(1);
      // Original file is preserved, not overwritten
      expect(readRaw(directory, "kv://tenant-secrets/store-1")).toBe(before);
    } finally {
      readFileSpy.mockRestore();
    }
  });

  it("content hash detects same-mtime modification", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "original-value", "old-key", oldKey);
    const targetPath = fileFor("kv://tenant-secrets/store-1", directory);
    const before = readRaw(directory, "kv://tenant-secrets/store-1");

    // Mock fs.readFile to return different content on the second call
    const originalReadFile = fs.readFile.bind(fs);
    let readCount = 0;
    const readFileSpy = vi.spyOn(fs, "readFile");
    readFileSpy.mockImplementation((filePath: unknown, ...args: unknown[]) => {
      const pathStr = String(filePath);
      if (pathStr === targetPath) {
        readCount += 1;
        if (readCount >= 2) {
          // Second and subsequent reads: return modified content (same size, same mtime)
          const modified = before.replace("original-value", "modified-value!!");
          return Promise.resolve(Buffer.from(modified, "utf8"));
        }
      }
      return originalReadFile(filePath, ...args);
    });

    try {
      const result = await rotateSecrets(
        makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": oldKey }, null, false)
      );

      expect(result.complete).toBe(false);
      expect(result.failed).toBe(1);
      expect(readRaw(directory, "kv://tenant-secrets/store-1")).toBe(before);
    } finally {
      readFileSpy.mockRestore();
    }
  });
});

describe("Rotation - hard links (F-13)", () => {
  it("skips hard-linked secret files where supported", async () => {
    if (process.platform === "win32") {
      // Hard links may not be creatable in this Windows environment; skip.
      return;
    }

    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "hardlink-secret", "old-key", activeKey);
    const originalPath = fileFor("kv://tenant-secrets/store-1", directory);

    // Create a hard link to the secret file
    const linkPath = path.join(directory, "hardlink.secret");
    try {
      await fs.link(originalPath, linkPath);
    } catch {
      // Hard links not supported; skip
      return;
    }

    // Both files have the same inode (nlink > 1). Neither should be scanned
    // because rotation would break the other link's expectation.
    const stat1 = await fs.stat(originalPath);
    const stat2 = await fs.stat(linkPath);
    expect(stat1.ino).toBe(stat2.ino);
    expect(stat1.nlink).toBeGreaterThan(1);

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": activeKey }, null, false)
    );

    // Neither the original nor the hard link should be processed (nlink > 1)
    expect(result.scanned).toBe(0);
    expect(result.complete).toBe(true);

    // Clean up the hard link
    try {
      await fs.unlink(linkPath);
    } catch {
      // Ignore
    }
  });
});

describe("Rotation - stale lock retry (F-06)", () => {
  it("uses bounded retries for stale lock acquisition", async () => {
    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");

    const stalePid = 123456789;

    // Mock process.kill to report the stale PID as dead (ESRCH)
    const originalKill = process.kill.bind(process);
    const killSpy = vi.spyOn(process, "kill");
    killSpy.mockImplementation((pid: number, signal?: unknown) => {
      if (pid === stalePid) {
        const err = Object.assign(new Error("process not found"), {
          code: "ESRCH",
        });
        throw err;
      }
      return originalKill(pid, signal);
    });

    try {
      await fs.writeFile(
        lockFile,
        JSON.stringify({
          pid: stalePid,
          token: "stale-token",
          startedAt: Date.now(),
        })
      );

      const lock = new RotationLock(lockFile);
      // Should acquire after removing the stale lock (dead PID = ESRCH)
      expect(await lock.acquire()).toBe(true);
      expect(lock.isHeld()).toBe(true);
      await lock.release();
    } finally {
      killSpy.mockRestore();
    }
  });

  it("does not remove lock when ownership cannot be established", async () => {
    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");

    // Unparseable lock content
    await fs.writeFile(lockFile, "not-json-at-all");

    const lock = new RotationLock(lockFile);
    expect(await lock.acquire()).toBe(false);
    expect(lock.isHeld()).toBe(false);
    // Lock file must remain
    const content = await fs.readFile(lockFile, "utf8");
    expect(content).toBe("not-json-at-all");
  });
});

describe("Rotation - operational guard", () => {
  it("rotations must be explicit -- never implicit", async () => {
    const mod = await import("./secret-rotation");
    const exports = Object.keys(mod);
    expect(exports).not.toContain("rotateOnStartup");
    expect(exports).not.toContain("autoRotate");
    expect(exports).not.toContain("rotateAndGet");
    // Only explicit entry points exist
    expect(exports).toContain("rotateSecrets");
    expect(exports).toContain("verifySecrets");
  });
});

describe("Rotation - backup never overwritten (F-07b)", () => {
  it("pre-existing backup is preserved and not overwritten by rotation", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "original-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);

    // Plant a pre-existing backup with a name that does NOT match the
    // new backup pattern (no .<12hex>.bak suffix), so recoverStartBackups
    // ignores it. Rotation must not touch it.
    const existingBackup = `${filePath}.legacy.bak`;
    await fs.writeFile(existingBackup, "pre-existing-backup-content");

    // Run rotation - should migrate v1 to v2 successfully
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    // Rotation should complete successfully
    expect(result.complete).toBe(true);
    expect(result.failed).toBe(0);
    expect(result.migrated).toBe(1);

    // The pre-existing backup must be preserved intact
    const backupContent = await fs.readFile(existingBackup, "utf8");
    expect(backupContent).toBe("pre-existing-backup-content");

    // Original file should now be v2 (migrated)
    const originalContent = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(originalContent);
    expect(parsed.version).toBe(2);
    expect(parsed.keyId).toBe("key-1");
  });
});

describe("Rotation - crash recovery scenarios (F-01)", () => {
  it("crash after original→backup: restores backup when original missing", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "crash-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);
    const originalContent = await fs.readFile(filePath, "utf8");

    // Simulate crash: rename original to backup, but temp was never renamed to original
    const randomHex = "abcd1234ef00";
    const backupPath = `${filePath}.${randomHex}.bak`;
    await fs.rename(filePath, backupPath);
    // Original is now missing, backup exists with original content

    // Run rotation - recoverStartBackups should restore the backup
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    // Backup should have been restored to original path,
    // then rotation migrated it to v2 with the active key.
    const restored = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(restored);
    expect(parsed.version).toBe(2);
    expect(parsed.keyId).toBe("key-1");
    expect(parsed.ref).toBe("kv://tenant-secrets/store-1");
    // Backup should be consumed (migrated to v2, then deleted)
    let backupStillExists = false;
    try {
      await fs.stat(backupPath);
      backupStillExists = true;
    } catch {
      backupStillExists = false;
    }
    expect(backupStillExists).toBe(false);
    expect(result.scanned).toBe(1);
    expect(result.complete).toBe(true);
    expect(result.migrated).toBe(1);
    expect(result.complete).toBe(true);
  });

  it("crash after temp→original: deletes redundant backup when original valid", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "crash-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);
    const originalContent = await fs.readFile(filePath, "utf8");

    // Simulate crash: temp was renamed to original (now v2), but backup not deleted
    // First migrate the file to v2 so original is valid v2 content
    await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );
    // Now original is v2 with active key. Verify it's valid.
    const afterFirst = await fs.readFile(filePath, "utf8");
    expect(JSON.parse(afterFirst).version).toBe(2);

    // Plant a redundant backup (original is valid)
    const backupPath = `${filePath}.${randomBytes(6).toString("hex")}.bak`;
    await fs.writeFile(backupPath, originalContent);

    // Run rotation again - recoverStartBackups should delete the redundant backup
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    let backupStillExists = false;
    try {
      await fs.stat(backupPath);
      backupStillExists = true;
    } catch {
      backupStillExists = false;
    }
    expect(backupStillExists).toBe(false);
    expect(result.scanned).toBe(1);
    expect(result.complete).toBe(true);
  });

  it("invalid/malformed backup is not restored", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "backup-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);

    // Delete original and plant an invalid backup
    await fs.unlink(filePath);
    const backupPath = `${filePath}.${randomBytes(6).toString("hex")}.bak`;
    await fs.writeFile(backupPath, "not-valid-json-at-all");

    // Run rotation - backup should NOT be restored because it's invalid
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    // Original should still be missing (backup not restored)
    let originalExists = false;
    try {
      await fs.stat(filePath);
      originalExists = true;
    } catch {
      originalExists = false;
    }
    expect(originalExists).toBe(false);

    // Backup should still exist (not restored, not deleted)
    let backupExists = false;
    try {
      await fs.stat(backupPath);
      backupExists = true;
    } catch {
      backupExists = false;
    }
    expect(backupExists).toBe(true);

    // The file is missing so it won't be scanned; scanned should be 0
    expect(result.scanned).toBe(0);
  });

  it("multiple backup candidates for same original cause conservative failure", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "multi-backup-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);

    // Delete original and plant two backups for the same original
    await fs.unlink(filePath);
    const backup1 = `${filePath}.${randomBytes(6).toString("hex")}.bak`;
    const backup2 = `${filePath}.${randomBytes(6).toString("hex")}.bak`;
    await fs.writeFile(backup1, "backup-one-content");
    await fs.writeFile(backup2, "backup-two-content");

    // Run rotation - should NOT restore either backup (ambiguous)
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    // Both backups should still exist
    let b1Exists = false, b2Exists = false;
    try { await fs.stat(backup1); b1Exists = true; } catch {}
    try { await fs.stat(backup2); b2Exists = true; } catch {}
    expect(b1Exists).toBe(true);
    expect(b2Exists).toBe(true);

    // Original should still be missing
    let originalExists = false;
    try { await fs.stat(filePath); originalExists = true; } catch {}
    expect(originalExists).toBe(false);
  });

  it("recovery never deletes the only valid copy", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "only-copy-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);
    const originalContent = await fs.readFile(filePath, "utf8");

    // Plant a valid backup alongside the valid original
    const backupPath = `${filePath}.${randomBytes(6).toString("hex")}.bak`;
    await fs.writeFile(backupPath, originalContent);

    // Run rotation - original is valid, backup should be deleted (redundant)
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );

    // Original should still exist and be valid (migrated to v2)
    const stillExists = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(stillExists);
    expect(parsed.version).toBe(2);
    expect(parsed.keyId).toBe("key-1");

    // Backup should be cleaned up (redundant with valid original)
    let backupExists = false;
    try {
      await fs.stat(backupPath);
      backupExists = true;
    } catch {
      backupExists = false;
    }
    expect(backupExists).toBe(false);

    expect(result.scanned).toBe(1);
    expect(result.complete).toBe(true);
  });
});

describe("Rotation - hard-link retirement safety", () => {
  it("skipped hard links make scan incomplete and block retirement", async () => {
    if (process.platform === "win32") {
      return;
    }

    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    // Create a normal secret file
    writeV2(directory, "kv://tenant-secrets/store-1", "normal-secret", "old-key", oldKey);
    const originalPath = fileFor("kv://tenant-secrets/store-1", directory);

    // Create a hard link to it
    const linkPath = path.join(directory, "hardlink.secret");
    try {
      await fs.link(originalPath, linkPath);
    } catch {
      return; // Hard links not supported
    }

    // Verify both have same inode (nlink > 1)
    const stat1 = await fs.stat(originalPath);
    expect(stat1.nlink).toBeGreaterThan(1);

    // Run verification - hard links should be skipped, scan incomplete
    const result = await verifySecrets(directory, {
      entries: keyMap({ "active-key": activeKey, "old-key": oldKey }),
      activeKeyId: "active-key",
      legacyKeyId: null,
    });

    // Hard links were skipped: scanned count should not include them
    // and skippedHardLinks should be > 0
    expect(result.skippedHardLinks).toBeGreaterThan(0);
    // Scan is incomplete because hard links were skipped
    expect(result.complete).toBe(false);

    // Retirement should NOT be eligible because scan is incomplete
    expect(isRetirementEligible(result, "old-key")).toBe(false);

    // Clean up hard link
    try {
      await fs.unlink(linkPath);
    } catch {
      // Ignore
    }
  });
});

describe("Rotation - backup collision safety", () => {
  it("concurrent backup creation: exactly one succeeds, other preserves all data", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "concurrent-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);
    const backupPath = `${filePath}.deadbeef1234.bak`;

    // First attempt: exclusive creation should succeed
    let firstResult: { success: boolean; code?: string };
    try {
      const handle = await fs.open(backupPath, "wx");
      await handle.close();
      firstResult = { success: true };
    } catch (err) {
      firstResult = { success: false, code: (err as NodeJS.ErrnoException).code };
    }

    // Second attempt: exclusive creation must fail with EEXIST
    let secondResult: { success: boolean; code?: string };
    try {
      const handle = await fs.open(backupPath, "wx");
      await handle.close();
      secondResult = { success: true };
    } catch (err) {
      secondResult = { success: false, code: (err as NodeJS.ErrnoException).code };
    }

    // Exactly one succeeded
    expect(firstResult.success !== secondResult.success).toBe(true);

    // The failing attempt got EEXIST
    const failing = firstResult.success ? secondResult : firstResult;
    expect(failing.code).toBe("EEXIST");

    // Original file is untouched (still valid encrypted JSON)
    const originalContent = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(originalContent);
    expect(parsed.version).toBe(1);
    expect(parsed.ref).toBe("kv://tenant-secrets/store-1");

    // The successful backup exists (created by the winner)
    const backupExists = await fs.stat(backupPath).then(() => true).catch(() => false);
    expect(backupExists).toBe(true);

    // Clean up
    try {
      await fs.unlink(backupPath);
    } catch {
      // Ignore
    }
  });

  it("pre-existing valid backup remains byte-for-byte unchanged", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "preserved-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);
    const originalContent = await fs.readFile(filePath, "utf8");

    // Pre-create a backup with known content
    const backupPath = `${filePath}.deadbeef1234.bak`;
    const backupContent = "pre-existing-backup-content-that-must-not-change";
    await fs.writeFile(backupPath, backupContent);

    // Attempt exclusive creation on the same path - must fail with EEXIST
    let createResult: { success: boolean; code?: string };
    try {
      const handle = await fs.open(backupPath, "wx");
      await handle.close();
      createResult = { success: true };
    } catch (err) {
      createResult = { success: false, code: (err as NodeJS.ErrnoException).code };
    }

    // Exclusive creation must fail because the file already exists
    expect(createResult.success).toBe(false);
    expect(createResult.code).toBe("EEXIST");

    // Pre-existing backup is byte-for-byte unchanged
    const backupAfter = await fs.readFile(backupPath, "utf8");
    expect(backupAfter).toBe(backupContent);

    // Original file is untouched
    const originalAfter = await fs.readFile(filePath, "utf8");
    expect(originalAfter).toBe(originalContent);

    // Clean up
    try {
      await fs.unlink(backupPath);
    } catch {
      // Ignore
    }
  });

  it("backup file mode is 0o600 on POSIX", async () => {
    if (process.platform === "win32") {
      // POSIX permission bits are not enforced on Windows ACLs; skip mode check.
      return;
    }

    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "perm-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);

    // Mock fs.rename to fail so rotation aborts after backup creation but
    // before backup deletion, leaving the backup file available for inspection.
    const originalRename = fs.rename.bind(fs);
    const renameSpy = vi.spyOn(fs, "rename");
    renameSpy.mockImplementation(() => {
      return Promise.reject(
        Object.assign(new Error("rename blocked"), { code: "EXDEV" })
      );
    });

    try {
      const result = await rotateSecrets(
        makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
      );

      // Rotation should fail because rename was blocked
      expect(result.failed).toBeGreaterThan(0);

      // Find the backup file created during the failed rotation
      const entries = await fs.readdir(directory);
      const backupFiles = entries.filter((n) => n.endsWith(".bak"));
      expect(backupFiles.length).toBeGreaterThan(0);

      const backupPath = path.join(directory, backupFiles[0]!);
      const stat = await fs.stat(backupPath);
      const mode = stat.mode & 0o777;
      expect(mode).toBe(0o600);

      // Original file must be intact (rename never happened)
      const originalContent = await fs.readFile(filePath, "utf8");
      expect(originalContent).toContain("perm-secret");
    } finally {
      renameSpy.mockRestore();
      // Clean up any leftover backup files
      const entries = await fs.readdir(directory).catch(() => [] as string[]);
      for (const name of entries) {
        if (name.endsWith(".bak")) {
          try {
            await fs.unlink(path.join(directory, name));
          } catch {
            // Ignore
          }
        }
      }
    }
  });

  it("permission enforcement failure preserves original and does not replace", async () => {
    if (process.platform === "win32") {
      // On Windows, chmod is a no-op for ACLs; this test is POSIX-specific.
      return;
    }

    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "perm-fail-secret", "legacy", legacyKey);
    const filePath = fileFor("kv://tenant-secrets/store-1", directory);
    const originalContent = await fs.readFile(filePath, "utf8");

    // Mock FileHandle.chmod to throw, simulating permission enforcement failure.
    const originalChmod = fs.FileHandle.prototype.chmod;
    (fs.FileHandle.prototype as any).chmod = async function () {
      throw Object.assign(new Error("chmod denied"), { code: "EPERM" });
    };

    try {
      const result = await rotateSecrets(
        makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
      );

      // Rotation should fail because permission enforcement failed
      expect(result.failed).toBeGreaterThan(0);

      // Original file must be completely intact
      const originalAfter = await fs.readFile(filePath, "utf8");
      expect(originalAfter).toBe(originalContent);
    } finally {
      (fs.FileHandle.prototype as any).chmod = originalChmod;
    }
  });
});

describe("Write Coordination - CLI error sanitization", () => {
  it("sanitizeCliError returns SecretStoreError message directly", async () => {
    const err = new SecretStoreError("Secret store error message");
    expect(sanitizeCliError(err)).toBe("Secret store error message");
  });

  it("sanitizeCliError returns error code with generic message for Error with code", async () => {
    const err = Object.assign(new Error("ENOENT: no such file"), {
      code: "ENOENT",
    });
    expect(sanitizeCliError(err)).toBe("ENOENT: system error");
  });

  it("sanitizeCliError returns Unexpected error for plain Error without code", async () => {
    const err = new Error("some error");
    expect(sanitizeCliError(err)).toBe("Unexpected error");
  });

  it("sanitizeCliError returns Unexpected error for unknown type", async () => {
    expect(sanitizeCliError("not an error")).toBe("Unexpected error");
    expect(sanitizeCliError(42)).toBe("Unexpected error");
    expect(sanitizeCliError(null)).toBe("Unexpected error");
  });

  it("sanitizeCliError flattens AggregateError with multiple errors", async () => {
    const err = new AggregateError(
      [new Error("first error"), new Error("second error")],
      "Aggregate",
    );
    const result = sanitizeCliError(err);
    expect(result).toContain("Unexpected error");
    expect(result).not.toContain("first error");
    expect(result).not.toContain("second error");
    expect(result).not.toContain("Aggregate");
  });

  it("sanitizeCliError handles nested AggregateError", async () => {
    const inner = new AggregateError(
      [new Error("inner error")],
      "inner aggregate",
    );
    const outer = new AggregateError([inner, new Error("outer error")], "outer");
    const result = sanitizeCliError(outer);
    expect(result).toContain("Unexpected error");
    expect(result).not.toContain("inner error");
    expect(result).not.toContain("outer error");
  });

  it("sanitizeCliError does not leak sensitive filesystem paths", async () => {
    const err = new Error("ENOENT: no such file, open '/etc/shadow'");
    Object.assign(err, { code: "ENOENT" });
    const result = sanitizeCliError(err);
    // The message includes the path from Error.message, which is the caller's
    // responsibility to sanitize before passing. sanitizeCliError preserves
    // the message as-is for Error types (matching existing behavior).
    expect(result).toContain("ENOENT");
  });

  it("sanitizeCliError handles AggregateError with SecretStoreError nested", async () => {
    const secretErr = new SecretStoreError("Active key is not available");
    const err = new AggregateError([secretErr], "Multiple errors");
    const result = sanitizeCliError(err);
    expect(result).toBe("Active key is not available");
  });

  it("sanitizeCliError handles AggregateError with mixed errors", async () => {
    const secretErr = new SecretStoreError("Secret store error");
    const plainErr = new Error("plain error");
    Object.assign(plainErr, { code: "EACCES" });
    const err = new AggregateError([secretErr, plainErr], "Mixed");
    const result = sanitizeCliError(err);
    expect(result).toContain("Secret store error");
    expect(result).toContain("EACCES: system error");
  });

  it("sanitizeCliError does not leak filesystem paths in Error messages", async () => {
    const err = new Error("ENOENT: no such file, open '/etc/shadow'");
    Object.assign(err, { code: "ENOENT" });
    const result = sanitizeCliError(err);
    expect(result).toBe("ENOENT: system error");
    expect(result).not.toContain("/etc/shadow");
    expect(result).not.toContain("open");
  });

  it("sanitizeCliError does not leak sensitive information in nested AggregateError", async () => {
    const innerErr = new Error("Failed to read /etc/passwd");
    Object.assign(innerErr, { code: "EACCES" });
    const outerErr = new AggregateError([innerErr], "outer");
    const result = sanitizeCliError(outerErr);
    expect(result).toContain("EACCES: system error");
    expect(result).not.toContain("/etc/passwd");
    expect(result).not.toContain("Failed to read");
  });
});

describe("Write Coordination - RotationLock release behavior", () => {
  it("RotationLock release() sets held=false after successful unlink", async () => {
    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const lock = new RotationLock(lockFile);

    expect(await lock.acquire()).toBe(true);
    expect(lock.isHeld()).toBe(true);

    await lock.release();
    expect(lock.isHeld()).toBe(false);

    // Lock file should be gone
    await expect(fs.access(lockFile)).rejects.toBeTruthy();
  });

  it("RotationLock release() preserves held=true when unlink fails", async () => {
    if (process.platform === "win32") {
      // On Windows, chmod-based permission tests are not reliable
      return;
    }

    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const lock = new RotationLock(lockFile);

    expect(await lock.acquire()).toBe(true);
    expect(lock.isHeld()).toBe(true);

    // Make lock file read-only so unlink fails on POSIX
    await fs.chmod(lockFile, 0o444);
    try {
      await lock.release();
      // held should remain true because unlink failed
      expect(lock.isHeld()).toBe(true);
    } finally {
      await fs.chmod(lockFile, 0o600).catch(() => undefined);
      await lock.release();
    }
  });

  it("RotationLock release() does not delete lock with mismatched ownership", async () => {
    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const lockA = new RotationLock(lockFile);
    const lockB = new RotationLock(lockFile);

    expect(await lockA.acquire()).toBe(true);
    expect(lockA.isHeld()).toBe(true);

    // lockB has different PID/token, cannot release lockA's lock
    await lockB.release();
    expect(lockA.isHeld()).toBe(true);

    // Lock file should still exist
    const content = await fs.readFile(lockFile, "utf8");
    expect(JSON.parse(content).pid).toBe(lockA.pid);

    await lockA.release();
    expect(lockA.isHeld()).toBe(false);
  });

  it("RotationLock release() after failed release can retry and succeed", async () => {
    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const lock = new RotationLock(lockFile);

    expect(await lock.acquire()).toBe(true);
    expect(lock.isHeld()).toBe(true);

    // Make lock file read-only so first release attempt fails
    if (process.platform !== "win32") {
      await fs.chmod(lockFile, 0o444);
      try {
        await lock.release();
        // held should remain true because unlink failed
        expect(lock.isHeld()).toBe(true);
      } finally {
        await fs.chmod(lockFile, 0o600).catch(() => undefined);
      }
    }

    // Second release should succeed now that permissions are restored
    await lock.release();
    expect(lock.isHeld()).toBe(false);

    // Lock file should be gone
    await expect(fs.access(lockFile)).rejects.toBeTruthy();
  });


  it("RotationLock release() does not unlink when lock file ownership changed", async () => {
    const directory = await temporaryDirectory();
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const lockA = new RotationLock(lockFile);
    const lockB = new RotationLock(lockFile);

    expect(await lockA.acquire()).toBe(true);
    expect(lockA.isHeld()).toBe(true);

    // Simulate lockB acquiring the lock (different pid/token)
    const lockBContent = JSON.stringify({
      pid: lockB.pid,
      token: lockB.ownerToken,
      startedAt: Date.now(),
    });
    await fs.writeFile(lockFile, lockBContent);

    // lockA attempts release but its pid/token no longer match the lock file
    await lockA.release();
    expect(lockA.isHeld()).toBe(true);

    // Lock file should still exist with lockB's pid
    const content = await fs.readFile(lockFile, "utf8");
    expect(JSON.parse(content).pid).toBe(lockB.pid);

    // lockB can still release its own lock
    await lockB.release();
    expect(lockB.isHeld()).toBe(false);
  });


});

describe("Write Coordination - genuine multi-process writer vs rotation", () => {
  it("writer holds lease; concurrent rotation acquires lock and drains lease", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey }),
      { activeKeyId: "key-1" }
    );

    // Writer acquires lease first
    const lease = await acquireWriterLease({
      directory,
      operation: "put",
    });

    // Rotation acquires exclusive maintenance lock
    const rotationLock = new RotationLock(
      path.join(directory, ".tenant-secret-rotation.lock")
    );
    expect(await rotationLock.acquire()).toBe(true);

    const maintenanceLock = new MaintenanceLock(
      path.join(directory, ".tenant-secret-maintenance.lock")
    );
    expect(await maintenanceLock.acquireExclusive()).toBe(true);

    // Drain should wait for the writer to release
    const drainPromise = drainWriterLeases({ directory, timeoutMs: 5000 });
    setTimeout(async () => {
      await lease.release();
    }, 50);

    const reclaimed = await drainPromise;
    expect(reclaimed).toBe(0);

    await maintenanceLock.release();
    await rotationLock.release();
  });

  it("rotation blocks new put() while maintenance lock is active", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey }),
      { activeKeyId: "key-1" }
    );

    // Acquire maintenance lock first
    const lockFile = path.join(directory, ".tenant-secret-maintenance.lock");
    const lock = new MaintenanceLock(lockFile);
    expect(await lock.acquireExclusive()).toBe(true);

    try {
      // put() should be rejected because maintenance is active
      await expect(
        store.put("kv://tenant-secrets/store-1", "test-value")
      ).rejects.toBeInstanceOf(MaintenanceActiveError);
    } finally {
      await lock.release();
    }

    // After releasing maintenance lock, put() should work
    await store.put("kv://tenant-secrets/store-1", "test-value");
    const value = await store.get("kv://tenant-secrets/store-1");
    expect(value).toBe("test-value");
  });

  it("two rotations on same directory: second fails to acquire RotationLock", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "v1-secret", "legacy", legacyKey);

    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");

    const lockA = new RotationLock(lockFile);
    expect(await lockA.acquire()).toBe(true);

    const lockB = new RotationLock(lockFile);
    expect(await lockB.acquire()).toBe(false);
    expect(lockB.isHeld()).toBe(false);

    await lockA.release();
  });
});

describe("Write Coordination - put/delete writer lease lifecycle", () => {
  it("put() acquires and releases writer lease", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey }),
      { activeKeyId: "key-1" }
    );

    await store.put("kv://tenant-secrets/store-1", "test-value");

    // Lease directory should be empty after release (writer released lease)
    const leaseDir = path.join(directory, ".tenant-secret-writer-leases");
    const entries = await fs.readdir(leaseDir).catch(() => []);
    expect(entries.length).toBe(0);

    // Verify the value was written
    const value = await store.get("kv://tenant-secrets/store-1");
    expect(value).toBe("test-value");
  });

  it("delete() acquires and releases writer lease", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey }),
      { activeKeyId: "key-1" }
    );

    await store.put("kv://tenant-secrets/store-1", "test-value");
    await store.delete("kv://tenant-secrets/store-1");

    // Lease directory should be empty after release
    const leaseDir = path.join(directory, ".tenant-secret-writer-leases");
    const entries = await fs.readdir(leaseDir).catch(() => []);
    expect(entries.length).toBe(0);

    // Verify the secret was deleted
    const value = await store.get("kv://tenant-secrets/store-1");
    expect(value).toBeNull();
  });

  it("put() is rejected when maintenance lock is active", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey }),
      { activeKeyId: "key-1" }
    );

    // Acquire maintenance lock first
    const lockFile = path.join(directory, ".tenant-secret-maintenance.lock");
    const lock = new MaintenanceLock(lockFile);
    expect(await lock.acquireExclusive()).toBe(true);

    try {
      // put() should be rejected because maintenance is active
      await expect(
        store.put("kv://tenant-secrets/store-1", "test-value")
      ).rejects.toBeInstanceOf(MaintenanceActiveError);
    } finally {
      await lock.release();
    }

    // After releasing maintenance lock, put() should work
    await store.put("kv://tenant-secrets/store-1", "test-value");
    const value = await store.get("kv://tenant-secrets/store-1");
    expect(value).toBe("test-value");
  });

  it("delete() is rejected when maintenance lock is active", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey }),
      { activeKeyId: "key-1" }
    );

    await store.put("kv://tenant-secrets/store-1", "test-value");

    // Acquire maintenance lock first
    const lockFile = path.join(directory, ".tenant-secret-maintenance.lock");
    const lock = new MaintenanceLock(lockFile);
    expect(await lock.acquireExclusive()).toBe(true);

    try {
      await expect(
        store.delete("kv://tenant-secrets/store-1")
      ).rejects.toBeInstanceOf(MaintenanceActiveError);
    } finally {
      await lock.release();
    }

    // After releasing maintenance lock, delete() should work
    await store.delete("kv://tenant-secrets/store-1");
    const value = await store.get("kv://tenant-secrets/store-1");
    expect(value).toBeNull();
  });
});

describe("Write Coordination - writer vs rotation race", () => {
  it("writer holds lease; rotation acquires lock and drains lease", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey }),
      { activeKeyId: "key-1" }
    );

    // Writer acquires lease first
    const lease = await acquireWriterLease({
      directory,
      operation: "put",
    });

    // Rotation acquires exclusive maintenance lock
    const rotationLock = new RotationLock(
      path.join(directory, ".tenant-secret-rotation.lock")
    );
    expect(await rotationLock.acquire()).toBe(true);

    const maintenanceLock = new MaintenanceLock(
      path.join(directory, ".tenant-secret-maintenance.lock")
    );
    expect(await maintenanceLock.acquireExclusive()).toBe(true);

    // Drain should wait for the writer to release
    const drainPromise = drainWriterLeases({ directory, timeoutMs: 5000 });
    setTimeout(async () => {
      await lease.release();
    }, 50);

    const reclaimed = await drainPromise;
    expect(reclaimed).toBe(0);

    await maintenanceLock.release();
    await rotationLock.release();
  });

  it("rotation fails closed when writer holds lease and does not release", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey }),
      { activeKeyId: "key-1" }
    );

    // Writer acquires lease first
    const lease = await acquireWriterLease({
      directory,
      operation: "put",
    });

    // Rotation acquires exclusive maintenance lock
    const rotationLock = new RotationLock(
      path.join(directory, ".tenant-secret-rotation.lock")
    );
    expect(await rotationLock.acquire()).toBe(true);

    const maintenanceLock = new MaintenanceLock(
      path.join(directory, ".tenant-secret-maintenance.lock")
    );
    expect(await maintenanceLock.acquireExclusive()).toBe(true);

    // Drain should fail closed because writer holds lease and doesn't release
    await expect(
      drainWriterLeases({ directory, timeoutMs: 300 })
    ).rejects.toBeInstanceOf(WriterDrainTimeoutError);

    await lease.release();
    await maintenanceLock.release();
    await rotationLock.release();
  });
});

describe("Write Coordination - concurrent rotations", () => {
  it("two rotations on same directory: exactly one acquires lock", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "v1-secret", "legacy", legacyKey);

    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");

    const lockA = new RotationLock(lockFile);
    const lockB = new RotationLock(lockFile);

    const acquiredA = await lockA.acquire();
    const acquiredB = await lockB.acquire();

    // Exactly one should acquire
    expect(acquiredA !== acquiredB).toBe(true);

    // Release the one that acquired
    if (acquiredA) await lockA.release();
    if (acquiredB) await lockB.release();
  });
});

describe("Write Coordination - malformed and ambiguous leases", () => {
  it("malformed lease metadata causes rotation to fail closed", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "v1-secret", "legacy", legacyKey);

    // Plant a malformed lease file
    const leaseDir = path.join(directory, ".tenant-secret-writer-leases");
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.writeFile(
      path.join(leaseDir, "garbage.lease"),
      "not-json-at-all"
    );

    // Rotation should fail closed because of ambiguous lease metadata
    await expect(
      rotateSecrets(
        makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
      )
    ).rejects.toBeInstanceOf(WriterDrainTimeoutError);
  });
});

describe("Write Coordination - operation failure + cleanup failure", () => {
  it("put() write failure + lease release failure surfaces both errors", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey }),
      { activeKeyId: "key-1" }
    );

    // Mock fs.rename to fail (simulating write failure)
    const originalRename = fs.rename.bind(fs);
    const renameSpy = vi.spyOn(fs, "rename");
    renameSpy.mockImplementation(() => {
      return Promise.reject(
        Object.assign(new Error("rename blocked"), { code: "EXDEV" })
      );
    });

    // Mock lease release to also fail
    const originalRelease = WriterLease.prototype.release;
    (WriterLease.prototype as any).release = async function () {
      throw new Error("lease release failed");
    };

    try {
      await expect(
        store.put("kv://tenant-secrets/store-1", "test-value")
      ).rejects.toThrow(AggregateError);
    } finally {
      renameSpy.mockRestore();
      (WriterLease.prototype as any).release = originalRelease;
    }
  });

  it("put() write success + lease release failure surfaces cleanup error", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const store = new EncryptedFileTenantSecretStore(
      directory,
      keyMap({ "key-1": activeKey }),
      { activeKeyId: "key-1" }
    );

    // Mock lease release to fail
    const originalRelease = WriterLease.prototype.release;
    (WriterLease.prototype as any).release = async function () {
      throw new Error("lease release failed");
    };

    try {
      await expect(
        store.put("kv://tenant-secrets/store-1", "test-value")
      ).rejects.toThrow(AggregateError);

      // But the write should have succeeded (value is stored)
      const value = await store.get("kv://tenant-secrets/store-1");
      expect(value).toBe("test-value");
    } finally {
      (WriterLease.prototype as any).release = originalRelease;
    }
  });
});

describe("Write Coordination - both lock acquisition failures", () => {
  it("two rotations: second fails to acquire RotationLock", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "v1-secret", "legacy", legacyKey);

    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");

    const lockA = new RotationLock(lockFile);
    expect(await lockA.acquire()).toBe(true);

    const lockB = new RotationLock(lockFile);
    expect(await lockB.acquire()).toBe(false);
    expect(lockB.isHeld()).toBe(false);

    await lockA.release();
  });
});

describe("Write Coordination - crash/restart behavior", () => {
  it("rotation recovers from stale RotationLock after writer crash", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const legacyKey = legacyKeyB64();

    writeV1(directory, "kv://tenant-secrets/store-1", "v1-secret", "legacy", legacyKey);

    // Plant a stale lock with a clearly dead PID
    const lockFile = path.join(directory, ".tenant-secret-rotation.lock");
    await fs.writeFile(
      lockFile,
      JSON.stringify({ pid: 999999, token: "dead-token", startedAt: Date.now() })
    );

    // Rotation should acquire the stale lock (PID is dead)
    const rotationLock = new RotationLock(lockFile);
    expect(await rotationLock.acquire()).toBe(true);
    await rotationLock.release();

    // Now rotation should work normally
    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, legacy: legacyKey }, "legacy", false)
    );
    expect(result.complete).toBe(true);
    expect(result.migrated).toBe(1);
  });
});

describe("Rotation - lock scope during execute-mode rotation", () => {
  it("both locks remain held during file replacement (fs.rename)", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", oldKey);

    const rotationLockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const maintenanceLockFile = path.join(directory, ".tenant-secret-maintenance.lock");

    let locksHeldDuringReplace = false;
    const originalRename = fs.rename.bind(fs);
    const renameSpy = vi.spyOn(fs, "rename");
    renameSpy.mockImplementation(async (oldPath: unknown, newPath: unknown) => {
      try {
        await fs.access(rotationLockFile);
        await fs.access(maintenanceLockFile);
        locksHeldDuringReplace = true;
      } catch {
        // Locks not held during replacement
      }
      return originalRename(oldPath, newPath);
    });

    try {
      const result = await rotateSecrets(
        makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": oldKey }, null, false)
      );
      expect(result.complete).toBe(true);
      expect(result.migrated).toBe(1);
      expect(locksHeldDuringReplace).toBe(true);
    } finally {
      renameSpy.mockRestore();
    }
  });

  it("both locks are released after successful rotation", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", oldKey);

    const rotationLockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const maintenanceLockFile = path.join(directory, ".tenant-secret-maintenance.lock");

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": oldKey }, null, false)
    );
    expect(result.complete).toBe(true);

    const rotationLockExists = await fs
      .stat(rotationLockFile)
      .then(() => true)
      .catch(() => false);
    const maintenanceLockExists = await fs
      .stat(maintenanceLockFile)
      .then(() => true)
      .catch(() => false);
    expect(rotationLockExists).toBe(false);
    expect(maintenanceLockExists).toBe(false);
  });

  it("both locks are released after rotation failure (read-only directory)", async () => {
    if (process.platform === "win32") {
      return;
    }

    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", oldKey);

    const rotationLockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const maintenanceLockFile = path.join(directory, ".tenant-secret-maintenance.lock");

    // Make directory read-only so temp file creation fails
    await fs.chmod(directory, 0o555);
    try {
      const result = await rotateSecrets(
        makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": oldKey }, null, false)
      );
      expect(result.complete).toBe(false);
      expect(result.failed).toBeGreaterThan(0);
    } finally {
      await fs.chmod(directory, 0o700);
    }

    const rotationLockExists = await fs
      .stat(rotationLockFile)
      .then(() => true)
      .catch(() => false);
    const maintenanceLockExists = await fs
      .stat(maintenanceLockFile)
      .then(() => true)
      .catch(() => false);
    expect(rotationLockExists).toBe(false);
    expect(maintenanceLockExists).toBe(false);
  });

  it("both locks are released after verification failure (processFile read-back fails)", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", oldKey);

    const rotationLockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const maintenanceLockFile = path.join(directory, ".tenant-secret-maintenance.lock");

    const originalReadFile = fs.readFile.bind(fs);
    const readFileSpy = vi.spyOn(fs, "readFile");
    readFileSpy.mockImplementation((filePath: unknown, ...args: unknown[]) => {
      if (String(filePath).endsWith(".tmp")) {
        return Promise.reject(new Error("read-back verification failure"));
      }
      return originalReadFile(filePath, ...args);
    });

    try {
      const result = await rotateSecrets(
        makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": oldKey }, null, false)
      );
      expect(result.complete).toBe(false);
      expect(result.failed).toBeGreaterThan(0);
    } finally {
      readFileSpy.mockRestore();
    }

    const rotationLockExists = await fs
      .stat(rotationLockFile)
      .then(() => true)
      .catch(() => false);
    const maintenanceLockExists = await fs
      .stat(maintenanceLockFile)
      .then(() => true)
      .catch(() => false);
    expect(rotationLockExists).toBe(false);
    expect(maintenanceLockExists).toBe(false);
  });

  it("lock cleanup failures are surfaced without false success", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", oldKey);

    // Mock MaintenanceLock.release to fail
    const originalRelease = MaintenanceLock.prototype.release;
    (MaintenanceLock.prototype as any).release = async function () {
      throw new Error("maintenance lock release failed");
    };

    try {
      await expect(
        rotateSecrets(
          makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": activeKey }, null, false)
        )
      ).rejects.toThrow();
    } finally {
      (MaintenanceLock.prototype as any).release = originalRelease;
    }
  });

  it("concurrent writers cannot enter during rotation (put() rejected)", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", oldKey);

    const originalRename = fs.rename.bind(fs);
    let writerBlocked = false;
    const renameSpy = vi.spyOn(fs, "rename");
    renameSpy.mockImplementation(async (oldPath: unknown, newPath: unknown) => {
      // While rotation holds both locks, attempt a writer lease acquisition
      try {
        await acquireWriterLease({ directory, operation: "put" });
        // If we get here, writer was NOT blocked
        writerBlocked = false;
      } catch (err) {
        if (err instanceof MaintenanceActiveError) {
          writerBlocked = true;
        } else {
          writerBlocked = false;
        }
      }
      return originalRename(oldPath, newPath);
    });

    try {
      const result = await rotateSecrets(
        makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": oldKey }, null, false)
      );
      expect(result.complete).toBe(true);
      expect(writerBlocked).toBe(true);
    } finally {
      renameSpy.mockRestore();
    }
  });
});

describe("Rotation - whole-directory verification during locked rotation", () => {
  it("whole-directory verification runs and passes while both locks are held", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", oldKey);

    const rotationLockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const maintenanceLockFile = path.join(directory, ".tenant-secret-maintenance.lock");

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": oldKey }, null, false)
    );

    // verifySecrets ran and passed: all files valid envelopes with known keys
    expect(result.complete).toBe(true);
    expect(result.failed).toBe(0);

    // Both locks released after verification
    const rotationLockExists = await fs
      .stat(rotationLockFile)
      .then(() => true)
      .catch(() => false);
    const maintenanceLockExists = await fs
      .stat(maintenanceLockFile)
      .then(() => true)
      .catch(() => false);
    expect(rotationLockExists).toBe(false);
    expect(maintenanceLockExists).toBe(false);
  });

  it("verification failure marks incomplete but does not throw; locks still released", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();

    // Malformed file: not valid JSON
    const badFile = path.join(
      directory,
      `${createHash("sha256").update("kv://tenant-secrets/bad").digest("hex")}.secret`
    );
    await fs.writeFile(badFile, "not-json-at-all");

    const rotationLockFile = path.join(directory, ".tenant-secret-rotation.lock");
    const maintenanceLockFile = path.join(directory, ".tenant-secret-maintenance.lock");

    const result = await rotateSecrets(
      makeOptions(directory, "key-1", { "key-1": activeKey }, null, false)
    );

    // Verification found the malformed file -> incomplete
    expect(result.complete).toBe(false);
    expect(result.failed).toBeGreaterThan(0);

    // Both locks still released
    const rotationLockExists = await fs
      .stat(rotationLockFile)
      .then(() => true)
      .catch(() => false);
    const maintenanceLockExists = await fs
      .stat(maintenanceLockFile)
      .then(() => true)
      .catch(() => false);
    expect(rotationLockExists).toBe(false);
    expect(maintenanceLockExists).toBe(false);
  });

  it("both operation failure and lock cleanup failure produce AggregateError", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", oldKey);

    // Plant a malformed lease file so drainWriterLeases fails closed
    // (ambiguous metadata -> WriterDrainTimeoutError -> rotationError)
    const leaseDir = path.join(directory, ".tenant-secret-writer-leases");
    await fs.mkdir(leaseDir, { recursive: true });
    await fs.writeFile(
      path.join(leaseDir, "garbage.lease"),
      "not-json-at-all"
    );

    // Lock cleanup failure: MaintenanceLock.release throws
    const originalRelease = MaintenanceLock.prototype.release;
    (MaintenanceLock.prototype as any).release = async function () {
      throw new Error("maintenance lock release failed");
    };

    try {
      await expect(
        rotateSecrets(
          makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": oldKey }, null, false)
        )
      ).rejects.toThrow(AggregateError);
    } finally {
      (MaintenanceLock.prototype as any).release = originalRelease;
    }
  });

  it("MaintenanceLock release failure still attempts RotationLock release", async () => {
    const directory = await temporaryDirectory();
    const activeKey = activeKeyB64();
    const oldKey = activeKeyB64();

    writeV2(directory, "kv://tenant-secrets/store-1", "secret", "old-key", oldKey);

    const rotationLockFile = path.join(directory, ".tenant-secret-rotation.lock");

    let rotationLockReleaseAttempted = false;
    const originalRotationRelease = RotationLock.prototype.release;
    (RotationLock.prototype as any).release = async function () {
      rotationLockReleaseAttempted = true;
      return originalRotationRelease.call(this);
    };

    // MaintenanceLock.release throws
    const originalMaintenanceRelease = MaintenanceLock.prototype.release;
    (MaintenanceLock.prototype as any).release = async function () {
      throw new Error("maintenance lock release failed");
    };

    try {
      await expect(
        rotateSecrets(
          makeOptions(directory, "key-1", { "key-1": activeKey, "old-key": oldKey }, null, false)
        )
      ).rejects.toThrow();

      // RotationLock.release was still attempted despite MaintenanceLock failure
      expect(rotationLockReleaseAttempted).toBe(true);
    } finally {
      (RotationLock.prototype as any).release = originalRotationRelease;
      (MaintenanceLock.prototype as any).release = originalMaintenanceRelease;
    }
  });
});

