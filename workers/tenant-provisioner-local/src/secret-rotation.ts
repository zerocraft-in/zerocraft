/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Restartable bulk secret key rotation.
 *
 * Phase 2: an explicit, offline maintenance utility that migrates tenant
 * secret files:
 *   * Legacy v1 envelopes -> v2 encrypted with the configured active key.
 *   * Existing v2 envelopes encrypted with old keys -> the active key.
 *
 * Secret references and plaintext values are preserved. The utility never
 * runs automatically (not during startup or get()), never requires a
 * database or network connection, and never deletes or retires keys.
 *
 * IMPORTANT: Application writes through EncryptedFileTenantSecretStore.put()
 * MUST be paused for the entire duration of a rotation operation. The
 * rotation lock (RotationLock) only coordinates between rotation processes;
 * it does NOT coordinate with live put() calls. A concurrent put() can
 * replace a secret file between the rotation's read and replacement steps.
 * Although the SHA-256 content-hash check detects most concurrent
 * modifications, it cannot eliminate all TOCTOU races. Pause the provisioner
 * or otherwise quiesce secret writes before running rotation.
 *
 * Failure policy (documented):
 *   Each recognized file is processed independently. A failure on one file
 *   does not abort the other files. The original file is always preserved on
 *   failure, the failure is recorded with a sanitized message, and the
 *   overall result reports partial failure (exit code 1 from the CLI). A run
 *   only reports complete success when every file was processed successfully.
 *
 * Restartability:
 *   Safe to run again after interruption. Files already encrypted with the
 *   active key are reported as unchanged. Stale temporary files left by a
 *   previous interrupted run are removed at the start of a run and are never
 *   treated as valid migrated secrets.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { promises as fs } from "fs";
import type { Dirent, Stats } from "fs";
import * as path from "path";
import {
  ENVELOPE_VERSION_V1,
  ENVELOPE_VERSION_V2,
  buildAad,
  parseStrictBase64,
  validateIvLength,
  validateTagLength,
} from "./secrets";
import {
  MaintenanceLock,
  WriterDrainTimeoutError,
  drainWriterLeases,
} from "./maintenance-lock";
import { SecretStoreError } from "./errors";

const SECRET_FILE_SUFFIX = ".secret";
const BACKUP_FILE_SUFFIX = ".bak";
const TEMP_FILE_SUFFIX = ".tmp";
const DEFAULT_LOCK_FILE_NAME = ".tenant-secret-rotation.lock";

// Small, stable chunk of randomness used to name temporary files.
const TEMP_RANDOM_BYTES = 6;
// Randomness used to name backup files during crash-safe replacement.
// Backup names are ${file}.${randomHex}.bak so that recovery can derive
// the original path by stripping the .<12-hex>.bak suffix.
const BACKUP_RANDOM_BYTES = 6;
// Maximum attempts to acquire a lock after encountering a stale lock file.
const MAX_STALE_LOCK_RETRIES = 5;
// Delay between stale-lock retry attempts.
const STALE_LOCK_RETRY_DELAY_MS = 100;

/**
 * Regex to match a backup file name and extract the original path.
 * Matches: <originalPath>.<12-hex>.bak
 * Group 1 captures the original path.
 */
const BACKUP_NAME_PATTERN = /^(.+)\.[0-9a-f]{12}\.bak$/;

/**
 * Generate a unique owner token for a lock instance.
 * Combined with PID, this prevents a stale/resumed process from deleting
 * another process's active lock after PID reuse.
 */
function generateOwnerToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Sleep for a fixed number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Key ring shape consumed by rotation and verification.
 */
export interface KeyRingLike {
  entries: Map<string, Buffer>;
  activeKeyId: string;
  legacyKeyId: string | null;
}

/**
 * Options for rotateSecrets.
 */
export interface RotationOptions {
  directory: string;
  keyRing: KeyRingLike;
  /** When true, no files are written or removed (default: true). */
  dryRun?: boolean;
  /** Override lock file path (default: <directory>/.tenant-secret-rotation.lock). */
  lockFile?: string;
}

/**
 * Per-file outcome of a rotation run.
 */
export interface FileOutcome {
  file: string; // absolute path
  relative: string; // path relative to the secret directory
  status: "migrated" | "unchanged" | "failed";
  version: number | null;
  keyId: string | null;
  error: string | null; // sanitized; never contains plaintext or key material
}

/**
 * Result of a rotation run.
 */
export interface RotationResult {
  directory: string;
  dryRun: boolean;
  scanned: number;
  migrated: number;
  unchanged: number;
  failed: number;
  complete: boolean;
  skippedHardLinks: number;
  outcomes: FileOutcome[];
}

/**
 * Parsed and validated envelope fields (plaintext never stored here).
 */
interface ParsedEnvelope {
  version: number;
  keyId: string | null;
  ref: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

/**
 * Resolve a path and confirm it is inside the configured root.
 * Rejects path traversal attempts.
 */
function isWithinRoot(resolved: string, root: string): boolean {
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  return resolved === root || resolved.startsWith(rootWithSep);
}

/**
 * Recursively collect recognized secret files (*.secret) under directory.
 * Never follows symbolic links. Skips files that escape the root.
 * Unrelated files are ignored and never modified.
 */
async function walkSecretFiles(directory: string): Promise<{
  files: string[];
  skippedHardLinks: number;
}> {
  const root = path.resolve(directory);
  const results: string[] = [];
  let skippedHardLinks = 0;
  await walkDir(root, root, results, () => {
    skippedHardLinks += 1;
  });
  return { files: results.sort(), skippedHardLinks };
}

async function walkDir(
  dir: string,
  root: string,
  results: string[],
  onSkipHardLink: () => void
): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    // An unreadable subdirectory cannot be scanned; rotation will still
    // report the files it can inspect. Verification treats unreadable files
    // as failures via read errors on individual files.
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const resolved = path.resolve(full);

    // Never follow symbolic links.
    if (entry.isSymbolicLink()) {
      continue;
    }

