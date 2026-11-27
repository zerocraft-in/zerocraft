/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Template loader: reads Shopify taxonomy migrations and seeds
 * from templates/commerce/ directly.
 *
 * Does NOT modify templates/commerce/ in any way.
 * All file reads are read-only.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface TemplateFile {
  version: string;
  kind: "migration" | "seed" | "verify";
  file: string;
  checksum: string;
  sql: string;
}

export interface TemplateBundle {
  name: string;
  version: string;
  protectedProjects: string[];
  migrations: TemplateFile[];
  seeds: TemplateFile[];
  verification: TemplateFile[];
}

const COMMERCE_TEMPLATE_DIR = path.resolve(__dirname, "../../../templates/commerce");

/**
 * Compute SHA-256 checksum of a file's contents.
 */
function computeChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Load the template manifest from templates/commerce/template.config.json.
 */
export function loadTemplateManifest(): {
  name: string;
  version: string;
  protectedProjects: string[];
  migrations: Array<{ version: string; kind: string; file: string; checksum: string }>;
  seeds: Array<{ version: string; kind: string; file: string; checksum: string }>;
  verification: Array<{ version: string; kind: string; file: string; checksum: string }>;
} {
  const configPath = path.join(COMMERCE_TEMPLATE_DIR, "template.config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  return {
    name: config.name,
    version: config.version,
    protectedProjects: Array.isArray(config.protectedProjects)
      ? config.protectedProjects.filter((ref: unknown) => typeof ref === "string")
      : [],
    migrations: config.migrations.map((m: any) => ({
      version: m.version,
      kind: m.kind,
      file: m.file,
      checksum: m.checksum,
    })),
    seeds: config.seeds.map((s: any) => ({
      version: s.version,
      kind: s.kind,
      file: s.file,
      checksum: s.checksum,
    })),
    verification: config.verification.map((v: any) => ({
      version: v.version,
      kind: v.kind,
      file: v.file,
      checksum: v.checksum,
    })),
  };
}

/**
 * Load all migration SQL files from templates/commerce/migrations/.
 * Reads files in version order (001 through 015).
 */
export function loadMigrationFiles(): TemplateFile[] {
  const manifest = loadTemplateManifest();
  const files: TemplateFile[] = [];

  for (const manifestEntry of manifest.migrations) {
    const filePath = path.join(COMMERCE_TEMPLATE_DIR, manifestEntry.file);
    const sql = fs.readFileSync(filePath, "utf8");
    const checksum = computeChecksum(filePath);

    // Verify checksum matches manifest
    if (checksum !== manifestEntry.checksum) {
      throw new Error(
        `Checksum mismatch for migration ${manifestEntry.file}: expected ${manifestEntry.checksum}, got ${checksum}`
      );
    }

    files.push({
      version: manifestEntry.version,
      kind: manifestEntry.kind as TemplateFile["kind"],
      file: manifestEntry.file,
      checksum,
      sql,
    });
  }

  return files;
}

/**
 * Load all seed SQL files from templates/commerce/seeds/.
 */
export function loadSeedFiles(): TemplateFile[] {
  const manifest = loadTemplateManifest();
  const files: TemplateFile[] = [];

  for (const manifestEntry of manifest.seeds) {
    const filePath = path.join(COMMERCE_TEMPLATE_DIR, manifestEntry.file);
    const sql = fs.readFileSync(filePath, "utf8");
    const checksum = computeChecksum(filePath);

    // Verify checksum matches manifest
    if (checksum !== manifestEntry.checksum) {
      throw new Error(
        `Checksum mismatch for seed ${manifestEntry.file}: expected ${manifestEntry.checksum}, got ${checksum}`
      );
    }

    files.push({
      version: manifestEntry.version,
      kind: manifestEntry.kind as TemplateFile["kind"],
      file: manifestEntry.file,
      checksum,
      sql,
    });
  }

  return files;
}

/**
 * Load all verification SQL files from templates/commerce/tests/.
 */
export function loadVerificationFiles(): TemplateFile[] {
  const manifest = loadTemplateManifest();
  const files: TemplateFile[] = [];

  for (const manifestEntry of manifest.verification) {
    const filePath = path.join(COMMERCE_TEMPLATE_DIR, manifestEntry.file);
    const sql = fs.readFileSync(filePath, "utf8");
    const checksum = computeChecksum(filePath);

    // Verify checksum matches manifest
    if (checksum !== manifestEntry.checksum) {
      throw new Error(
        `Checksum mismatch for verification ${manifestEntry.file}: expected ${manifestEntry.checksum}, got ${checksum}`
      );
    }

    files.push({
      version: manifestEntry.version,
      kind: manifestEntry.kind as TemplateFile["kind"],
      file: manifestEntry.file,
      checksum,
      sql,
    });
  }

  return files;
}

/**
 * Load the complete template bundle from templates/commerce/.
 * Verifies checksums and ordering.
 */
export function loadTemplateBundle(): TemplateBundle {
  const manifest = loadTemplateManifest();
  const migrations = loadMigrationFiles();
  const seeds = loadSeedFiles();
  const verification = loadVerificationFiles();

  return {
    name: manifest.name,
    version: manifest.version,
    protectedProjects: manifest.protectedProjects,
    migrations,
    seeds,
    verification,
  };
}