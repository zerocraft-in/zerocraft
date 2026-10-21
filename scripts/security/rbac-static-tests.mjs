import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const expect = (condition, message) => assert.ok(condition, message);

const schema = read("packages/supabase/supabase/migrations/202610200014_granular_studio_permissions.sql");
const policySchema = read("packages/supabase/supabase/migrations/202610200015_rbac_read_write_policies.sql");
const auth = read("apps/cms/lib/studio-auth.ts");
const navigation = read("apps/cms/lib/admin-navigation.ts");
const shell = read("apps/cms/app/studio-shell.tsx");
const team = read("apps/cms/app/team/page.tsx");
const products = read("apps/cms/components/studio/studio-store.tsx");
const productTable = read("apps/cms/components/studio/store-products-data-table.tsx");
const inventory = read("apps/cms/components/studio/inventory-workspace.tsx");
const catalogApi = read("apps/cms/app/api/studio/store/route.ts");
const inventoryApi = read("apps/cms/app/api/studio/store/inventory/route.ts");
const storeHealth = read("apps/cms/components/studio/studio-store.tsx");
const systemHealth = read("apps/cms/app/system-health/page.tsx");

for (const table of ["studio_permissions", "studio_role_permissions", "studio_user_permissions"]) {
  expect(schema.includes(`create table if not exists public.${table}`), `Missing RBAC table: ${table}`);
}
for (const permission of ["dashboard.read", "content.manage", "inventory.manage", "team.manage", "settings.manage", "billing.manage"]) {
  expect(schema.includes(`'${permission}'`), `Missing permission seed: ${permission}`);
}
expect(schema.includes("studio_has_permission"), "Missing permission security function");
expect(schema.includes("studio_permissions_for_current_user"), "Missing current-user permission function");
expect(schema.includes("create policy \"Admins manage user permission overrides\""), "Missing admin override policy");
expect(policySchema.includes("Permission read clients"), "Clients read policy is missing");
expect(policySchema.includes("Permission write clients"), "Clients write policy is missing");
expect(policySchema.includes("Permission read appointments"), "Appointments read policy is missing");
expect(policySchema.includes("Permission update own notifications"), "Notification self-read policy is missing");
expect(policySchema.includes("Permission manage inventory transfers"), "Inventory transfer policy is missing");

expect(auth.includes("requireStudioPermission"), "Server permission guard is missing");
expect(auth.includes("studio_has_permission"), "Server guard does not call the database permission function");
for (const [relative, permission] of [
  ["apps/cms/app/api/studio/team/route.ts", "team.manage"],
  ["apps/cms/app/api/studio/audit-logs/route.ts", "audit.read"],
  ["apps/cms/app/api/studio/automations/health/route.ts", "automations.read"],
  ["apps/cms/app/api/studio/alerts/low-stock/route.ts", "inventory.read"],
  ["apps/cms/app/api/studio/notifications/history/route.ts", "notifications.read"],
  ["apps/cms/app/api/studio/system-health/route.ts", "system_health.read"],
]) {
  const source = read(relative);
  expect(source.includes("requireStudioPermission"), `${relative} is not permission guarded`);
  expect(source.includes(`\"${permission}\"`), `${relative} is missing ${permission} guard`);
}

expect(navigation.includes("getAdminRoutePermission"), "Navigation route permission map is missing");
expect(navigation.includes("getAdminNavigationForRole(role: string, permissions?"), "Navigation does not accept effective permissions");
expect(shell.includes("/api/studio/me"), "Studio shell does not load effective permissions");
expect(shell.includes("router.replace(\"/\")"), "Studio shell does not guard direct unauthorized routes");
expect(team.includes("/api/studio/team/permissions"), "Team permission editor API is not connected");
expect(team.includes("Reset to role defaults"), "Team permission reset action is missing");
expect(read("apps/cms/app/system-health/page.tsx").includes("Run diagnostics"), "System Health diagnostics UI is missing");

for (const permission of ["catalog.read", "catalog.manage"]) {
  expect(catalogApi.includes(`\"${permission}\"`), `Catalog API is missing ${permission} guard`);
}
for (const permission of ["inventory.read", "inventory.manage"]) {
  expect(inventoryApi.includes(`\"${permission}\"`), `Inventory API is missing ${permission} guard`);
}
expect(products.includes("canManageCatalog"), "Catalog workspace does not derive the manage permission");
expect(products.includes("catalog.manage"), "Catalog workspace does not load catalog.manage");
expect(productTable.includes("if (!meta.canManageCatalog) return null"), "Product row actions are not hidden for read-only users");
expect(inventory.includes("canManageInventory"), "Inventory workspace does not derive the manage permission");
expect(inventory.includes("inventory.manage"), "Inventory workspace does not load inventory.manage");
expect(inventory.includes("View stock locations and their current status."), "Inventory read-only location state is missing");
expect(storeHealth.includes("qualityScore"), "Catalog quality score is missing");
expect(storeHealth.includes("openHealthFilter"), "Catalog readiness drill-down is missing");
expect(catalogApi.includes("validateProductIdentity"), "Duplicate product identity validation is missing");
expect(systemHealth.includes("Retry"), "System health failure retry action is missing");
expect(systemHealth.includes("Resolve"), "System health failure resolve action is missing");

console.log("RBAC static security tests passed: schema, RLS, API guards, navigation, and admin UI.");
