// Zerocraft Platform — Static test: verify migration ordering and dependencies
// Reads migration SQL files. No database connection.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');
const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

let failures = 0;
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

// 1. Files are sorted by timestamp prefix
const timestamps = files.map(f => f.match(/^(\d{14})_/)[1]);
for (let i = 1; i < timestamps.length; i++) {
  check(`Timestamp ${timestamps[i]} > ${timestamps[i - 1]}`, timestamps[i] > timestamps[i - 1]);
}

// 2. No duplicate timestamps
const dupTs = timestamps.filter((t, i) => timestamps.indexOf(t) !== i);
for (const t of [...new Set(dupTs)]) {
  check(`No duplicate timestamp ${t}`, false);
}
if (dupTs.length === 0) check('No duplicate migration timestamps', true);

// 3. Read all file contents
const contents = {};
for (const f of files) {
  contents[f] = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
}

// 4. Migration 001 must exist and create extensions + private schema
const m001 = files.find(f => f.includes('_001_'));
check('Migration 001 exists', !!m001);
if (m001) {
  const c = contents[m001];
  check('001 creates pgcrypto extension', /create extension if not exists "pgcrypto"/.test(c));
  check('001 creates citext extension', /create extension if not exists "citext"/.test(c));
  check('001 creates private schema', /create schema if not exists private/.test(c));
  check('001 creates platform_users table', /create table public\.platform_users/.test(c));
  check('001 creates user_preferences table', /create table public\.user_preferences/.test(c));
  check('001 does NOT reference organization_members', !/organization_members/.test(c));
}

// 5. Migration 002 must exist and create platform RBAC tables (after 001)
const m002 = files.find(f => f.includes('_002_'));
check('Migration 002 exists', !!m002);
if (m002) {
  const c = contents[m002];
  const m001Idx = files.indexOf(m001);
  const m002Idx = files.indexOf(m002);
  check('002 comes after 001', m002Idx > m001Idx);
  check('002 creates platform_roles', /create table public\.platform_roles/.test(c));
  check('002 creates platform_permissions', /create table public\.platform_permissions/.test(c));
  check('002 creates platform_role_permissions', /create table public\.platform_role_permissions/.test(c));
  check('002 creates platform_members', /create table public\.platform_members/.test(c));
  check('002 seeds platform_permissions', /insert into public\.platform_permissions/.test(c));
  check('002 seeds platform_roles', /insert into public\.platform_roles/.test(c));
  check('002 seeds platform_role_permissions', /insert into public\.platform_role_permissions/.test(c));
}

// 6. Migration 003 must exist and create organization tables (after 002)
const m003 = files.find(f => f.includes('_003_'));
check('Migration 003 exists', !!m003);
if (m003) {
  const c = contents[m003];
  const m002Idx = files.indexOf(m002);
  const m003Idx = files.indexOf(m003);
  check('003 comes after 002', m003Idx > m002Idx);
  check('003 creates organizations', /create table public\.organizations/.test(c));
  check('003 creates organization_roles', /create table public\.organization_roles/.test(c));
  check('003 creates organization_permissions', /create table public\.organization_permissions/.test(c));
  check('003 creates organization_role_permissions', /create table public\.organization_role_permissions/.test(c));
  check('003 does NOT create organization_members', !/create table public\.organization_members/.test(c));
  check('003 does NOT create organization_invitations', !/create table public\.organization_invitations/.test(c));
  check('003 defines current_org_ids helper', /create or replace function private\.current_org_ids/.test(c));
  check('003 defines is_org_owner helper', /create or replace function private\.is_org_owner/.test(c));
}

// 7. Migration 004 must exist and create organization_members/invitations (after 003)
const m004 = files.find(f => f.includes('_004_'));
check('Migration 004 exists', !!m004);
if (m004) {
  const c = contents[m004];
  const m003Idx = files.indexOf(m003);
  const m004Idx = files.indexOf(m004);
  check('004 comes after 003', m004Idx > m003Idx);
  check('004 creates organization_members', /create table public\.organization_members/.test(c));
  check('004 creates organization_invitations', /create table public\.organization_invitations/.test(c));
  check('004 defines create_organization RPC', /create or replace function private\.create_organization/.test(c));
  check('004 defines invite_member RPC', /create or replace function private\.invite_member/.test(c));
  check('004 defines accept_invitation RPC', /create or replace function private\.accept_invitation/.test(c));
  check('004 defines change_member_role RPC', /create or replace function private\.change_member_role/.test(c));
  check('004 does NOT redeclare organization_roles', !/create table public\.organization_roles/.test(c));
  check('004 does NOT redeclare organization_permissions', !/create table public\.organization_permissions/.test(c));
}

// 8. Forward reference safety: 001 helpers that reference 002 tables have forward-ref comments
if (m001) {
  const c = contents[m001];
  check('001 platform_member_id references platform_members (forward ref to 002)', /platform_members/.test(c) && /migration 002/.test(c));
  check('001 has_platform_permission references platform_members (forward ref to 002)', /platform_members/.test(c) && /migration 002/.test(c));
}

// 9. Every create table has RLS enabled
const allSql = Object.values(contents).join('\n');
const allTables = [];
for (const f of files) {
  const tableMatches = contents[f].match(/create table (?:public\.)?(\w+)/g) || [];
  for (const m of tableMatches) {
    allTables.push(m.match(/create table (?:public\.)?(\w+)/i)[1]);
  }
}
for (const t of allTables) {
  const rlsPattern = new RegExp(`alter table public\\.${t} enable row level security`);
  check(`Table "${t}" has RLS enabled`, rlsPattern.test(allSql), `missing: alter table public.${t} enable row level security`);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
