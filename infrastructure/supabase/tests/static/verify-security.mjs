// Zerocraft Platform — Static test: verify security configuration
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

let failures = 0;
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

// 1. No auth.users duplication (no table that copies auth.users credentials)
check('No create table duplicating auth.users credentials', !/(create table public\.\w+[\s\S]{0,100}?email[\s\S]{0,100}?password)/i.test(allSql));

// 2. platform_users references auth.users (FK), does not duplicate it
check('platform_users FK references auth.users', /platform_users[\s\S]{0,200}?references auth\.users\(id\)/i.test(allSql));

// 3. No hardcoded UUIDs or passwords in migrations
check('No hardcoded password in migrations', !/(password\s*=\s*['"])/i.test(allSql));
check('No hardcoded UUID literal in migrations', !/['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/i.test(allSql));

// 4. Invitation tokens stored as hash only
check('organization_invitations has token_hash column', /organization_invitations[\s\S]{0,200}?token_hash/i.test(allSql));
check('token_hash described as hashed', /token_hash.*never stored in plaintext/i.test(allSql) || /Hashed invitation token/i.test(allSql));

// 5. create_organization always assigns owner role (no arbitrary role parameter)
check('create_organization assigns owner role only', /where key = 'owner' and is_system = true/.test(allSql));
check('create_organization has no p_role_key parameter', !/create or replace function private\.create_organization\([\s\S]{0,100}?p_role_key/.test(allSql));

// 6. change_member_role rejects owner as new role
check('change_member_role rejects p_new_role_key = owner', /if p_new_role_key = 'owner' then/.test(allSql));

// 7. change_member_role protects existing Owner
check('change_member_role rejects changing Owner role', /if v_current_role_key = 'owner' then/.test(allSql));

// 8. invite_member rejects owner assignment
check('invite_member rejects p_role_key = owner', /if p_role_key = 'owner' then/.test(allSql));

// 9. Platform RBAC tables separate from organization RBAC tables
const platformTables = ['platform_roles', 'platform_permissions', 'platform_role_permissions', 'platform_members', 'platform_users'];
const orgTables = ['organization_roles', 'organization_permissions', 'organization_role_permissions', 'organization_members', 'organization_invitations', 'organizations'];
for (const t of [...platformTables, ...orgTables]) {
  check(`Table "${t}" exists in migrations`, new RegExp(`create table public\\.${t}`).test(allSql));
}

// 10. No cross-reference between platform_roles and organization_roles in FKs
check('platform_role_permissions FK references platform_roles (not organization_roles)', /platform_role_permissions[\s\S]{0,200}?references public\.platform_roles\(id\)/.test(allSql));
check('organization_role_permissions FK references organization_roles (not platform_roles)', /organization_role_permissions[\s\S]{0,200}?references public\.organization_roles\(id\)/.test(allSql));

// 11. All security-definer functions revoked from public/anon
const secDefCount = (allSql.match(/security definer/gi) || []).length;
const revokeSecDef = (allSql.match(/revoke all on function .* from public, anon/gi) || []).length;
check(`All ${secDefCount} SECURITY DEFINER functions revoked from public/anon`, revokeSecDef >= secDefCount, `revoked ${revokeSecDef}/${secDefCount}`);

// 12. No exposed private schema functions as public RPCs (public functions are only wrappers)
const publicFuncs = allSql.match(/create or replace function public\.(\w+)\(/g) || [];
const expectedPublicWrappers = ['updated_at_trigger', 'create_organization', 'accept_invitation', 'invite_member', 'change_member_role', 'protect_organization_members_identity', 'protect_organization_invitations_immutable'];
for (const m of publicFuncs) {
  const name = m.match(/function public\.(\w+)\(/)[1];
  check(`Public function "${name}" is a known wrapper or trigger`, expectedPublicWrappers.includes(name) || name === 'updated_at_trigger', `unexpected public function: ${name}`);
}

// 13. No commerce table names in platform migrations
const commerceTables = ['products', 'variants', 'categories', 'customers', 'orders', 'order_items', 'payments', 'shipments', 'inventory_items', 'sales_channels', 'taxonomy_roots', 'media', 'collections', 'discounts', 'gift_cards'];
for (const t of commerceTables) {
  check(`No commerce table "${t}" in platform migrations`, !new RegExp(`create table public\\.${t}\\b`).test(allSql));
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
