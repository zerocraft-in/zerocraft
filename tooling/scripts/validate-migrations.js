/**
 * Validate migration naming convention.
 *
 * Migration files must follow: YYYYMMDDHHMMSS_description.sql
 * Example: 20261123140000_fix_invite_member_rpc.sql
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "infrastructure/supabase/migrations");

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));

const errors = [];
const timestampPattern = /^(\d{14})_([a-z0-9_]+)\.sql$/;

for (const file of files) {
  const match = file.match(timestampPattern);
  if (!match) {
    errors.push(`Invalid migration name: ${file} (expected YYYYMMDDHHMMSS_description.sql)`);
    continue;
  }

  const timestamp = match[1];
  // Validate it's a plausible datetime (basic check)
  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);
  const date = new Date(`${year}-${month}-${day}`);
  if (isNaN(date.getTime()) || date.getFullYear() !== parseInt(year)) {
    errors.push(`Invalid date in migration name: ${file}`);
  }
}

if (errors.length > 0) {
  console.error("Migration validation failed:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(`All ${files.length} migration files are valid.`);
