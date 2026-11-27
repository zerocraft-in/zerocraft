/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Secret-store abstraction.
 *
 * Tenant database passwords and other secret values must never be written to
 * platform tables. Only an opaque reference is persisted in
 * tenant_databases.database_password_secret_ref.
 *
 * Phase 1: versioned encryption envelopes and multi-key support.
 *
 * Envelope format (v2):
 *   {
 *     version: 2,
 *     keyId: "<key identifier>",
 *     ref: "<secret reference>",
 *     iv: "<base64 12-byte nonce>",
 *     tag: "<base64 16-byte GCM authentication tag>",
 *     ciphertext: "<base64 ciphertext>"
 *   }
 *
 * Legacy v1 format (no keyId, version 1) remains readable via the configured
 * legacy key. New writes always use the active key and emit v2 envelopes.
 *
 * AAD (Additional Authenticated Data) binds the envelope version, keyId, and
 * ref to the ciphertext so that an attacker cannot transplant a valid
 * ciphertext block between different keys, references, or envelope versions.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
} from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import { SecretStoreError } from "./errors";
import {
  acquireWriterLease,
  MaintenanceActiveError,
  WriterDrainTimeoutError,
} from "./maintenance-lock";

export interface TenantSecretStore {
  put(ref: string, value: string): Promise<void>;
  get(ref: string): Promise<string | null>;
  delete(ref: string): Promise<void>;
}

/**
 * Test-only in-memory store. Values live only for the lifetime of the object.
 */
export class InMemoryTenantSecretStore implements TenantSecretStore {
  private readonly values = new Map<string, string>();

  async put(ref: string, value: string): Promise<void> {
    this.values.set(ref, value);
  }

  async get(ref: string): Promise<string | null> {
    return this.values.get(ref) ?? null;
  }

  async delete(ref: string): Promise<void> {
    this.values.delete(ref);
  }
}

/**
 * Fail-closed store used when managed mode is selected without a real secret
 * backend. Any attempt to write a secret throws before an API call is made.
 */
export class NullTenantSecretStore implements TenantSecretStore {
  async put(): Promise<void> {
    throw new SecretStoreError("Tenant secret store is not configured");
  }

  async get(): Promise<string | null> {
    throw new SecretStoreError("Tenant secret store is not configured");
  }

  async delete(): Promise<void> {
    throw new SecretStoreError("Tenant secret store is not configured");
  }
}

/**
 * Key ring entry: a unique key identifier paired with a 32-byte AES-256 key.
 */
export interface KeyRingEntry {
  keyId: string;
  key: Buffer;
}

/**
 * Validation result for a key ring.
 */
interface ValidatedKeyRing {
  entries: Map<string, Buffer>;
  activeKeyId: string;
  legacyKeyId: string | null;
  keyCount: number;
}

/**
 * Valid key ID pattern: alphanumeric, dashes, and underscores only.
 * Prevents environment-variable injection and path traversal through key IDs.
 */
const KEY_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Strict Base64 alphabet: A-Z, a-z, 0-9, +, /, and padding =.
 * Rejects invalid characters, invalid padding, and non-canonical encodings.
 */
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Validate a single key ID.
 */
function validateKeyId(keyId: string): void {
  if (!KEY_ID_PATTERN.test(keyId)) {
    throw new SecretStoreError(
      `Invalid key ID "${keyId}": key IDs must match ^[a-zA-Z0-9_-]+$`
    );
  }
}

/**
 * Decode a strict Base64-encoded string.
 *
 * Rejects:
 *   * Characters outside the Base64 alphabet
 *   * Incorrect padding (wrong number of '=' characters)
 *   * Non-canonical encodings (e.g., padding in the middle)
 *   * Decoded lengths that do not match the expected byte count
 *
 * Never logs the input or decoded value.
 *
 * Exported for reuse by the Phase 2 rotation utility.
 */
