import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsDir = path.join(root, "packages/supabase/supabase/migrations");
const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
const names = new Set();
const versions = new Set();

for (const file of files) {
  const match = /^(\d{12,14})_([a-z0-9_]+)\.sql$/.exec(file);
  assert(match, `Invalid migration filename: ${file}`);
  const [, version, name] = match;
  assert(!versions.has(version), `Duplicate migration version: ${version}`);
  assert(!names.has(name), `Duplicate migration name: ${name}`);
  versions.add(version);
  names.add(name);
}

assert(files.length > 0, "No Supabase migrations found.");
console.log(`Migration preflight passed: ${files.length} unique SQL migrations.`);
