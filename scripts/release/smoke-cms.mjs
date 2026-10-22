import assert from "node:assert/strict";

const baseUrl = (process.env.CMS_BASE_URL || "https://admin.zerocraft.in").replace(/\/$/, "");
const mode = process.env.CMS_SMOKE_MODE || "production";
const publicChecks = [
  {
    path: "/api/health",
    method: "GET",
    expected: [200],
    label: "public readiness API",
    async validate(response) {
      const payload = await response.json();
      assert.equal(payload.ok, true, "readiness API must report ok");
      assert.equal(payload.service, "zerocraft-cms", "readiness API returned the wrong service");
    },
  },
  { path: "/login", method: "GET", expected: [200], label: "public login" },
];
const protectedChecks = [
  { path: "/", method: "GET", expected: [307, 308], label: "protected dashboard redirect" },
  { path: "/api/studio/me", method: "GET", expected: [401], label: "protected identity API" },
  { path: "/api/studio/team", method: "GET", expected: [401], label: "protected team API" },
  { path: "/api/studio/audit-logs", method: "GET", expected: [401], label: "protected audit API" },
  { path: "/api/studio/system-health", method: "GET", expected: [401], label: "protected health API" },
  { path: "/api/studio/notifications/reports/worker", method: "POST", expected: [401], label: "worker secret boundary" },
];
const checks = mode === "artifact" ? publicChecks : [...publicChecks, ...protectedChecks];

for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.path}`, {
    method: check.method,
    redirect: "manual",
    headers: { "content-type": "application/json" },
  });
  assert(check.expected.includes(response.status), `${check.label}: expected ${check.expected.join("/")}, got ${response.status}`);
  await check.validate?.(response);
  console.log(`PASS ${check.label}: ${response.status}`);
}

console.log(`CMS ${mode} smoke checks passed for ${baseUrl}.`);
