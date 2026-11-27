#!/usr/bin/env node
/**
 * Rebuild template.config.json checksums and metadata.
 * Run after adding or changing any migration, seed, or verification file.
 */

import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, listSql, read, sha256 } from "./template-lib.mjs";

const version = process.argv[2] ?? "1.0.0";

function entries(directory, kind) {
  return listSql(directory).map((file) => ({
    version: file.slice(0, 3),
    kind,
    file: `${directory}/${file}`,
    checksum: sha256(read(`${directory}/${file}`))
  }));
}

const manifest = {
  name: "zerocraft-default-commerce",
  version,
  schema: "public",
  minimumPostgres: 15,
  requiredExtensions: ["pgcrypto", "citext"],
  installOrder: ["migrations", "seeds", "initialize_tenant", "verification"],
  migrations: entries("migrations", "migration"),
  seeds: entries("seeds", "seed"),
  verification: entries("tests", "verify").filter((entry) =>
    entry.file.includes("verification")
  ),
  protectedProjects: ["ftcvyhlzeyqceosdqyxn", "qvjhwxriafgobxknpqtq"],
  protectedProjectNote:
    "Never install this template into a Zerocraft Platform project. These refs are documented protected projects and the installer must refuse them.",
  notes: [
    "Checksums are SHA-256 of the exact file bytes.",
    "Applied files are never edited; add a new migration instead.",
    "The provisioning Worker records the same checksums in the Platform DB table tenant_migrations."
  ]
};

writeFileSync(
  join(ROOT, "template.config.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

const counts = {
  migrations: manifest.migrations.length,
  seeds: manifest.seeds.length,
  verification: manifest.verification.length
};

console.log(`template.config.json written (version ${version})`);
console.log(JSON.stringify(counts));

// Guard: every migration directory file must be in the manifest.
const manifestFiles = new Set(manifest.migrations.map((m) => m.file));
for (const file of readdirSync(join(ROOT, "migrations")).filter((f) => f.endsWith(".sql"))) {
  if (!manifestFiles.has(`migrations/${file}`)) {
    console.error(`unmanifested migration: migrations/${file}`);
    process.exitCode = 1;
  }
}