    // Reject paths that escape the configured root.
    if (!isWithinRoot(resolved, root)) {
      continue;
    }

    if (entry.isDirectory()) {
      await walkDir(full, root, results, onSkipHardLink);
    } else if (entry.isFile() && entry.name.endsWith(SECRET_FILE_SUFFIX)) {
      // Reject hard-linked secret files: rotation replaces a directory entry,
      // which would leave other hard links pointing at the pre-rotation inode,
      // creating an inconsistent key state across paths.
      let stat: Stats;
      try {
        stat = await fs.stat(resolved);
      } catch {
        continue;
      }
      if (stat.nlink > 1) {
        onSkipHardLink();
        continue;
      }
      results.push(resolved);
    }
    // All other files are unrelated and are left untouched.
  }
}

/**
 * Sanitize an error for reporting. Never leaks plaintext or key material.
 * System error codes are safe to report; SecretStoreError messages are
 * already sanitized by construction.
 */
function sanitizeError(error: unknown): string {
  if (error instanceof SecretStoreError) {
    return error.message;
  }
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code) {
      return `${code}: ${error.message}`;
    }
    return "Unable to process file";
  }
  return "Unable to process file";
}

/**
/**
 * Parse and validate a secret envelope without decrypting it.
 *
 * When `expectedRef` is provided (used for read-back verification of a temp
 * file), the reference is compared against it instead of deriving it from
 * the filename, since temp file names do not match the reference hash.
 */
function parseAndValidate(
  raw: string,
  file: string,
  expectedRef?: string
): ParsedEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SecretStoreError("Tenant secret file is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SecretStoreError("Tenant secret file is invalid");
  }

  const record = parsed as Record<string, unknown>;
  const version = record.version;
  if (version !== ENVELOPE_VERSION_V1 && version !== ENVELOPE_VERSION_V2) {
    throw new SecretStoreError(
      `Unsupported envelope version ${String(version)}`
    );
  }

  const ref = record.ref;
  if (typeof ref !== "string" || !ref.trim()) {
    throw new SecretStoreError("Tenant secret file is invalid: missing ref");
  }

  if (expectedRef !== undefined) {
    // Temp-file read-back: validate against the original reference.
    if (ref !== expectedRef) {
      throw new SecretStoreError("Tenant secret file reference mismatch");
    }
  } else {
    // The file name is sha256(ref).secret; confirm the file is where it belongs.
    const base = path.basename(file, SECRET_FILE_SUFFIX);
    const digest = createHash("sha256").update(ref).digest("hex");
    if (base !== digest) {
      throw new SecretStoreError("Tenant secret file reference mismatch");
    }
  }

  if (typeof record.iv !== "string" || typeof record.tag !== "string" || typeof record.ciphertext !== "string") {
    throw new SecretStoreError("Tenant secret file is invalid");
  }

  let keyId: string | null = null;
  if (version === ENVELOPE_VERSION_V2) {
    if (typeof record.keyId !== "string" || !record.keyId.trim()) {
      throw new SecretStoreError("Tenant secret file is invalid: missing keyId");
    }
    keyId = record.keyId;
  }

  return {
    version,
    keyId,
    ref,
    iv: record.iv as string,
    tag: record.tag as string,
    ciphertext: record.ciphertext as string,
  };
}

/**
 * Validate the structural fields of an encrypted-secret envelope without
 * checking the filename-to-ref binding.
 *
 * Used during backup recovery to confirm a backup file contains a
 * structurally valid, decryptable-looking envelope before restoring it.
 *
 * IMPORTANT: Structural validation (JSON shape, field presence, base64
 * encoding, IV/tag lengths) is NOT cryptographic authentication. It does
 * not verify that the envelope can be decrypted with a configured key.
 * When no key ring is provided to the caller, structural validation alone
 * cannot establish that the envelope is authentic or recoverable. The
 * caller must call decryptBackupEnvelope() with a key ring to perform
 * full authentication before trusting the envelope contents.
 *
 * Does not decrypt or verify authentication (that requires the key ring
 * and is performed separately by decryptBackupEnvelope()).
 *
 * Returns the parsed envelope fields on success, or throws a
 * SecretStoreError with a sanitized message on failure.
 */
function validateEnvelopeContent(
  raw: string,
  expectedRef?: string
): ParsedEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SecretStoreError("Backup file is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SecretStoreError("Backup file is invalid");
  }

  const record = parsed as Record<string, unknown>;
  const version = record.version;
  if (version !== ENVELOPE_VERSION_V1 && version !== ENVELOPE_VERSION_V2) {
    throw new SecretStoreError(
      `Backup file has unsupported envelope version ${String(version)}`
    );
  }

  const ref = record.ref;
  if (typeof ref !== "string" || !ref.trim()) {
    throw new SecretStoreError("Backup file is invalid: missing ref");
  }

  if (expectedRef !== undefined && ref !== expectedRef) {
    throw new SecretStoreError("Backup file reference mismatch");
  }

  if (
    typeof record.iv !== "string" ||
    typeof record.tag !== "string" ||
    typeof record.ciphertext !== "string"
  ) {
    throw new SecretStoreError("Backup file is invalid");
  }

  if (version === ENVELOPE_VERSION_V2) {
    if (typeof record.keyId !== "string" || !record.keyId.trim()) {
      throw new SecretStoreError("Backup file is invalid: missing keyId");
    }
  }

  // Validate base64 encoding and lengths of structural fields.
  try {
    decodeField(record.iv as string, 12, "backup iv");
    decodeField(record.tag as string, 16, "backup tag");
    decodeField(record.ciphertext as string, 0, "backup ciphertext");
  } catch {
    throw new SecretStoreError("Backup file has invalid encoding");
  }

  return {
    version,
    keyId: version === ENVELOPE_VERSION_V2 ? (record.keyId as string) : null,
    ref,
    iv: record.iv as string,
    tag: record.tag as string,
    ciphertext: record.ciphertext as string,
  };
}

