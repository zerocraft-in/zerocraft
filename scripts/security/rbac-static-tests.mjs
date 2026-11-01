import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const expect = (condition, message) => assert.ok(condition, message);

const schema = read("packages/supabase/supabase/migrations/202610200014_granular_studio_permissions.sql");
const policySchema = read("packages/supabase/supabase/migrations/202610200015_rbac_read_write_policies.sql");
const auth = read("apps/cms/lib/commerce-auth.ts");
const navigation = read("apps/cms/lib/admin-navigation.ts");
const shell = read("apps/cms/hooks/use-commerce-access.ts");
const roles = read("apps/cms/app/store/[slug]/settings/users/roles/page.tsx");
const products = read("apps/cms/components/commerce/commerce-store.tsx");
const productTable = read("apps/cms/components/commerce/store-products-data-table.tsx");
const inventory = read("apps/cms/components/commerce/inventory-workspace.tsx");
const catalogApi = read("apps/cms/app/api/store/route.ts");
const inventoryApi = read("apps/cms/app/api/store/inventory/route.ts");
const storeHealth = read("apps/cms/components/commerce/store-overview-dashboard.tsx");
const mediaApi = read("apps/cms/app/api/store/media/route.ts");
const digitalFilesApi = read("apps/cms/app/api/store/digital-files/route.ts");
const customizationApi = read("apps/cms/app/api/store/customization/route.ts");
const userDetailApi = read("apps/cms/app/api/admin/team/[id]/route.ts");

for (const table of ["studio_permissions", "studio_role_permissions", "studio_user_permissions"]) {
  expect(schema.includes(`create table if not exists public.${table}`), `Missing RBAC table: ${table}`);
}
for (const permission of ["dashboard.read", "content.manage", "inventory.manage", "team.manage", "settings.manage", "billing.manage"]) {
  expect(schema.includes(`'${permission}'`), `Missing permission seed: ${permission}`);
}
expect(schema.includes("studio_has_permission"), "Missing permission security function");
expect(schema.includes("studio_permissions_for_current_user"), "Missing current-user permission function");
expect(schema.includes("create policy \"Admins manage user permission overrides\""), "Missing admin override policy");
expect(policySchema.includes("Permission update own notifications"), "Notification self-read policy is missing");
expect(policySchema.includes("Permission manage inventory transfers"), "Inventory transfer policy is missing");

expect(auth.includes("requireCommercePermission"), "Server permission guard is missing");
expect(auth.includes('rpc("has_permission"'), "Server guard does not call the database permission function");
for (const [relative, permission] of [
  ["apps/cms/app/api/admin/team/route.ts", "team.manage"],
  ["apps/cms/app/api/admin/audit-logs/route.ts", "audit.read"],
  ["apps/cms/app/api/admin/automations/health/route.ts", "automations.read"],
  ["apps/cms/app/api/admin/alerts/low-stock/route.ts", "inventory.read"],
  ["apps/cms/app/api/admin/notifications/history/route.ts", "notifications.read"],
  ["apps/cms/app/api/admin/system-health/route.ts", "system_health.read"],
]) {
  const source = read(relative);
  expect(source.includes("requireCommercePermission"), `${relative} is not permission guarded`);
  expect(source.includes(`\"${permission}\"`), `${relative} is missing ${permission} guard`);
}

expect(navigation.includes("getAdminRoutePermission"), "Navigation route permission map is missing");
expect(navigation.includes("getAdminNavigationForRole(") && navigation.includes("permissions?:"), "Navigation does not accept effective permissions");
expect(shell.includes("/api/admin/me"), "Studio shell does not load effective permissions");
expect(shell.includes("router.replace(\"/\")"), "Studio shell does not guard direct unauthorized routes");
expect(roles.includes("/api/admin/team"), "Users roles page is not connected to the user directory API");
expect(roles.includes("Administrator") && roles.includes("Store manager"), "Users roles page is missing system roles");

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
expect(catalogApi.includes("duplicateSkus.has(String(product.sku))") && catalogApi.includes(".map((product) => product.slug)"), "Duplicate SKU health results must map back to product slugs");
expect(mediaApi.includes('requireCommerceStorageClient("catalog.manage")'), "Media write route is missing catalog authorization");
expect(digitalFilesApi.includes('requireCommerceStorageClient("catalog.read")') && digitalFilesApi.includes('requireCommerceStorageClient("catalog.manage")'), "Digital file route is missing catalog authorization");
expect(customizationApi.includes("requireCommercePermission"), "Customization route is missing Studio permission authorization");
expect(userDetailApi.includes('requireCommercePermission("team.read")') && userDetailApi.includes('requireCommercePermission("team.manage")'), "User detail route is missing team authorization");

console.log("RBAC static security tests passed: schema, RLS, API guards, navigation, and admin UI.");
const transition = read("packages/supabase/supabase/migrations/20261101122007_store_only_isolated_projects.sql");
expect(transition.includes("source_hash is distinct from backup_hash"), "Studio removal must verify backup hashes before deletion");
expect(transition.includes("customers.") && !auth.includes("appointments.manage"), "Store-specific permissions must replace Studio capabilities");
expect(!fs.existsSync(path.join(root,"apps/studio")), "Studio application must not remain in the store workspace");

const proxy = read("apps/cms/proxy.ts");
expect(proxy.includes("SECRET_PROTECTED_WORKERS"), "Worker routes must use their bearer-secret boundary");
expect(read("apps/cms/app/api/admin/notifications/reports/worker/route.ts").includes("!validSecrets.includes(provided)"), "Report worker must reject invalid secrets before accessing data");
expect(read("apps/cms/app/api/admin/system-health/worker/route.ts").includes("if (!authorized(request))"), "Health worker must reject invalid secrets before accessing data");
