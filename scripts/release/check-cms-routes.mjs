import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const appPath = (app, relativePath) => join(root, "apps", app, relativePath);

const contracts = {
  cms: [
    ["/", "app/page.tsx"], ["/login", "app/login/page.tsx"],
    ["/store", "app/store/page.tsx"], ["/store/[slug]", "app/store/[slug]/page.tsx"],
    ...["products", "categories", "orders", "inventory", "content", "media", "analytics", "settings", "bin"]
      .map(section => [`/store/[slug]/${section}`, `app/store/[slug]/${section}/page.tsx`]),
    ["/store/[slug]/media/library", "app/store/[slug]/media/library/page.tsx"],
    ...["metaobjects", "files", "menus", "articles"].map(section => [`/store/[slug]/content/${section}`, `app/store/[slug]/content/${section}/page.tsx`]),
    ["/api/store/content/[kind]", "app/api/store/content/[kind]/route.ts"],
    ["/store/[slug]/settings/users", "app/store/[slug]/settings/users/page.tsx"],
    ["/store/[slug]/settings/users/new", "app/store/[slug]/settings/users/new/page.tsx"],
    ["/store/[slug]/settings/users/[id]", "app/store/[slug]/settings/users/[id]/page.tsx"],
    ["/store/[slug]/settings/users/roles", "app/store/[slug]/settings/users/roles/page.tsx"],
    ["/store/[slug]/settings/users/security", "app/store/[slug]/settings/users/security/page.tsx"],
    ["/api/admin/me", "app/api/admin/me/route.ts"], ["/api/admin/team", "app/api/admin/team/route.ts"],
    ["/api/health", "app/api/health/route.ts"], ["/api/store", "app/api/store/route.ts"],
    ["/api/store/media", "app/api/store/media/route.ts"], ["/api/store/digital-files", "app/api/store/digital-files/route.ts"],
    ["/api/store/customization", "app/api/store/customization/route.ts"],
  ],

};

for (const [app, routes] of Object.entries(contracts)) {
  for (const [route, relativePath] of routes) {
    assert(existsSync(appPath(app, relativePath)), `${app} ${route}: missing ${relativePath}`);
    console.log(`PASS ${app} ${route}`);
  }
}

const cmsRoutes = readFileSync(appPath("cms", "proxy.ts"), "utf8");
assert(cmsRoutes.includes("/store") && cmsRoutes.includes("/api/store") && cmsRoutes.includes("/api/admin"), "CMS proxy is missing protected admin paths");

for (const staleRoute of ["/system-health", "/audit-logs", "/automations", "/integrations", "/growth", "/search-console", "/team"]) {
  for (const app of ["cms"]) {
    const files = ["lib/admin-navigation.ts", "lib/admin-routes.ts"].map((file) => appPath(app, file));
    for (const file of files) if (existsSync(file)) assert(!readFileSync(file, "utf8").includes(`href: "${staleRoute}"`), `${app} exposes removed route ${staleRoute}`);
  }
}

console.log("CMS/Store route contract checks passed.");