/**
 * Authenticate-decrypt a backup envelope using the configured key ring.
 * Returns the plaintext on success, or throws a sanitized error.
 * Used during backup recovery to confirm a backup can be decrypted before
 * restoring it over an original file.
 */
async function decryptBackupEnvelope(
  envelope: ParsedEnvelope,
  keyRing: KeyRingLike
): Promise<string> {
  return decryptEnvelope(envelope, keyRing);
}

/**
 * Decode a strict Base64 field, failing closed on invalid encoding.
 *
 * When expectedBytes is 0 (variable-length fields such as ciphertext),
 * encoding validity is still checked but the decoded length is not fixed.
 */
function decodeField(value: string, expectedBytes: number, context: string): Buffer {
  let decoded: Buffer;
  try {
    if (expectedBytes > 0) {
      decoded = parseStrictBase64(value, expectedBytes);
    } else {
      // Variable length: enforce canonical Base64 without a fixed length.
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
        throw new SecretStoreError(`${context}: contains characters outside the Base64 alphabet`);
      }
      const decodedTemp = Buffer.from(value, "base64");
      if (decodedTemp.toString("base64") !== value) {
        throw new SecretStoreError(`${context}: non-canonical encoding detected`);
      }
      decoded = decodedTemp;
    }
  } catch {
    throw new SecretStoreError(`${context}: invalid encoding`);
  }
  return decoded;
}

/**
 * Decrypt an envelope using the v1 legacy-key rule or the v2 keyId rule.
 * Preserves the plaintext; never logs it.
 */
async function decryptEnvelope(
  envelope: ParsedEnvelope,
  keyRing: KeyRingLike
): Promise<string> {
  const { ref } = envelope;

  if (envelope.version === ENVELOPE_VERSION_V1) {
    if (!keyRing.legacyKeyId) {
      throw new SecretStoreError(
        "Legacy key is not configured; cannot decrypt v1 envelope"
      );
    }
    const key = keyRing.entries.get(keyRing.legacyKeyId);
    if (!key) {
      throw new SecretStoreError(
        `Legacy key ${keyRing.legacyKeyId} is not available`
      );
    }

    const iv = decodeField(envelope.iv, 12, "v1 envelope");
    validateIvLength(iv, "v1 envelope");
    const tag = decodeField(envelope.tag, 16, "v1 envelope");
    validateTagLength(tag, "v1 envelope");

    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([
        decipher.update(
          decodeField(envelope.ciphertext, 0, "v1 ciphertext")
        ),
        decipher.final(),
      ]);
      return plaintext.toString("utf8");
    } catch {
      throw new SecretStoreError("Unable to decrypt tenant secret");
    }
  }

  // v2
  const keyId = envelope.keyId;
  if (!keyId) {
    throw new SecretStoreError("Tenant secret file is invalid: missing keyId");
  }

  const key = keyRing.entries.get(keyId);
  if (!key) {
    throw new SecretStoreError(
      `Key ${keyId} is not available in the key ring`
    );
  }

  const iv = decodeField(envelope.iv, 12, "v2 envelope");
  validateIvLength(iv, "v2 envelope");
  const tag = decodeField(envelope.tag, 16, "v2 envelope");
  validateTagLength(tag, "v2 envelope");

  const aad = buildAad({ version: ENVELOPE_VERSION_V2, keyId, ref });

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(decodeField(envelope.ciphertext, 0, "v2 ciphertext")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    throw new SecretStoreError("Unable to decrypt tenant secret");
  }
}

/**
 * Encrypt a value into a v2 envelope using the active key and existing AAD.
 * Mirror of EncryptedFileTenantSecretStore.put() envelope construction.
 */
function encryptValue(
  value: string,
  ref: string,
  keyRing: KeyRingLike
): { envelope: Record<string, unknown>; content: string } {
  const activeKey = keyRing.entries.get(keyRing.activeKeyId);
  if (!activeKey) {
    throw new SecretStoreError(
      `Active key ${keyRing.activeKeyId} is not available`
    );
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", activeKey, iv);
  const aad = buildAad({
    version: ENVELOPE_VERSION_V2,
    keyId: keyRing.activeKeyId,
    ref,
  });
  cipher.setAAD(aad);

  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const envelope: Record<string, unknown> = {
    version: ENVELOPE_VERSION_V2,
    keyId: keyRing.activeKeyId,
    ref,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };

  return { envelope, content: JSON.stringify(envelope) };
}

/**
 * Best-effort removal of a file; failures are ignored.
 */
async function unlinkBestEffort(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore; temp files are harmless if they remain.
  }
}

/**
 * Remove stale temporary files (*.tmp) left by an interrupted run.
 * Never trusts a temp file as a valid migrated secret.
 */
async function cleanupStaleTemps(directory: string): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name.endsWith(TEMP_FILE_SUFFIX)) {
      await unlinkBestEffort(path.join(directory, name));
    }
  }
}

/**
 * Set restrictive file permissions where supported.
 * On Windows POSIX mode bits are not enforced by the ACL model; the
 * attempt is made for portability but never fails startup on Windows.
 */
async function setRestrictivePermissions(filePath: string): Promise<void> {
  try {
    await fs.chmod(filePath, 0o600);
  } catch (err) {
    if (process.platform !== "win32") {
      throw new SecretStoreError(
        `Unable to set file permissions on ${filePath}: ${sanitizeError(err)}`
      );
    }
    // Windows does not enforce POSIX mode bits; secure via ACLs separately.
  }
}

