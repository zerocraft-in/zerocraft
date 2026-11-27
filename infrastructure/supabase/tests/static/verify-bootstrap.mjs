// Zerocraft Platform — Static test: verify Platform Owner bootstrap security
// Reads migration SQL files. No database connection.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = path.join(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(BASE, 'migrations');
const SCRIPTS_DIR = path.join(BASE, 'scripts');

const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
const contents = {};
for (const f of files) {
  contents[f] = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
}
const allSql = Object.values(contents).join('\n');

// Strip SQL comments for accurate pattern matching
const sqlNoComments = allSql
  .replace(/--[^\n]*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const searchPathEmpty = "set search_path = ''";

let failures = 0;
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

// 1. Migration 005 exists
const m005 = files.find(f => f.includes('_005_'));
check('Migration 005 exists', !!m005);
if (m005) {
  check('005 comes after 004', files.indexOf(m005) > files.indexOf(files.find(f => f.includes('_004_'))));
}

// 2. platform_bootstrap_events table exists
check('platform_bootstrap_events table created', /create table public\.platform_bootstrap_events\b/.test(sqlNoComments));

// 3. private.bootstrap_platform_owner function exists
check('private.bootstrap_platform_owner function created', /create or replace function private\.bootstrap_platform_owner\(p_user_id uuid\)/.test(sqlNoComments));

// 4. Function is SECURITY DEFINER
check('bootstrap_platform_owner is SECURITY DEFINER', /create or replace function private\.bootstrap_platform_owner[\s\S]{0,300}?security definer/i.test(sqlNoComments));

// 5. Function has set search_path = ''
check('bootstrap_platform_owner has set search_path = empty', new RegExp(`create or replace function private\\.bootstrap_platform_owner[\\s\\S]{0,300}?${searchPathEmpty.replace("'", "\\'")}`).test(sqlNoComments));

// 6. Function is revoked from public, anon, authenticated
check('bootstrap_platform_owner revoked from public', /revoke all on function private\.bootstrap_platform_owner\(uuid\) from public, anon, authenticated/i.test(sqlNoComments));

// 7. Function is granted to service_role only
check('bootstrap_platform_owner granted to service_role', /grant execute on function private\.bootstrap_platform_owner\(uuid\) to service_role/i.test(sqlNoComments));

// 8. Function does NOT use auth.uid() (service_role context has null auth.uid())
check('bootstrap_platform_owner does not use auth.uid()', !/private\.bootstrap_platform_owner[\s\S]{0,500}?auth\.uid\(\)/i.test(sqlNoComments));

// 9. Function validates user exists in auth.users
check('bootstrap_platform_owner validates auth.users', /auth\.users[\s\S]{0,200}?id[\s\S]{0,100}?p_user_id/i.test(sqlNoComments) || /p_user_id[\s\S]{0,200}?auth\.users/i.test(sqlNoComments));

// 10. Function validates user exists in platform_users
check('bootstrap_platform_owner validates platform_users', /platform_users[\s\S]{0,200}?p_user_id/i.test(sqlNoComments) || /p_user_id[\s\S]{0,200}?platform_users/i.test(sqlNoComments));

// 11. Function enforces one-time bootstrap (refuses if Platform Owner already exists)
check('bootstrap_platform_owner enforces one-time', /A Platform Owner already exists/i.test(sqlNoComments) || /platform_owner already exists/i.test(sqlNoComments));

// 12. Function assigns platform_owner role
check('bootstrap_platform_owner assigns platform_owner role', /key = 'platform_owner'/i.test(sqlNoComments));

// 13. Function records audit event
check('bootstrap_platform_owner records audit event', /platform_bootstrap_events/i.test(sqlNoComments));

// 14. Function uses advisory lock for concurrency safety
check('bootstrap_platform_owner uses advisory lock', /pg_advisory_xact_lock/i.test(sqlNoComments));

// 15. Function ownership pinned to postgres
check('bootstrap_platform_owner ownership pinned to postgres', /alter function private\.bootstrap_platform_owner\(uuid\) owner to postgres/i.test(sqlNoComments));

// 16. platform_bootstrap_events has RLS enabled
check('platform_bootstrap_events has RLS enabled', /alter table public\.platform_bootstrap_events enable row level security/.test(sqlNoComments));

// 17. platform_bootstrap_events insert blocked for authenticated
check('platform_bootstrap_events INSERT blocked from authenticated', /revoke insert on public\.platform_bootstrap_events from authenticated/i.test(sqlNoComments) || /create policy "platform_bootstrap_events_insert_blocked"/i.test(sqlNoComments));

// 18. platform_bootstrap_events update/delete blocked
check('platform_bootstrap_events UPDATE blocked from authenticated', /create policy "platform_bootstrap_events_update_blocked"/i.test(sqlNoComments));
check('platform_bootstrap_events DELETE blocked from authenticated', /create policy "platform_bootstrap_events_delete_blocked"/i.test(sqlNoComments));

// 19. No hardcoded UUID in migration 005
if (m005) {
  check('Migration 005 has no hardcoded UUID literal', !/['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/i.test(contents[m005]));
}

// 20. No hardcoded password in migration 005
if (m005) {
  check('Migration 005 has no hardcoded password', !/(password\s*=\s*['"])/i.test(contents[m005]));
}

// 21. No ON CONFLICT in bootstrap function (plain INSERT only — no silent reassignment)
if (m005) {
  check('Migration 005 uses plain INSERT (no ON CONFLICT)', !/on conflict/i.test(contents[m005]));
}

// 22. Defense-in-depth: refuses if user already has any membership
if (m005) {
  check('Migration 005 refuses if user already has membership', /already has a platform membership/i.test(contents[m005]));
}

// 23. Function is fail-closed (second attempt fails)
if (m005) {
  check('Migration 005 fails if Platform Owner already exists', /Refusing to re-bootstrap/i.test(contents[m005]));
}

// 24. Audit event is recorded in same transaction
if (m005) {
  check('Migration 005 inserts audit event', /platform_bootstrap_events/i.test(contents[m005]));
}

// 25. Advisory lock for concurrency safety
if (m005) {
  check('Migration 005 uses advisory lock', /pg_advisory_xact_lock/i.test(contents[m005]));
}

// 26. Bootstrap script exists
const bootstrapScript = path.join(SCRIPTS_DIR, 'bootstrap-platform-owner.sql');
check('Bootstrap script exists', fs.existsSync(bootstrapScript));
if (fs.existsSync(bootstrapScript)) {
  const scriptSql = fs.readFileSync(bootstrapScript, 'utf8');
  check('Bootstrap script uses parameterized user_id', /:user_id/.test(scriptSql));
  check('Bootstrap script calls private.bootstrap_platform_owner', /private\.bootstrap_platform_owner/.test(scriptSql));
  check('Bootstrap script has ON_ERROR_STOP', /ON_ERROR_STOP/.test(scriptSql));
  check('Bootstrap script has no hardcoded UUID', !/['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/i.test(scriptSql));
  check('Bootstrap script has no hardcoded password', !/(password\s*=\s*['"])/i.test(scriptSql));
}

// 32. private schema not exposed via PostgREST (config.toml)
const configPath = path.join(BASE, 'config.toml');
if (fs.existsSync(configPath)) {
  const config = fs.readFileSync(configPath, 'utf8');
  check('config.toml does not include private schema in api.schemas', !/schemas\s*=\s*\[[^\]]*\bprivate\b[^\]]*\]/.test(config));
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
