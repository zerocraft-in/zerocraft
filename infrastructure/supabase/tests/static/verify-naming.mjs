// Zerocraft Platform — Static test: verify object naming conventions
// Reads migration SQL files and checks naming patterns. No database connection.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');
const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
const sql = files
  .map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'))
  .map(s => s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''))
  .join('\n');

let failures = 0;
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

// 1. All tables are plural snake_case
const createTables = sql.match(/create table (?:public\.)?(\w+)/gi) || [];
const tableNames = createTables.map(m => m.match(/create table (?:public\.)?(\w+)/i)[1]);
const vagueNames = ['data', 'settings_table', 'records', 'items', 'table', 'stuff', 'things'];
for (const t of tableNames) {
  check(`Table "${t}" is plural snake_case`, /^[a-z][a-z0-9_]*s$/.test(t), `got ${t}`);
  check(`Table "${t}" is not vague`, !vagueNames.includes(t.toLowerCase()), `got ${t}`);
}

// 2. No duplicate table names
const dupTables = tableNames.filter((t, i) => tableNames.indexOf(t) !== i);
for (const t of [...new Set(dupTables)]) {
  check(`No duplicate table "${t}"`, false, `appears ${tableNames.filter(x => x === t).length} times`);
}
if (dupTables.length === 0) check('No duplicate table names', true);

// 3. Primary keys follow pk_<table>
const pks = sql.match(/constraint (pk_\w+)/g) || [];
for (const pk of pks) {
  const name = pk.replace('constraint ', '');
  check(`PK "${name}" follows pk_<table> pattern`, /^pk_\w+$/.test(name));
}

// 4. Foreign keys follow fk_<table>_<column>
const fks = sql.match(/constraint (fk_\w+)/g) || [];
for (const fk of fks) {
  const name = fk.replace('constraint ', '');
  check(`FK "${name}" follows fk_<table>_<column> pattern`, /^fk_\w+_\w+$/.test(name));
}

// 5. Unique constraints follow uq_<table>_<columns>
const uqs = sql.match(/constraint (uq_\w+)/g) || [];
for (const uq of uqs) {
  const name = uq.replace('constraint ', '');
  check(`UQ "${name}" follows uq_<table>_<columns> pattern`, /^uq_\w+_\w+$/.test(name));
}

// 6. Check constraints follow ck_<table>_<condition>
const cks = sql.match(/constraint (ck_\w+)/g) || [];
for (const ck of cks) {
  const name = ck.replace('constraint ', '');
  check(`CK "${name}" follows ck_<table>_<condition> pattern`, /^ck_\w+_.+$/.test(name));
}

// 7. Indexes follow idx_<table>_<columns>
const idxs = sql.match(/create (?:unique )?index (idx_\w+)/g) || [];
for (const idx of idxs) {
  const name = idx.match(/create (?:unique )?index (idx_\w+)/)[1];
  check(`Index "${name}" follows idx_<table>_<columns> pattern`, /^idx_\w+_\w+$/.test(name));
}

// 8. Triggers follow trg_<table>_<action>
const trgs = sql.match(/create trigger (trg_\w+)/g) || [];
for (const trg of trgs) {
  const name = trg.match(/create trigger (trg_\w+)/)[1];
  check(`Trigger "${name}" follows trg_<table>_<action> pattern`, /^trg_\w+_\w+$/.test(name));
}

// 9. No duplicate constraint names
const allConstraints = [...pks, ...fks, ...uqs, ...cks].map(c => c.replace('constraint ', ''));
const dupConstraints = allConstraints.filter((c, i) => allConstraints.indexOf(c) !== i);
for (const c of [...new Set(dupConstraints)]) {
  check(`No duplicate constraint "${c}"`, false, `appears ${allConstraints.filter(x => x === c).length} times`);
}
if (dupConstraints.length === 0) check('No duplicate constraint names', true);

// 10. No duplicate index names
const idxNames = idxs.map(i => i.match(/create (?:unique )?index (idx_\w+)/)[1]);
const dupIndexes = idxNames.filter((n, i) => idxNames.indexOf(n) !== i);
for (const n of [...new Set(dupIndexes)]) {
  check(`No duplicate index "${n}"`, false);
}
if (dupIndexes.length === 0) check('No duplicate index names', true);

// 11. No duplicate trigger names
const trgNames = trgs.map(t => t.match(/create trigger (trg_\w+)/)[1]);
const dupTriggers = trgNames.filter((n, i) => trgNames.indexOf(n) !== i);
for (const n of [...new Set(dupTriggers)]) {
  check(`No duplicate trigger "${n}"`, false);
}
if (dupTriggers.length === 0) check('No duplicate trigger names', true);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