/**
 * Replace the original file with a verified temp file using a backup-first
 * strategy that is crash-safe on all platforms, including Windows.
 *
 * The backup is created with an exclusive filesystem primitive
 * (fs.open with the 'wx' flag) that atomically fails if the destination
 * already exists. This eliminates the TOCTOU race of stat-then-rename,
 * where rename would silently overwrite an existing backup on POSIX.
 *
 * The original file is preserved until the backup copy is safely created,
 * written, and verified. Only then does replacement proceed.
 *
 *   1. Verify original identity and content (stat + mtime/size + SHA-256 hash).
 *   2. Create backup exclusively with fs.open(backup, 'wx'); fails if exists.
 *   3. Write original content to backup, sync, and verify backup hash.
 *   4. Rename verified temporary file to the original path.
 *      On Windows, rename-over-existing is not supported, so the original
 *      is unlinked first (safe because a verified backup already exists).
 *   5. Read back and validate the replacement (structural + hash check).
 *   6. Delete the backup only after successful validation.
 *
 * If any step fails before replacement, the original file is left intact.
 * If replacement fails after the original has been replaced, the backup
 * holds the pre-rotation secret and is used for recovery.
 *
 * This is recoverable but is NOT a single atomic operation on Windows.
 *
 * Directory-entry durability is NOT guaranteed by this implementation.
 * fsync() on the file data (via backupFd.sync()) does not guarantee that
 * directory entry changes created by rename() are persisted to disk. After
 * a sudden power loss or crash, renamed files may not appear in the
 * directory, or previously renamed files may reappear, depending on the
 * filesystem and operating system. To achieve full crash durability, the
 * directory file descriptor would need to be fsync()d after each rename
 * operation; this is not currently implemented.
 */
async function atomicReplaceWithBackup(
  file: string,
  originalStat: Stats,
  originalHash: string,
  temp: string
): Promise<void> {
  // Phase 1: Re-verify original identity and content before replacing.
  let current: Stats;
  try {
    current = await fs.stat(file);
  } catch {
    throw new SecretStoreError("Original file disappeared before replacement");
  }

  if (
    current.mtimeMs !== originalStat.mtimeMs ||
    current.size !== originalStat.size
  ) {
    throw new SecretStoreError(
      "File changed concurrently; not overwriting"
    );
  }

  // Content hash check: detects same-size, same-mtime modifications.
  let currentRaw: Buffer;
  try {
    currentRaw = await fs.readFile(file);
  } catch {
    throw new SecretStoreError("Unable to re-read original before replacement");
  }
  const currentHash = createHash("sha256").update(currentRaw).digest("hex");
  if (currentHash !== originalHash) {
    throw new SecretStoreError(
      "File content changed concurrently; not overwriting"
    );
  }

  // Phase 2: Backup-first replacement with exclusive backup creation.
  // fs.open(path, "wx", mode) atomically creates the file only if it does not
  // already exist, failing with EEXIST otherwise. This guarantees that we
  // never overwrite an existing backup, even under concurrent processes.
  // The 0o600 mode restricts access to the owner only where POSIX mode bits
  // are supported. On Windows, POSIX mode bits are not enforced by the ACL
  // model; 0o600 does not provide equivalent protection there. The operator
  // must secure backup files through Windows ACLs separately.
  const randomHex = randomBytes(BACKUP_RANDOM_BYTES).toString("hex");
  const backup = `${file}.${randomHex}${BACKUP_FILE_SUFFIX}`;

  let backupFd: fs.FileHandle | null = null;
  try {
    backupFd = await fs.open(backup, "wx", 0o600);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") {
      throw new SecretStoreError(
        "Backup file already exists; refusing to overwrite recovery copy"
      );
    }
    throw new SecretStoreError(
      `Unable to create backup file: ${sanitizeError(err)}`
    );
  }

  // Enforce restrictive permissions on the opened descriptor before writing
  // sensitive content. On POSIX this ensures the file is owner-only (0o600)
  // even if the process umask would otherwise grant broader access. On
  // Windows the chmod call is a no-op for ACL purposes; do not treat it as
  // equivalent protection.
  try {
    await backupFd.chmod(0o600);
  } catch (err) {
    const isWindows = process.platform === "win32";
    if (!isWindows) {
      // On POSIX, failure to enforce restrictive permissions means we cannot
      // safely write secret material. Fail closed.
      try {
        await backupFd.close();
      } catch {
        // Ignore close errors.
      }
      try {
        await fs.unlink(backup).catch(() => undefined);
      } catch {
        // Ignore unlink errors.
      }
      throw new SecretStoreError(
        `Unable to enforce restrictive permissions on backup file: ${sanitizeError(err)}`
      );
    }
    // Windows: log nothing, continue but do not claim ACL protection.
  }

  try {
    // Write the original content to the exclusively-created backup file.
    await backupFd.write(currentRaw);
    await backupFd.sync(); // Ensure data is on disk before proceeding.

    // Verify the backup content matches the original hash by reading it back.
    const backupVerifyRaw = await fs.readFile(backup);
    if (
      createHash("sha256").update(backupVerifyRaw).digest("hex") !== currentHash
    ) {
      throw new SecretStoreError("Backup file content verification failed");
    }
  } finally {
    if (backupFd) {
      try {
        await backupFd.close();
      } catch {
        // Ignore close errors; the backup content has already been synced.
      }
    }
  }

  try {
    // Phase 3: Replace the original with the verified temporary file.
    // On POSIX, rename-over-existing is atomic. On Windows it is not
    // supported, so we unlink the original first (safe because a verified
    // backup already exists) and then rename the temp file.
    try {
      await fs.rename(temp, file);
    } catch (err) {
      const errno = (err as NodeJS.ErrnoException).code;
      if (process.platform === "win32" && (errno === "EEXIST" || errno === "EPERM")) {
        // Windows: rename cannot replace an existing file. Remove the
        // original first (backup already preserves it), then rename temp.
        try {
          await fs.unlink(file);
          await fs.rename(temp, file);
        } catch {
          // Original path is now empty; backup preserves the pre-rotation
          // secret. Require operator intervention.
          throw new SecretStoreError(
            `Unable to replace secret file on Windows. Backup at ${backup} preserves the original secret.`
          );
        }
      } else {
        throw new SecretStoreError(
          `Unable to replace secret file: ${sanitizeError(err)}`
        );
      }
    }

    // Phase 4: Read back and validate the replacement file.
    let verifiedRaw: Buffer;
    try {
      verifiedRaw = await fs.readFile(file);
    } catch {
      // New file unreadable: restore backup to original path.
      try {
        await fs.rename(backup, file);
      } catch {
        // Preserve backup, require operator intervention.
      }
      throw new SecretStoreError(
        "Replacement file unreadable; restored from backup"
      );
    }

    const replacementHash = createHash("sha256").update(verifiedRaw).digest("hex");
    if (replacementHash === originalHash) {
      // Replacement is byte-identical to original: something went wrong.
      try {
        await fs.rename(backup, file);
      } catch {
        // Preserve backup, require operator intervention.
      }
      throw new SecretStoreError(
        "Replacement file matches original; restored from backup"
      );
    }

    // Phase 5: Delete backup only after successful validation.
    try {
      await fs.unlink(backup);
    } catch {
      // Backup deletion failed, but the replacement is valid and verified.
      // The backup is harmless extra file; require operator cleanup.
    }
  } catch (err) {
    // Best-effort cleanup of temp file on any failure path.
    try {
      await fs.unlink(temp);
    } catch {
      // Ignore.
    }
    throw err;
  }
}

