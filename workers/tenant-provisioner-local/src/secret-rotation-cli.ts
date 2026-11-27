#!/usr/bin/env node
/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * CLI for restartable bulk secret key rotation.
 *
 * Explicit, offline maintenance commands. Nothing runs automatically:
 *   * no startup-triggered rotation,
 * * no automatic key retirement,
 * * no printing of secrets, keys, or plaintext.
 *
 * Commands:
 *   secret-rotation-cli rotate --dir <SECRET_DIR> [--execute] [--lock-file <LOCK>]
 *   secret-rotation-cli verify --dir <SECRET_DIR> [--check-retire <KEY_ID>] [--lock-file <LOCK>]
 *
 * Exit codes:
 *   0 = complete success (rotation fully applied / scan complete)
 *   1 = partial failure or cannot proceed (lock held, some files failed)
 *   2 = invalid configuration (missing directory or key ring)
 *
 * Examples (placeholder values only; never run against real user secrets):
 *   npx tsx src/secret-rotation-cli.ts rotate --dir "/tmp/tenant-secrets" --execute
 *   npx tsx src/secret-rotation-cli.ts rotate --dir "/tmp/tenant-secrets" --dry-run
 *   npx tsx src/secret-rotation-cli.ts verify --dir "/tmp/tenant-secrets" --check-retire "old-key-1"
 *
 * Required environment variables (multi-key format):
 *   TENANT_SECRETS_ACTIVE_KEY_ID   - active write key id
 *   TENANT_SECRETS_LEGACY_KEY_ID   - optional v1 legacy key id
 *   TENANT_SECRETS_KEY_<keyId>     - base64-encoded 32-byte key material
 */

import * as path from "path";
import { parseKeyRingFromEnv } from "./secrets";
import {
  rotateSecrets,
  verifySecrets,
  isKeyReferenced,
  isRetirementEligible,
  type VerificationResult,
} from "./secret-rotation";
import {
  MaintenanceActiveError,
  WriterDrainTimeoutError,
} from "./maintenance-lock";
import { SecretStoreError } from "./errors";

interface CliArgs {
  command: "rotate" | "verify" | null;
  dir: string | null;
  execute: boolean;
  checkRetire: string | null;
  lockFile: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  const result: CliArgs = {
    command: null,
    dir: null,
    execute: false,
    checkRetire: null,
    lockFile: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "rotate") {
      result.command = "rotate";
    } else if (arg === "verify") {
      result.command = "verify";
    } else if (arg === "--dir" || arg === "-d") {
      if (!next) throw new Error("--dir requires a value");
      result.dir = next;
      i += 1;
    } else if (arg === "--execute") {
      result.execute = true;
    } else if (arg === "--dry-run") {
      result.execute = false;
    } else if (arg === "--check-retire") {
      if (!next) throw new Error("--check-retire requires a value");
      result.checkRetire = next;
      i += 1;
    } else if (arg === "--lock-file") {
      if (!next) throw new Error("--lock-file requires a value");
      result.lockFile = next;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!result.command) {
    throw new Error("Missing command: rotate | verify");
  }
  if (!result.dir) {
    result.dir = process.env.TENANT_SECRETS_DIR ?? null;
  }
  if (!result.dir) {
    throw new Error("Secret directory is required: --dir <SECRET_DIR> or TENANT_SECRETS_DIR");
  }

  return result;
}

function printHelp(): void {
  process.stdout.write(
    `Usage: secret-rotation-cli <command> [options]

Commands:
  rotate    Migrate v1 and old-key v2 secret envelopes to the active key.
  verify    Read-only scan; report envelope/key coverage and retirement eligibility.

Options:
  --dir <PATH>          Tenant secret directory (or TENANT_SECRETS_DIR).
  --execute             Perform writes (rotation defaults to dry-run).
  --dry-run             Do not write anything (default for rotate).
  --check-retire <KEY>  With verify: check whether KEY is still referenced.
  --lock-file <PATH>    Override lock file path.
  --help                Show this help.

Exit codes: 0 success, 1 partial failure / cannot proceed, 2 invalid configuration.

Never run against real user secret files; use isolated temporary directories.

IMPORTANT: Application writes through EncryptedFileTenantSecretStore.put()
and delete() are coordinated with rotation through writer leases and the
maintenance lock. Rotation acquires the maintenance lock and drains writer
leases before modifying any secret file. New writes are rejected while
maintenance is active. Concurrent modifications are detected by SHA-256
content-hash checking, which eliminates most TOCTOU races.

Examples (placeholders only):
  secret-rotation-cli rotate --dir "/tmp/tenant-secrets" --execute
  secret-rotation-cli verify --dir "/tmp/tenant-secrets" --check-retire "old-key-1"
`
  );
}

/**
 * Format a key ID or label safely for output (key IDs are not secrets).
 */
function safeLabel(value: string | null): string {
  if (value === null) return "(none)";
  return value;
}

