// Zerocraft Platform — Static test: verify RLS enablement and policies
// Reads migration SQL files. No database connection.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');
const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
const contents = {};
for (const f of files) {
  contents[f] = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
}
const allSql = Object.values(contents).join('\n');

// Strip SQL comments (-- and /* */) to avoid matching comment text
const sqlNoComments = allSql
  .replace(/--[^\n]*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');

let failures = 0;
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

// Extract all tables
const allTables = [];
for (const f of files) {
  const matches = contents[f].match(/create table (?:public\.)?(\w+)/g) || [];
  for (const m of matches) {
    allTables.push({ table: m.match(/create table (?:public\.)?(\w+)/i)[1], file: f });
  }
}

// 1. Every table has RLS enabled
for (const { table, file } of allTables) {
  const rlsPattern = new RegExp(`alter table public\\.${table} enable row level security`);
  check(`"${table}" (${file}) has RLS enabled`, rlsPattern.test(sqlNoComments));
}

// 2. Every table has at least one policy (count references "on public.<table>")
for (const { table, file } of allTables) {
  const onTablePattern = new RegExp(`on public\\.${table}\\b`, 'g');
  const onTableMatches = sqlNoComments.match(onTablePattern) || [];
  check(`"${table}" (${file}) has at least one policy`, onTableMatches.length > 0, `found ${onTableMatches.length}`);
}

// 3. platform_members select policy calls has_platform_permission (circular RLS fix)
check('platform_members policy calls has_platform_permission', /private\.has_platform_permission/.test(sqlNoComments));

// 4. has_platform_permission is owned by postgres (breaks circular RLS)
check('has_platform_permission ownership pinned to postgres', /alter function private\.has_platform_permission\(text\) owner to postgres/.test(sqlNoComments));

// 5. No table has permissive insert/update/delete using (true) / with check (true)
//    Read-only reference tables may have select_all policies but not insert/update/delete with true
const readOnlyTables = ['platform_roles', 'platform_permissions', 'platform_role_permissions', 'organization_roles', 'organization_permissions', 'organization_role_permissions'];
const permissivePattern = /create policy [\s\S]*?on public\.(\w+)\s+for (insert|update|delete)\s+to authenticated\s+(?:using|with check)\s*\(\s*true\s*\)/gi;
let match;
while ((match = permissivePattern.exec(sqlNoComments)) !== null) {
  const table = match[1];
  const op = match[2];
  const isReadOnly = readOnlyTables.includes(table);
  check(`"${table}" ${op} policy is not permissive`, !isReadOnly, `table=${table} op=${op} readOnly=${isReadOnly}`);
}

// 6. Protected tables block direct INSERT/UPDATE/DELETE via RLS policies (using/with check false)
const protectedTables = ['platform_members', 'organizations', 'organization_members', 'organization_invitations'];
for (const t of protectedTables) {
  const blockInsert = new RegExp(`create policy [\\s\\S]*?on public\\.${t}\\s+for insert\\s+to authenticated\\s+with check\\s*\\(\\s*false\\s*\\)`, 'i');
  const blockUpdate = new RegExp(`create policy [\\s\\S]*?on public\\.${t}\\s+for update\\s+to authenticated\\s+using\\s*\\(\\s*false\\s*\\)`, 'i');
  const blockDelete = new RegExp(`create policy [\\s\\S]*?on public\\.${t}\\s+for delete\\s+to authenticated\\s+using\\s*\\(\\s*false\\s*\\)`, 'i');
  check(`"${t}" INSERT blocked by RLS policy`, blockInsert.test(sqlNoComments));
  check(`"${t}" UPDATE blocked by RLS policy`, blockUpdate.test(sqlNoComments));
  check(`"${t}" DELETE blocked by RLS policy`, blockDelete.test(sqlNoComments));
}

// 7. All actual SECURITY DEFINER function declarations have set search_path = ''
//    Match only function declarations, not comments: "create or replace function" ... "security definer" ... "set search_path = ''"
const secDefDecls = (sqlNoComments.match(/create or replace function [\s\S]{0,300}?security definer/gi) || []).length;
const secDefWithSearchPath = (sqlNoComments.match(/create or replace function [\s\S]{0,300}?security definer[\s\S]{0,200}?set search_path = ''/gi) || []).length;
check(`All ${secDefDecls} SECURITY DEFINER function declarations have set search_path = ''`, secDefWithSearchPath === secDefDecls, `found ${secDefWithSearchPath}/${secDefDecls}`);

// 8. No anonymous access to private schema functions
check('private schema access revoked from public/anon', /revoke all on schema private from public, anon/.test(sqlNoComments));

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