export function parseStrictBase64(value: string, expectedBytes: number): Buffer {
  if (!BASE64_PATTERN.test(value)) {
    throw new SecretStoreError(
      "Invalid base64 encoding: contains characters outside the Base64 alphabet"
    );
  }

  // Calculate expected decoded length and validate padding position.
  const padding = (value.match(/=*$/) ?? [""])[0].length;
  const expectedLength = Math.floor((value.length * 3) / 4) - padding;

  if (padding > 2) {
    throw new SecretStoreError(
      "Invalid base64 encoding: too many padding characters"
    );
  }

  const decoded = Buffer.from(value, "base64");

  // Re-encode and compare to ensure canonical Base64 encoding.
  // Buffer.from(str, "base64") is lenient and accepts non-canonical forms
  // (e.g., missing padding, padding in the middle). Re-encoding and comparing
  // catches any deviation from canonical form before the length check.
  const reEncoded = decoded.toString("base64");
  if (reEncoded !== value) {
    throw new SecretStoreError(
      "Invalid base64 encoding: non-canonical encoding detected"
    );
  }

  if (decoded.length !== expectedBytes) {
    throw new SecretStoreError(
      `Decoded key length ${decoded.length} does not match expected ${expectedBytes} bytes`
    );
  }

  return decoded;
}

/**
 * Parse and validate a single key/value pair for the key ring.
 *
 * Rejects invalid key IDs and non-canonical Base64-encoded key material.
 * Decoded key material must be exactly 32 bytes.
 */
export function parseKeyEntry(
  keyId: string,
  keyBase64: string
): { keyId: string; key: Buffer } {
  const trimmedKeyId = keyId.trim();
  validateKeyId(trimmedKeyId);

  const key = parseStrictBase64(keyBase64, 32);

  return { keyId: trimmedKeyId, key };
}

/**
 * Parse and validate an iterable list of key/value pairs into a key ring map.
 *
 * Rejects duplicate key IDs and invalid Base64-encoded key material.
 * Decoded key material must be exactly 32 bytes.
 *
 * This function is used by parseKeyRingFromEnv to process environment
 * variables, but it can also be called directly with an iterable list of
 * entries for testing duplicate key ID detection.
 *
 * @param entries - Iterable of [keyId, keyBase64] pairs
 * @returns Map of validated key IDs to decoded 32-byte keys
 */
export function parseKeyEntries(
  entries: Iterable<[string, string]>
): Map<string, Buffer> {
  const result = new Map<string, Buffer>();
  const seenKeyIds = new Set<string>();

  for (const [keyId, keyBase64] of entries) {
    const entry = parseKeyEntry(keyId, keyBase64);

    // Reject duplicate key IDs across entries.
    if (seenKeyIds.has(entry.keyId)) {
      throw new SecretStoreError(
        `Duplicate key ID "${entry.keyId}" in key entries`
      );
    }
    seenKeyIds.add(entry.keyId);

    result.set(entry.keyId, entry.key);
  }

  return result;
}

/**
 * Parse and validate a key ring from individual environment variables.
 *
 * Reads:
 *   TENANT_SECRETS_ACTIVE_KEY_ID   — required, identifies the active write key
 *   TENANT_SECRETS_LEGACY_KEY_ID   — optional, identifies the v1 legacy key
 *   TENANT_SECRETS_KEY_<keyId>     — base64-encoded 32-byte key material
 *
 * Returns a validated key ring. Fails closed on any validation error.
 */