/**
 * Process a single secret file through validate -> decrypt -> encrypt ->
 * verify -> replace. Returns an outcome without mutating on failure.
 */
async function processFile(
  file: string,
  relative: string,
  keyRing: KeyRingLike,
  dryRun: boolean
): Promise<FileOutcome> {
  const fail = (status: string, version: number | null, keyId: string | null, error: string): FileOutcome => ({
    file,
    relative,
    status: status as FileOutcome["status"],
    version,
    keyId,
    error,
  });

  let originalStat: Stats;
  let raw: string;
  let originalHash: string;
  try {
    const rawBuffer = await fs.readFile(file);
    originalStat = await fs.stat(file);
    raw = rawBuffer.toString("utf8");
    originalHash = createHash("sha256").update(rawBuffer).digest("hex");
  } catch (err) {
    return fail("failed", null, null, `Unable to read file: ${sanitizeError(err)}`);
  }

  let envelope: ParsedEnvelope;
  try {
    envelope = parseAndValidate(raw, file);
  } catch (err) {
    return fail("failed", null, null, `Malformed envelope: ${sanitizeError(err)}`);
  }

  let plaintext: string;
  try {
    plaintext = await decryptEnvelope(envelope, keyRing);
  } catch (err) {
    return fail(
      "failed",
      envelope.version,
      envelope.keyId,
      `Unable to decrypt: ${sanitizeError(err)}`
    );
  }

  // Already encrypted with the active key: nothing to do.
  if (
    envelope.version === ENVELOPE_VERSION_V2 &&
    envelope.keyId === keyRing.activeKeyId
  ) {
    return { file, relative, status: "unchanged", version: envelope.version, keyId: envelope.keyId, error: null };
  }

  const activeKey = keyRing.entries.get(keyRing.activeKeyId);
  if (!activeKey) {
    return fail("failed", envelope.version, envelope.keyId, `Active key ${keyRing.activeKeyId} is not available`);
  }

  const { content } = encryptValue(plaintext, envelope.ref, keyRing);

  if (dryRun) {
    return {
      file,
      relative,
      status: "migrated",
      version: ENVELOPE_VERSION_V2,
      keyId: keyRing.activeKeyId,
      error: null,
    };
  }

  const temp = `${file}.${randomBytes(TEMP_RANDOM_BYTES).toString("hex")}${TEMP_FILE_SUFFIX}`;

  try {
    // Write the candidate envelope to a temp file in the same directory.
    await fs.writeFile(temp, content, { mode: 0o600 });
    await setRestrictivePermissions(temp);

    // Read back and decrypt the temp file; verify value and reference match.
    const backRaw = await fs.readFile(temp, "utf8");
    let back: ParsedEnvelope;
    try {
      back = parseAndValidate(backRaw, temp, envelope.ref);
    } catch (err) {
      throw new SecretStoreError(`Verification failed: ${sanitizeError(err)}`);
    }
    const backPlaintext = await decryptEnvelope(back, keyRing);
    if (backPlaintext !== plaintext) {
      throw new SecretStoreError("Verification failed: decrypted value mismatch");
    }
    if (back.ref !== envelope.ref) {
      throw new SecretStoreError("Verification failed: secret reference mismatch");
    }

    // Atomically replace the original with backup-first crash safety,
    // refusing if content changed concurrently.
    await atomicReplaceWithBackup(file, originalStat, originalHash, temp);
  } catch (err) {
    // Clean up the temp file on every failure path. Never replace before
    // verification succeeds; the original is preserved.
    await unlinkBestEffort(temp);
    return fail(
      "failed",
      envelope.version,
      envelope.keyId,
      `Migration failed: ${sanitizeError(err)}`
    );
  }

  return {
    file,
    relative,
    status: "migrated",
    version: ENVELOPE_VERSION_V2,
    keyId: keyRing.activeKeyId,
    error: null,
  };
}

/**
 * Recover from leftover backup files created by an interrupted crash-safe
 * replacement. Assumes the rotation lock is held by the caller.
 *
 * Backup files use the naming pattern: <originalPath>.<12-hex>.bak
 *
 * Two states are possible for a backup file:
 *   1. Backup exists, original <originalPath>.secret is missing:
 *      The original was renamed to backup but the temp was not renamed to
 *      original. Restore the backup to the original path (after validation).
 *   2. Both backup and original exist:
 *      The temp was renamed to original but the backup was not deleted.
 *      If the original is a valid envelope, delete the backup. If the
 *      original is invalid or unreadable, restore the backup (after
 *      validation) to the original path.
 *
 * If multiple backup candidates exist for the same original, or if a
 * backup cannot be validated as a structurally valid envelope, the backup
 * is preserved and the operator must intervene. Backups are never treated
 * as secret envelopes during normal scanning (they end in .bak, not
 * .secret).
 *
 * @param directory - Secret directory to scan for backups.
 * @param keyRing - Optional key ring for decrypt-authenticating backups.
 */