function loadKeyRing(directory: string) {
  let keyRing;
  try {
    keyRing = parseKeyRingFromEnv();
  } catch (err) {
    throw new SecretStoreError(
      `Invalid key ring configuration: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (!keyRing.entries.has(keyRing.activeKeyId)) {
    throw new SecretStoreError(
      `Active key ${keyRing.activeKeyId} is not present in the key ring`
    );
  }
  return keyRing;
}

async function runRotate(
  dir: string,
  execute: boolean,
  lockFile: string | null
): Promise<{ code: number; message: string }> {
  const keyRing = loadKeyRing(dir);

  try {
    const result = await rotateSecrets({
      directory: dir,
      keyRing,
      dryRun: !execute,
      lockFile: lockFile ?? undefined,
    });

    const lines: string[] = [];
    lines.push(`Secret rotation (${result.dryRun ? "dry-run" : "execute"})`);
    lines.push(`Directory: ${dir}`);
    lines.push(
      `Scanned: ${result.scanned}, Migrated: ${result.migrated}, Unchanged: ${result.unchanged}, Failed: ${result.failed}`
    );

    const failures = result.outcomes.filter((o) => o.status === "failed");
    if (failures.length > 0) {
      lines.push("");
      lines.push("Failures (original files preserved):");
      for (const f of failures) {
        lines.push(`  ${f.relative}: ${f.error}`);
      }
    }

    if (result.failed > 0) {
      return { code: 1, message: lines.join("\n") };
    }
    return { code: 0, message: lines.join("\n") };
  } catch (err) {
    if (err instanceof MaintenanceActiveError) {
      return { code: 1, message: err.message };
    }
    if (err instanceof WriterDrainTimeoutError) {
      return { code: 1, message: err.message };
    }
    return { code: 1, message: sanitizeCliError(err) };
  }
}

async function runVerify(
  dir: string,
  checkRetire: string | null
): Promise<{ code: number; message: string }> {
  const keyRing = loadKeyRing(dir);

  let result: VerificationResult;
  try {
    result = await verifySecrets(dir, keyRing);
  } catch (err) {
    return {
      code: 2,
      message: `Verification failed: ${sanitizeCliError(err)}`,
    };
  }

  const lines: string[] = [];
  lines.push("Secret verification");
  lines.push(`Directory: ${result.directory}`);
  lines.push(`Scanned: ${result.scanned}`);
  lines.push(`Complete scan: ${result.complete ? "yes" : "no"}`);
  lines.push("");

  lines.push("Envelope version / key coverage:");
  const versions = Object.keys(result.byVersionAndKey).sort();
  if (versions.length === 0) {
    lines.push("  (no recognized secret files)");
  }
  for (const version of versions) {
    const keys = result.byVersionAndKey[version];
    const keyLabels = Object.keys(keys).sort();
    for (const keyLabel of keyLabels) {
      lines.push(`  v${version} / ${safeLabel(keyLabel)}: ${keys[keyLabel]}`);
    }
  }

  lines.push("");
  lines.push(`v1 files: ${result.v1Files}`);
  lines.push(`Files referencing unknown keys: ${result.unknownKeyFiles}`);
  lines.push(`Malformed or unreadable files: ${result.malformedOrUnreadableFiles}`);

  if (checkRetire) {
    const referenced = isKeyReferenced(result, checkRetire);
    const eligible = isRetirementEligible(result, checkRetire);
    lines.push("");
    lines.push(`Retirement check for key ${checkRetire}:`);
    lines.push(`  Still referenced: ${referenced ? "yes" : "no"}`);
    lines.push(`  Eligible for retirement: ${eligible ? "yes" : "no"}`);
    if (!eligible) {
      const reasons: string[] = [];
      if (!result.complete) reasons.push("scan incomplete (unreadable or malformed files present)");
      if (result.v1Files > 0) reasons.push(`${result.v1Files} v1 file(s) still present`);
      if ((result.keyReferenceCounts[checkRetire] ?? 0) > 0)
        reasons.push(`${result.keyReferenceCounts[checkRetire]} file(s) still reference this key`);
      if (result.malformedOrUnreadableFiles > 0)
        reasons.push(`${result.malformedOrUnreadableFiles} malformed or unreadable file(s)`);
      lines.push(`  Reason(s): ${reasons.join("; ") || "ineligible"}`);
      lines.push(`  Key retirement is not performed by this utility; confirm outside this tool.`);
    }
  }

  const hasFailures = !result.complete || result.v1Files > 0 || result.unknownKeyFiles > 0 || result.malformedOrUnreadableFiles > 0;
  return { code: hasFailures ? 1 : 0, message: lines.join("\n") };
}

export function sanitizeCliError(error: unknown): string {
  if (error instanceof SecretStoreError) return error.message;
  if (error instanceof AggregateError) {
    const messages = error.errors.map((e) => sanitizeCliError(e));
    return messages.join("; ");
  }
  if (error instanceof Error) {
    // Do not return raw Error.message - it may contain filesystem paths,
    // secret values, or other sensitive details. Return only the error code
    // when available, otherwise a generic safe message.
    const code = (error as NodeJS.ErrnoException).code;
    return code ? `${code}: system error` : "Unexpected error";
  }
  return "Unexpected error";
}

async function main(): Promise<void> {
  let code = 0;
  let message = "";

  try {
    const args = parseArgs(process.argv);

    if (args.command === "rotate") {
      const outcome = await runRotate(args.dir!, args.execute, args.lockFile);
      code = outcome.code;
      message = outcome.message;
    } else {
      const outcome = await runVerify(args.dir!, args.checkRetire);
      code = outcome.code;
      message = outcome.message;
    }
  } catch (err) {
    code = 2;
    message = `Configuration error: ${sanitizeCliError(err)}`;
  }

  if (message) {
    process.stdout.write(message + "\n");
  }
  process.exit(code);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`Fatal: ${sanitizeCliError(err)}\n`);
    process.exit(2);
  });
}
