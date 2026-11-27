/**
 * Check migration SQL for destructive operations.
 * Flags DROP TABLE, DROP COLUMN, TRUNCATE, DELETE without WHERE, etc.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "infrastructure/supabase/migrations");

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));

const destructivePatterns = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bALTER\s+TABLE.*\bDROP\b/i,
];

const errors = [];

for (const file of files) {
  const content = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
  for (const pattern of destructivePatterns) {
    if (pattern.test(content)) {
      errors.push(
        `Potentially destructive operation in ${file}: matches /${pattern.source}/`
      );
    }
  }
}

if (errors.length > 0) {
  console.warn("Potentially destructive migrations detected:");
  for (const error of errors) {
    console.warn(`  - ${error}`);
  }
  console.warn(
    "\nReview these migrations before applying to production. No automatic destructive migration is run in CI."
  );
  process.exit(1);
}

console.log("No destructive operations detected in migration files.");
