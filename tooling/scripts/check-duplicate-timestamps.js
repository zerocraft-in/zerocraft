/**
 * Detect duplicate migration timestamps.
 * Two migrations with the same timestamp would create migration history drift.
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "infrastructure/supabase/migrations");

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));

const timestamps = {};
const errors = [];

for (const file of files) {
  const match = file.match(/^(\d{14})_/);
  if (match) {
    const ts = match[1];
    if (timestamps[ts]) {
      errors.push(
        `Duplicate migration timestamp ${ts}: ${timestamps[ts]} and ${file}`
      );
    } else {
      timestamps[ts] = file;
    }
  }
}

if (errors.length > 0) {
  console.error("Duplicate migration timestamps detected:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(`No duplicate migration timestamps found among ${files.length} files.`);