export function parseKeyRingFromEnv(): ValidatedKeyRing {
  const activeKeyId = process.env.TENANT_SECRETS_ACTIVE_KEY_ID;
  const legacyKeyId = process.env.TENANT_SECRETS_LEGACY_KEY_ID;

  if (!activeKeyId || !activeKeyId.trim()) {
    throw new SecretStoreError(
      "TENANT_SECRETS_ACTIVE_KEY_ID is required for managed mode"
    );
  }
  validateKeyId(activeKeyId.trim());

  if (legacyKeyId && !legacyKeyId.trim()) {
    throw new SecretStoreError(
      "TENANT_SECRETS_LEGACY_KEY_ID must be non-empty if set"
    );
  }
  if (legacyKeyId) {
    validateKeyId(legacyKeyId.trim());
  }

  // Collect all TENANT_SECRETS_KEY_<keyId> environment variables.
  const keyPrefix = "TENANT_SECRETS_KEY_";
  const envEntries: [string, string][] = [];
  for (const [envKey, envValue] of Object.entries(process.env)) {
    if (!envKey.startsWith(keyPrefix)) continue;
    const derivedKeyId = envKey.slice(keyPrefix.length);
    if (!derivedKeyId || !derivedKeyId.trim()) {
      throw new SecretStoreError(
        `Invalid key environment variable ${envKey}: key ID is empty`
      );
    }
    envEntries.push([derivedKeyId.trim(), envValue ?? ""]);
  }

  const entries = parseKeyEntries(envEntries);

  // The active key must be present in the ring.
  if (!entries.has(activeKeyId.trim())) {
    throw new SecretStoreError(
      `Active key ${activeKeyId.trim()} is not present in the key ring`
    );
  }

  // The legacy key, if configured, must be present in the ring.
  if (legacyKeyId && !entries.has(legacyKeyId.trim())) {
    throw new SecretStoreError(
      `Legacy key ${legacyKeyId.trim()} is not present in the key ring`
    );
  }

  return {
    entries,
    activeKeyId: activeKeyId.trim(),
    legacyKeyId: legacyKeyId ? legacyKeyId.trim() : null,
    keyCount: entries.size,
  };
}

/**
 * Backward-compatible single-key constructor helper.
 *
 * Treats a single base64-encoded 32-byte key as a key ring with one entry
 * whose keyId is "legacy". This key serves as both the active write key and
 * the v1 legacy decryption key. Used by index.ts for environments that have
 * not yet migrated to the multi-key configuration.
 */
export function makeSingleKeyRing(
  encryptionKeyBase64: string
): ValidatedKeyRing {
  const key = parseStrictBase64(encryptionKeyBase64, 32);

  const entries = new Map<string, Buffer>();
  entries.set("legacy", key);

  return {
    entries,
    activeKeyId: "legacy",
    legacyKeyId: "legacy",
    keyCount: entries.size,
  };
}

/**
 * Envelope format versions.
 */
export const ENVELOPE_VERSION_V1 = 1;
export const ENVELOPE_VERSION_V2 = 2;

/**
 * v2 encrypted secret file envelope.
 */
interface EncryptedSecretFileV2 {
  version: 2;
  keyId: string;
  ref: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

/**
 * v1 encrypted secret file envelope (legacy, no keyId).
 */
interface EncryptedSecretFileV1 {
  version: 1;
  ref: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

type EncryptedSecretFile = EncryptedSecretFileV1 | EncryptedSecretFileV2;

/**
 * Build AAD (Additional Authenticated Data) for GCM.
 * Binds envelope version, key ID, and secret reference to the ciphertext.
 *
 * Exported for reuse by the Phase 2 rotation utility so that rotated
 * envelopes are bound to the same AAD as newly written envelopes.
 */
export function buildAad(envelope: {
  version: number;
  keyId?: string;
  ref: string;
}): Buffer {
  const aadPayload = {
    version: envelope.version,
    keyId: envelope.keyId ?? null,
    ref: envelope.ref,
  };
  return Buffer.from(JSON.stringify(aadPayload), "utf8");
}

/**
 * Validate IV length (12 bytes for GCM).
 *
 * Exported for reuse by the Phase 2 rotation utility.
 */
export function validateIvLength(iv: Buffer, context: string): void {
  if (iv.length !== 12) {
    throw new SecretStoreError(
      `${context}: invalid IV length ${iv.length}, expected 12 bytes`
    );
  }
}

/**
 * Validate authentication tag length (16 bytes for GCM).
 *
 * Exported for reuse by the Phase 2 rotation utility.
 */
export function validateTagLength(tag: Buffer, context: string): void {
  if (tag.length !== 16) {
    throw new SecretStoreError(
      `${context}: invalid authentication tag length ${tag.length}, expected 16 bytes`
    );
  }
}

/**
 * Encrypted file-backed secret store with versioned envelopes and multi-key
 * support.
 *
 * Phase 1: supports v1 (legacy, single key) and v2 (multi-key) envelopes.
 * New writes always use the active key and emit v2 envelopes.
 */
export class EncryptedFileTenantSecretStore implements TenantSecretStore {
  private readonly directory: string;
  private readonly entries: Map<string, Buffer>;
  private readonly activeKeyId: string;
  private readonly legacyKeyId: string | null;

