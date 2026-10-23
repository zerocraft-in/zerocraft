import assert from "node:assert/strict";

const bases = {
  studio: process.env.STUDIO_BASE_URL || "https://zerocraft.in",
  www: process.env.WWW_BASE_URL || "https://www.zerocraft.in",
  admin: process.env.CMS_BASE_URL || "https://admin.zerocraft.in",
  store: process.env.STORE_BASE_URL || "https://store.zerocraft.in",
};

async function check(name, url, expectedStatus, pattern) {
  const response = await fetch(url, { redirect: "manual", headers: { "user-agent": "zerocraft-public-smoke/1.0" } });
  assert.equal(response.status, expectedStatus, `${name}: expected ${expectedStatus}, got ${response.status}`);
  const body = await response.text();
  if (pattern) assert.match(body, pattern, `${name}: expected content marker was not found`);
  console.log(`PASS ${name}: ${response.status}`);
}

await check("studio root", `${bases.studio}/`, 200, /Ideas made bold/i);
await check("studio www alias", `${bases.www}/`, 200, /Ideas made bold/i);
await check("store home", `${bases.store}/`, 200, /ZEROCRAFT|South Indian/i);
await check("cms readiness", `${bases.admin}/api/health`, 200, /zerocraft-cms/i);
await check("cms protected dashboard", `${bases.admin}/`, 307);
await check("cms worker secret boundary", `${bases.admin}/api/studio/notifications/reports/worker`, 401);

console.log("Public domain smoke checks passed.");
