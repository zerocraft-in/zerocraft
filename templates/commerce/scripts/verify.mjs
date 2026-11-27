#!/usr/bin/env node
/**
 * Static verification for the Commerce Template.
 * Exit code 1 when any error is found. Warnings are informational.
 */

import { verifyTemplate } from "./template-lib.mjs";

const { errors, warnings, config, tableCount } = verifyTemplate();

console.log(`commerce-template ${config.version}`);
console.log(`tables: ${tableCount}`);
console.log(`migrations: ${config.migrations.length}, seeds: ${config.seeds.length}`);

for (const warning of warnings) console.warn(`warning: ${warning}`);

if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  console.error(`\n${errors.length} error(s)`);
  process.exit(1);
}

console.log("all template checks passed");
