import assert from "node:assert/strict";

const cmsBaseUrl = (process.env.CMS_BASE_URL || "https://admin.zerocraft.in").replace(/\/$/, "");
const mode = process.env.CMS_SMOKE_MODE || "production";

const checks = [
  { base: cmsBaseUrl, path: "/api/health", method: "GET", expected: [200], label: "CMS readiness API", validate: async (response) => { const payload = await response.json(); assert.equal(payload.ok, true); } },
  { base: cmsBaseUrl, path: "/login", method: "GET", expected: [200], label: "CMS login" },
  { base: cmsBaseUrl, path: "/store", method: "GET", expected: [307, 308], label: "CMS store auth boundary" },
  { base: cmsBaseUrl, path: "/api/store", method: "GET", expected: [401], label: "CMS catalog API auth boundary" },
  { base: cmsBaseUrl, path: "/api/admin/me", method: "GET", expected: [401], label: "Store identity API auth boundary" },
];

for (const check of mode === "artifact" ? checks.slice(0, 2) : checks) {
  const response = await fetch(`${check.base}${check.path}`, { method: check.method, redirect: "manual", headers: { "content-type": "application/json" } });
  assert(check.expected.includes(response.status), `${check.label}: expected ${check.expected.join("/")}, got ${response.status}`);
  await check.validate?.(response);
  console.log(`PASS ${check.label}: ${response.status}`);
}

console.log(`CMS smoke checks passed for ${cmsBaseUrl}.`);
