import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { isSafeReturnPath, resolveDomainHost } from "../../lib/domains.ts";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("integration status GET is administrator-only", async () => {
  const source = await read("app/api/studio/integrations/route.ts");
  assert.match(source, /const \{ user, role \} = await actor\(\)/);
  assert.match(source, /status: 401/);
  assert.match(source, /role !== "admin"/);
  assert.match(source, /status: 403/);
  assert.match(source, /encrypted_credentials, \.\.\.entry/);
  assert.doesNotMatch(source, /return Response\.json\(\{[^}]*serviceRoleKey/s);
});

test("credential status endpoints never return plaintext secrets", async () => {
  const supabase = await read("app/api/studio/integrations/supabase-key/route.ts");
  const gemini = await read("app/api/studio/integrations/gemini-key/route.ts");
  const client = await read("components/studio/settings/integrations-manager.tsx");
  for (const source of [supabase, gemini]) {
    assert.match(source, /isSameOrigin\(request\)/);
    assert.match(source, /auth\.getUser\(\)/);
    assert.match(source, /profile\?\.role !== "admin"/);
    assert.doesNotMatch(source, /Response\.json\(\{[^}]*serviceRoleKey/s);
    assert.doesNotMatch(source, /Response\.json\(\{[^}]*apiKey/s);
  }
  assert.doesNotMatch(client, /fetch\("\/api\/studio\/integrations\/(?:gemini-key|supabase-key)"/);
  assert.doesNotMatch(client, /result\.(?:apiKey|serviceRoleKey)/);
});

test("owner access uses the trusted profile role", async () => {
  const middleware = await read("utils/supabase/middleware.ts");
  const client = await read("lib/supabase-client.ts");
  const settings = await read("components/settings-modal.tsx");
  for (const source of [middleware, client]) assert.doesNotMatch(source, /ivd\.maran@gmail\.com/);
  assert.match(middleware, /\["admin", "manager", "staff"\]/);
  assert.match(settings, /ownProfile\?\.role === "admin"/);
});

test("hostname and callback safety contracts remain enforced", async () => {
  assert.equal(resolveDomainHost("zerocraft.in"), "studio");
  assert.equal(resolveDomainHost("store.zerocraft.in"), "store");
  assert.equal(resolveDomainHost("admin.zerocraft.in"), "admin");
  assert.equal(resolveDomainHost("attacker.example"), "unknown");
  assert.equal(resolveDomainHost("store.localhost:3000"), "store");
  assert.equal(isSafeReturnPath("/studio"), "/studio");
  assert.equal(isSafeReturnPath("https://attacker.example"), "/");
  assert.equal(isSafeReturnPath("//attacker.example"), "/");
  const proxy = await read("proxy.ts");
  const callback = await read("app/(cms)/studio/auth/callback/route.ts");
  assert.match(proxy, /ZEROCRAFT_HOSTNAME_ROUTING_ENABLED/);
  assert.match(proxy, /status: 421/);
  assert.match(callback, /isSafeReturnPath/);
});

test("admin navigation remains centralized", async () => {
  const routes = await read("lib/admin-routes.ts");
  const floatingNav = await read("app/(cms)/studio/floating-nav.tsx");
  const shell = await read("app/(cms)/studio/studio-shell.tsx");
  assert.match(routes, /overview:/);
  assert.match(routes, /studio:/);
  assert.match(routes, /store:/);
  assert.match(routes, /operations:/);
  assert.match(routes, /system:/);
  assert.match(floatingNav, /ADMIN_ROUTES/);
  assert.match(shell, /ADMIN_ROUTES/);
});

console.log("Phase 4B security tests passed without network or Supabase access.");