  constructor(
    directory: string,
    keyRingOrKey: Map<string, Buffer> | string,
    options: {
      activeKeyId?: string | null;
      legacyKeyId?: string | null;
    } = {}
  ) {
    if (!directory.trim()) {
      throw new SecretStoreError("TENANT_SECRETS_DIR is not configured");
    }

    let entries: Map<string, Buffer>;
    let activeKeyId: string;
    let legacyKeyId: string | null;

    if (keyRingOrKey instanceof Map) {
      entries = keyRingOrKey;
      activeKeyId = options.activeKeyId ?? "";
      legacyKeyId = options.legacyKeyId ?? null;
    } else {
      // Backward-compatible single-key path.
      const key = Buffer.from(keyRingOrKey, "base64");
      if (key.length !== 32) {
        throw new SecretStoreError(
          "Encryption key must be a base64-encoded 32-byte value"
        );
      }
      entries = new Map([["legacy", key]]);
      activeKeyId = "legacy";
      legacyKeyId = "legacy";
    }

    if (!activeKeyId.trim()) {
      throw new SecretStoreError("Active key ID is required");
    }
    if (!entries.has(activeKeyId.trim())) {
      throw new SecretStoreError(
        `Active key ${activeKeyId.trim()} is not present in the key ring`
      );
    }

    if (legacyKeyId && !entries.has(legacyKeyId.trim())) {
      throw new SecretStoreError(
        `Legacy key ${legacyKeyId.trim()} is not present in the key ring`
      );
    }

    this.directory = path.resolve(directory);
    this.entries = entries;
    this.activeKeyId = activeKeyId.trim();
    this.legacyKeyId = legacyKeyId ? legacyKeyId.trim() : null;
  }

  private fileFor(ref: string): string {
    const digest = createHash("sha256").update(ref).digest("hex");
    return path.join(this.directory, `${digest}.secret`);
  }

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true });