async function recoverStartBackups(
  directory: string,
  keyRing?: KeyRingLike
): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch {
    return;
  }

  // Collect all backup files and group them by their derived original path.
  const backupsByOriginal: Map<string, string[]> = new Map();

  for (const name of entries) {
    const match = name.match(BACKUP_NAME_PATTERN);
    if (!match) {
      // Not a backup file we created (e.g. old deterministic .bak). Ignore.
      continue;
    }

    const originalPath = path.join(directory, match[1]);
    const backupPath = path.join(directory, name);

    const existing = backupsByOriginal.get(originalPath);
    if (existing) {
      existing.push(backupPath);
    } else {
      backupsByOriginal.set(originalPath, [backupPath]);
    }
  }

  for (const [originalPath, backupPaths] of backupsByOriginal) {
    // Multiple candidates for the same original: ambiguous, do not touch any.
    if (backupPaths.length > 1) {
      continue;
    }

    const backupPath = backupPaths[0]!;

    // Validate the backup content before considering restoration.
    let backupValid = false;
    let backupEnvelope: ParsedEnvelope | null = null;
    try {
      const backupRaw = await fs.readFile(backupPath, "utf8");
      backupEnvelope = validateEnvelopeContent(backupRaw);
      backupValid = true;

      // If a key ring is provided, authenticate-decrypt the backup.
      if (keyRing && backupEnvelope) {
        await decryptBackupEnvelope(backupEnvelope, keyRing);
      }
    } catch {
      // Backup is invalid or undecryptable: preserve it, require operator.
      backupValid = false;
    }

    let originalExists: boolean;
    try {
      await fs.stat(originalPath);
      originalExists = true;
    } catch {
      originalExists = false;
    }

    if (!originalExists) {
      // State 1: backup exists, original missing.
      // Restore backup only if it validates successfully.
      if (backupValid && backupEnvelope) {
        try {
          await fs.rename(backupPath, originalPath);
        } catch {
          // Restoration failed: preserve backup, require operator.
        }
      }
      // If backup invalid, leave both missing; operator must intervene.
    } else {
      // State 2: both backup and original exist.
      let originalValid = false;
      let originalAuthenticated = false;
      try {
        const raw = await fs.readFile(originalPath, "utf8");
        validateEnvelopeContent(raw);
        originalValid = true;

        // Structural validation is NOT cryptographic authentication.
        // If a key ring is available, authenticate-decrypt the original
        // before treating the backup as redundant. Without a key ring,
        // we cannot confirm the original is decryptable, so preserve the
        // backup as a safety net.
        if (keyRing) {
          try {
            const originalEnvelope = validateEnvelopeContent(raw);
            await decryptBackupEnvelope(originalEnvelope, keyRing);
            originalAuthenticated = true;
          } catch {
            // Original is structurally valid but not decryptable with the
            // configured key ring. Preserve the backup as a recovery copy.
            originalAuthenticated = false;
          }
        } else {
          // No key ring available: cannot authenticate. Preserve backup.
          originalAuthenticated = false;
        }
      } catch {
        originalValid = false;
      }

      if (originalValid && originalAuthenticated) {
        // Original is valid and decryptable; backup is redundant. Delete it.
        try {
          await fs.unlink(backupPath);
        } catch {
          // Backup deletion failed; replacement is valid, backup is harmless.
        }
      } else if (backupValid && backupEnvelope) {
        // Original invalid or not decryptable, backup valid: restore backup.
        try {
          await fs.rename(backupPath, originalPath);
        } catch {
          // Restoration failed: preserve both, require operator.
        }
      }
      // If both invalid or undecryptable, preserve both; operator must intervene.
    }
  }
}

/**
 * Run a restartable bulk rotation over the configured tenant secret directory.
 */