    // Restrict directory access to owner only where POSIX mode bits are supported.
    // On Windows, POSIX permission bits are not enforced by the filesystem ACL model;
    // 0o700 does not provide equivalent protection there. We still attempt chmod
    // for portability but only fail on POSIX platforms where it is expected to work.
    try {
      await fs.chmod(this.directory, 0o700);
    } catch (err) {
      const isWindows = process.platform === "win32";
      if (isWindows) {
        // Windows does not enforce POSIX mode bits; directory ACLs are managed
        // separately. Do not fail startup on Windows, but the operator must
        // secure the directory through Windows ACLs.
        return;
      }
      throw new SecretStoreError(
        `Unable to set directory permissions on ${this.directory}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Encrypt a value using the active key and write a v2 envelope.
   */
  async put(ref: string, value: string): Promise<void> {
    if (!ref.trim()) throw new SecretStoreError("Secret reference is required");

    const activeKey = this.entries.get(this.activeKeyId);
    if (!activeKey) {
      throw new SecretStoreError(
        `Active key ${this.activeKeyId} is not available`
      );
    }

    // Acquire writer lease before writing. Coordination is mandatory;
    // there is no production bypass.
    const lease = await acquireWriterLease({
      directory: this.directory,
      operation: "put",
    });

    let leaseReleaseError: Error | null = null;
    let operationError: Error | null = null;

    try {
      await this.ensureDirectory();

      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", activeKey, iv);

      const aad = buildAad({ version: ENVELOPE_VERSION_V2, keyId: this.activeKeyId, ref });
      cipher.setAAD(aad);

      const ciphertext = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();

      const payload: EncryptedSecretFileV2 = {
        version: ENVELOPE_VERSION_V2,
        keyId: this.activeKeyId,
        ref,
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        ciphertext: ciphertext.toString("base64"),
      };

      const target = this.fileFor(ref);
      const temporary = `${target}.${randomBytes(6).toString("hex")}.tmp`;

      try {
        await fs.writeFile(temporary, JSON.stringify(payload), { mode: 0o600 });
        await fs.rename(temporary, target);
      } catch (err) {
        operationError = err instanceof Error ? err : new Error(String(err));
        // Best-effort cleanup of the temp file if rename failed.
        try {
          await fs.unlink(temporary);
        } catch {
          // Ignore cleanup errors; the temp file is harmless.
        }
        throw err;
      }
    } finally {
      // Always release the lease. Surface cleanup failures without
      // masking the original operation result.
      try {
        await lease.release();
      } catch (err) {
        leaseReleaseError =
          err instanceof Error ? err : new Error(String(err));
      }

      if (operationError && leaseReleaseError) {
        throw new AggregateError(
          [operationError, leaseReleaseError],
          "Secret write succeeded but coordination cleanup failed; original write may have completed"
        );
      }
      if (leaseReleaseError && !operationError) {
        throw new AggregateError(
          [leaseReleaseError],
          "Secret write completed but lease release failed; coordination cleanup failed"
        );
      }
      if (operationError) {
        throw operationError;
      }
    }
  }

  /**
   * Read and decrypt a secret. Supports v1 (legacy key only) and v2 (keyed by
   * keyId) envelopes. Never tries v1 files against non-legacy keys.
   */
  async get(ref: string): Promise<string | null> {
    let raw: string;
    try {
      raw = await fs.readFile(this.fileFor(ref), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw new SecretStoreError("Unable to read tenant secret");
    }

    let payload: EncryptedSecretFile;
    try {
      payload = JSON.parse(raw) as EncryptedSecretFile;
    } catch {
      throw new SecretStoreError("Tenant secret file is not valid JSON");
    }

    if (!payload || typeof payload !== "object") {
      throw new SecretStoreError("Tenant secret file is invalid");
    }

    const version = payload.version;

    if (version === ENVELOPE_VERSION_V1) {
      return this.decryptV1(payload as EncryptedSecretFileV1, ref);
    }

    if (version === ENVELOPE_VERSION_V2) {
      return this.decryptV2(payload as EncryptedSecretFileV2, ref);
    }

    throw new SecretStoreError(
      `Unsupported envelope version ${String(version)}`
    );
  }

  /**
   * Decrypt a v1 envelope using only the configured legacy key.
   * Never tries other keys in the ring.
   */
  private decryptV1(
    payload: EncryptedSecretFileV1,
    ref: string
  ): Promise<string> {
    if (!this.legacyKeyId) {
      throw new SecretStoreError(
        "Legacy key is not configured; cannot decrypt v1 envelope"
      );
    }

    const legacyKey = this.entries.get(this.legacyKeyId);
    if (!legacyKey) {
      throw new SecretStoreError(
        `Legacy key ${this.legacyKeyId} is not available`
      );
    }

    // Validate structural fields before attempting decryption.
    if (payload.ref !== ref) {
      throw new SecretStoreError("Tenant secret file reference mismatch");
    }
    if (typeof payload.iv !== "string" || typeof payload.tag !== "string") {
      throw new SecretStoreError("Tenant secret file is invalid");
    }

    let iv: Buffer;
    let tag: Buffer;
    try {
      iv = Buffer.from(payload.iv, "base64");
      tag = Buffer.from(payload.tag, "base64");
    } catch {
      throw new SecretStoreError("Tenant secret file has invalid encoding");
    }

    validateIvLength(iv, "v1 envelope");
    validateTagLength(tag, "v1 envelope");

    try {
      const decipher = createDecipheriv("aes-256-gcm", legacyKey, iv);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, "base64")),
        decipher.final(),
      ]);
      return Promise.resolve(plaintext.toString("utf8"));
    } catch {
      throw new SecretStoreError("Unable to decrypt tenant secret");
    }
  }

  /**
   * Decrypt a v2 envelope using the key identified by keyId.
   * Unknown key IDs fail closed.
   */
  private decryptV2(
    payload: EncryptedSecretFileV2,
    ref: string
  ): Promise<string> {
    if (payload.ref !== ref) {
      throw new SecretStoreError("Tenant secret file reference mismatch");
    }
    if (
      typeof payload.keyId !== "string" ||
      typeof payload.iv !== "string" ||
      typeof payload.tag !== "string" ||
      typeof payload.ciphertext !== "string"
    ) {
      throw new SecretStoreError("Tenant secret file is invalid");
    }

    const key = this.entries.get(payload.keyId);
    if (!key) {
      throw new SecretStoreError(
        `Key ${payload.keyId} is not available in the key ring`
      );
    }

    let iv: Buffer;
    let tag: Buffer;
    try {
      iv = Buffer.from(payload.iv, "base64");
      tag = Buffer.from(payload.tag, "base64");
    } catch {
      throw new SecretStoreError("Tenant secret file has invalid encoding");
    }

    validateIvLength(iv, "v2 envelope");
    validateTagLength(tag, "v2 envelope");

    const aad = buildAad({
      version: ENVELOPE_VERSION_V2,
      keyId: payload.keyId,
      ref,
    });

    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAAD(aad);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, "base64")),
        decipher.final(),
      ]);
      return Promise.resolve(plaintext.toString("utf8"));
    } catch {
      throw new SecretStoreError("Unable to decrypt tenant secret");
    }
  }

  async delete(ref: string): Promise<void> {
    // Acquire writer lease before deleting. Coordination is mandatory;
    // there is no production bypass.
    const lease = await acquireWriterLease({
      directory: this.directory,
      operation: "delete",
    });

    let leaseReleaseError: Error | null = null;
    let operationError: Error | null = null;

    try {
      try {
        await fs.unlink(this.fileFor(ref));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          operationError = new SecretStoreError("Unable to delete tenant secret");
          throw operationError;
        }
      }
    } finally {
      // Always release the lease. Surface cleanup failures without
      // masking the original operation result.
      try {
        await lease.release();
      } catch (err) {
        leaseReleaseError =
          err instanceof Error ? err : new Error(String(err));
      }

      if (operationError && leaseReleaseError) {
        throw new AggregateError(
          [operationError, leaseReleaseError],
          "Secret delete succeeded but coordination cleanup failed; original delete may have completed"
        );
      }
      if (leaseReleaseError && !operationError) {
        throw new AggregateError(
          [leaseReleaseError],
          "Secret delete completed but lease release failed; coordination cleanup failed"
        );
      }
      if (operationError) {
        throw operationError;
      }
    }
  }

  /**
   * Return the active key ID (safe to log; key material is never exposed).
   */
  getActiveKeyId(): string {
    return this.activeKeyId;
  }

  /**
   * Return the legacy key ID (safe to log; key material is never exposed).
   */
  getLegacyKeyId(): string | null {
    return this.legacyKeyId;
  }

  /**
   * Return the number of keys in the ring (safe to log).
   */
  getKeyCount(): number {
    return this.entries.size;
  }
}

export function makeDatabasePasswordSecretRef(storeId: string): string {
  return `kv://tenant-secrets/stores/${storeId}/database-password`;
}

/**
 * Generate a 40 character password with all required character classes.
 * The value is never logged and is only handed to the Management API and the
 * secret store.
 */
export function generateDatabasePassword(length = 40): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#%^*-_=+";
  const all = upper + lower + digits + symbols;

  const pick = (alphabet: string): string =>
    alphabet[randomInt(0, alphabet.length)]!;

  const characters = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (characters.length < length) {
    characters.push(pick(all));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = randomInt(0, index + 1);
    [characters[index], characters[swap]] = [
      characters[swap]!,
      characters[index]!,
    ];
  }

  return characters.join("");
}