export async function rotateSecrets(
  options: RotationOptions
): Promise<RotationResult> {
  const directory = path.resolve(options.directory);
  const keyRing = options.keyRing;
  const dryRun = options.dryRun ?? true;

  if (!keyRing.activeKeyId || !keyRing.entries.has(keyRing.activeKeyId)) {
    throw new SecretStoreError("Active key is not configured in the key ring");
  }

  const rotationLockFile = options.lockFile ?? path.join(directory, DEFAULT_LOCK_FILE_NAME);
  const maintenanceLockFile = path.join(directory, ".tenant-secret-maintenance.lock");

  // Step 1: Acquire RotationLock first (rotation-vs-rotation exclusion).
  const rotationLock = new RotationLock(rotationLockFile);
  const rotationAcquired = await rotationLock.acquire();
  if (!rotationAcquired) {
    throw new SecretStoreError(
      "Rotation lock is held by another process; cannot proceed."
    );
  }

  // Step 2: Acquire MaintenanceLock (rotation-vs-writer exclusion).
  // If MaintenanceLock fails, release RotationLock first.
  const maintenanceLock = new MaintenanceLock(maintenanceLockFile);
  let maintenanceAcquired = false;
  try {
    maintenanceAcquired = await maintenanceLock.acquireExclusive();
  } catch {
    await rotationLock.release();
    throw new SecretStoreError(
      "Unable to acquire maintenance lock; cannot proceed."
    );
  }
  if (!maintenanceAcquired) {
    await rotationLock.release();
    throw new SecretStoreError(
      "Maintenance lock is held by another process; cannot proceed."
    );
  }

  // Both locks held. Use nested try/finally so both locks remain held
  // throughout the entire execute-mode rotation and verification, and are
  // released in reverse order (maintenance first, then rotation) on every
  // failure path.
  let drainError: Error | null = null;
  let rotationResult: RotationResult | null = null;
  let rotationError: Error | null = null;

  try {
    // Drain existing writer leases before rotating.
    // If drain fails (live writers remain or ambiguous leases), do not
    // proceed with rotation.
    try {
      await drainWriterLeases({ directory });
    } catch (err) {
      drainError = err instanceof Error ? err : new Error(String(err));
    }

    if (drainError) {
      throw drainError;
    }

    // Recover from any interrupted backup operations before scanning.
    // Both locks are held, so no writer can interfere.
    if (!dryRun) {
      await recoverStartBackups(directory, keyRing);
    }

    const { files, skippedHardLinks } = await walkSecretFiles(directory);

    // Handle stale temporary files from any previous interrupted run.
    // Both locks are held, so no writer can interfere.
    if (!dryRun) {
      await cleanupStaleTemps(directory);
    }

    const outcomes: FileOutcome[] = [];
    for (const file of files) {
      const relative = path.relative(directory, file);
      const outcome = await processFile(file, relative, keyRing, dryRun);
      outcomes.push(outcome);
    }

    // Whole-directory verification while both locks are held.
    // Read-only; never throws on malformed/incomplete files.
    let verifyComplete = true;
    if (!dryRun) {
      const verifyResult = await verifySecrets(directory, keyRing);
      verifyComplete = verifyResult.complete;
    }

    const migrated = outcomes.filter((o) => o.status === "migrated").length;
    const unchanged = outcomes.filter((o) => o.status === "unchanged").length;
    const failed = outcomes.filter((o) => o.status === "failed").length;

    rotationResult = {
      directory,
      dryRun,
      scanned: files.length,
      migrated,
      unchanged,
      failed,
      complete: failed === 0 && skippedHardLinks === 0 && verifyComplete,
      skippedHardLinks,
      outcomes,
    };
  } catch (err) {
    rotationError = err instanceof Error ? err : new Error(String(err));
  } finally {
    // Release MaintenanceLock first, then RotationLock second.
    // Ownership is verified by each lock's release() before unlinking.
    let maintenanceReleaseError: Error | null = null;
    let rotationReleaseError: Error | null = null;

    try {
      await maintenanceLock.release();
    } catch (err) {
      maintenanceReleaseError = err instanceof Error ? err : new Error(String(err));
    }

    try {
      await rotationLock.release();
    } catch (err) {
      rotationReleaseError = err instanceof Error ? err : new Error(String(err));
    }

    // Collect all errors from lock cleanup, rotation, and drain.
    // drainError is subsumed by rotationError when it causes the throw,
    // so only push rotationError (which already references drainError).
    const allErrors: Error[] = [];
    if (maintenanceReleaseError) allErrors.push(maintenanceReleaseError);
    if (rotationReleaseError) allErrors.push(rotationReleaseError);
    if (rotationError) allErrors.push(rotationError);

    if (allErrors.length > 1) {
      throw new AggregateError(allErrors, "Rotation and lock cleanup errors");
    }
    if (allErrors.length === 1) {
      throw allErrors[0];
    }
  }

  return rotationResult!;
}

// ---------------------------------------------------------------------------
// Read-only verification
// ---------------------------------------------------------------------------

/**
 * Status of a single inspected file during verification.
 */
export type VerifyFileStatus =
  | "ok"
  | "v1"
  | "unknown-key"
  | "malformed"
  | "unreadable";

/**
 * Per-file verification record.
 */
export interface VerifiedFile {
  file: string;
  relative: string;
  status: VerifyFileStatus;
  version: number | null;
  keyId: string | null;
  error: string | null;
}

/**
 * Result of a read-only verification scan.
 */
export interface VerificationResult {
  directory: string;
  scanned: number;
  complete: boolean;
  skippedHardLinks: number;
  byVersionAndKey: Record<string, Record<string, number>>;
  v1Files: number;
  unknownKeyFiles: number;
  malformedOrUnreadableFiles: number;
  keyReferenceCounts: Record<string, number>;
  files: VerifiedFile[];
}

/**
 * Classify a single file without decrypting it. Read-only.
 */
async function verifyFile(
  file: string,
  relative: string,
  knownKeyIds: Set<string>
): Promise<VerifiedFile> {
  const fail = (
    status: VerifyFileStatus,
    version: number | null,
    keyId: string | null,
    error: string
  ): VerifiedFile => ({ file, relative, status, version, keyId, error });

  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (err) {
    return fail("unreadable", null, null, `Unable to read file: ${sanitizeError(err)}`);
  }

  let envelope: ParsedEnvelope;
  try {
    envelope = parseAndValidate(raw, file);
  } catch (err) {
    return fail("malformed", null, null, `Malformed envelope: ${sanitizeError(err)}`);
  }

  if (envelope.version === ENVELOPE_VERSION_V1) {
    return {
      file,
      relative,
      status: "v1",
      version: 1,
      keyId: null,
      error: null,
    };
  }

  // v2
  const keyId = envelope.keyId!;
  if (!knownKeyIds.has(keyId)) {
    return {
      file,
      relative,
      status: "unknown-key",
      version: 2,
      keyId,
      error: `Key ${keyId} is not available in the key ring`,
    };
  }

  return {
    file,
    relative,
    status: "ok",
    version: 2,
    keyId,
    error: null,
  };
}

/**
 * Run a read-only verification scan over all recognized secret files.
 * Does not decrypt, print key material, or print plaintext.
 */
export async function verifySecrets(
  directory: string,
  keyRing: KeyRingLike
): Promise<VerificationResult> {
  const root = path.resolve(directory);
  const { files, skippedHardLinks } = await walkSecretFiles(root);
  const knownKeyIds = new Set(keyRing.entries.keys());

  const verified: VerifiedFile[] = [];
  const byVersionAndKey: Record<string, Record<string, number>> = {};
  let v1Files = 0;
  let unknownKeyFiles = 0;
  let malformedOrUnreadable = 0;
  const keyReferenceCounts: Record<string, number> = {};

  for (const file of files) {
    const relative = path.relative(root, file);
    const record = await verifyFile(file, relative, knownKeyIds);
    verified.push(record);

    const versionKey = record.version === null ? "unknown" : String(record.version);
    const keyLabel = record.keyId === null ? (record.version === ENVELOPE_VERSION_V1 ? "(v1-legacy)" : "(none)") : record.keyId;
    if (!byVersionAndKey[versionKey]) {
      byVersionAndKey[versionKey] = {};
    }
    byVersionAndKey[versionKey][keyLabel] = (byVersionAndKey[versionKey][keyLabel] ?? 0) + 1;

    if (record.status === "v1") {
      v1Files += 1;
    } else if (record.status === "unknown-key") {
      unknownKeyFiles += 1;
    } else if (record.status === "malformed" || record.status === "unreadable") {
      malformedOrUnreadable += 1;
    }

    if (record.status === "ok" || record.status === "unknown-key") {
      if (record.keyId) {
        keyReferenceCounts[record.keyId] = (keyReferenceCounts[record.keyId] ?? 0) + 1;
      }
    }
    // v1 files do not carry a keyId; they are counted separately via v1Files.
  }

  const complete = malformedOrUnreadable === 0 && skippedHardLinks === 0;

  return {
    directory: root,
    scanned: files.length,
    complete,
    skippedHardLinks,
    byVersionAndKey,
    v1Files,
    unknownKeyFiles,
    malformedOrUnreadableFiles: malformedOrUnreadable,
    keyReferenceCounts,
    files: verified,
  };
}

/**
 * Reports whether a specified key ID is still referenced by any file.
 */
export function isKeyReferenced(result: VerificationResult, keyId: string): boolean {
  return (result.keyReferenceCounts[keyId] ?? 0) > 0;
}

/**
 * Reports whether a key is eligible for retirement.
 *
 * A key is only eligible when:
 *   * the full scan completed (no unreadable/malformed files),
 *   * there are zero v1 files,
 *   * zero files reference that key,
 *   * zero malformed or unreadable files,
 * and the operator confirms retirement outside this utility.
 *
 * This function never performs deletion.
 */
export function isRetirementEligible(result: VerificationResult, keyId: string): boolean {
  return (
    result.complete &&
    result.skippedHardLinks === 0 &&
    result.v1Files === 0 &&
    result.malformedOrUnreadableFiles === 0 &&
    (result.keyReferenceCounts[keyId] ?? 0) === 0
  );
}

// ---------------------------------------------------------------------------
// Locking
// ---------------------------------------------------------------------------

/**
 * Status of a process according to process.kill(pid, 0).
 */
type ProcessStatus = "alive" | "dead" | "unknown";

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

/**
 * Advisory lock preventing two rotation processes from operating on the same
 * secret directory simultaneously.
 *
 * Each lock instance carries a unique owner token in addition to the PID.
 * Stale locks are handled conservatively: a lock is removed only when the
 * owning process can be positively established as dead. Ownership that
 * cannot be established is never automatically removed.
 *
 * release() verifies that the lock file still belongs to this instance
 * (PID + owner token) before unlinking, preventing a stale/resumed process
 * from deleting another process's active lock after PID reuse.
 */
export class RotationLock {
  private readonly lockFile: string;
  private readonly pid: number;
  private readonly ownerToken: string;
  private held = false;

  constructor(lockFile: string, pid = process.pid) {
    this.lockFile = lockFile;
    this.pid = pid;
    this.ownerToken = generateOwnerToken();
  }

  async acquire(): Promise<boolean> {
    let retries = 0;

    while (retries < MAX_STALE_LOCK_RETRIES) {
      try {
        const fd = await fs.open(this.lockFile, "wx");
        try {
          await fd.write(
            JSON.stringify({
              pid: this.pid,
              token: this.ownerToken,
              startedAt: Date.now(),
            }) + "\n"
          );
        } finally {
          await fd.close();
        }
        this.held = true;
        return true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
          throw err;
        }
      }

      // A lock file already exists. Evaluate whether its owner is still active.
      let ownerPid: number | null = null;
      let ownerToken: string | null = null;
      try {
        const content = await fs.readFile(this.lockFile, "utf8");
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed.pid === "number") {
          ownerPid = parsed.pid;
        }
        if (typeof parsed.token === "string") {
          ownerToken = parsed.token;
        }
      } catch {
        // Cannot read or parse the lock: ownership cannot be established.
        // Retry conservatively instead of removing.
        retries += 1;
        await sleep(STALE_LOCK_RETRY_DELAY_MS);
        continue;
      }

      if (ownerPid === null) {
        retries += 1;
        await sleep(STALE_LOCK_RETRY_DELAY_MS);
        continue;
      }

      const status = processStatus(ownerPid);
      if (status === "alive") {
        return false; // active owner: do not remove, do not proceed
      }
      if (status === "unknown") {
        // Cannot establish ownership: conservative, do not remove.
        retries += 1;
        await sleep(STALE_LOCK_RETRY_DELAY_MS);
        continue;
      }

      // status === "dead": ownership established as gone. The PID no longer
      // exists, so the lock is stale regardless of token. Remove it and
      // retry acquisition. (The token check in release() protects against
      // a resumed/stared process deleting another process's active lock.)
      // Remove the stale lock and retry acquisition in the next loop iteration.
      try {
        await fs.unlink(this.lockFile);
      } catch {
        retries += 1;
        await sleep(STALE_LOCK_RETRY_DELAY_MS);
        continue;
      }

      retries += 1;
      // Loop retries acquisition.
    }

    return false;
  }

  async release(): Promise<void> {
    if (!this.held) {
      return;
    }

    // Verify ownership before unlinking: only remove the lock if it still
    // belongs to this instance (PID + owner token match). This prevents a
    // stale or resumed process from deleting another process's active lock
    // after PID reuse.
    let stillOwner = false;
    try {
      const content = await fs.readFile(this.lockFile, "utf8");
      const parsed = JSON.parse(content);
      if (
        parsed &&
        typeof parsed.pid === "number" &&
        parsed.pid === this.pid &&
        typeof parsed.token === "string" &&
        parsed.token === this.ownerToken
      ) {
        stillOwner = true;
      }
    } catch {
      // Cannot read or parse the lock: do not unlink.
    }

    if (stillOwner) {
      try {
        await fs.unlink(this.lockFile);
        this.held = false; // only mark released after successful unlink
      } catch {
        // Unlink failed; lock may still exist. Keep held = true.
      }
    } else {
      // Ownership does not match; do not unlink. Keep held as-is.
    }
  }

  isHeld(): boolean {
    return this.held;
  }
}
