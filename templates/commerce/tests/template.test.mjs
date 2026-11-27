import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyTemplate, parseConfig, sha256, read, listSql } from "../scripts/template-lib.mjs";

test("template manifest matches files and ordering", () => {
  const { errors } = verifyTemplate();
  assert.deepEqual(errors, [], errors.join("\n"));
});

test("every migration and seed is listed exactly once", () => {
  const config = parseConfig();
  const files = new Set([
    ...listSql("migrations").map((f) => `migrations/${f}`),
    ...listSql("seeds").map((f) => `seeds/${f}`)
  ]);

  const listed = [...config.migrations, ...config.seeds].map((entry) => entry.file);
  assert.equal(new Set(listed).size, listed.length, "manifest has duplicate entries");
  assert.deepEqual(new Set(listed), files);
});

test("checksums are stable SHA-256 values", () => {
  const config = parseConfig();
  for (const entry of config.migrations) {
    assert.match(entry.checksum, /^[a-f0-9]{64}$/);
    assert.equal(sha256(read(entry.file)), entry.checksum, entry.file);
  }
});

test("migrations never edit or drop protected platform tables", () => {
  const forbidden = [
    /drop table (if exists )?public\.organizations/i,
    /drop table (if exists )?public\.supabase_connections/i,
    /alter table public\.organizations/i
  ];

  for (const file of listSql("migrations")) {
    const contents = read(`migrations/${file}`);
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(contents), `${file} touches a Platform table`);
    }
  }
});

test("identity model does not create auth users or store passwords", () => {
  const all = [
    ...listSql("migrations").map((file) => read(`migrations/${file}`)),
    ...listSql("seeds").map((file) => read(`seeds/${file}`))
  ].join("\n");

  assert.ok(!/insert into auth\.users/i.test(all));
  assert.ok(!/encrypted_password/i.test(all));
  assert.ok(!/\bpassword\b/i.test(all));
});

test("money columns use integer minor units", () => {
  const all = listSql("migrations").map((f) => read(`migrations/${f}`)).join("\n");
  const numericMoney = [...all.matchAll(/^\s+[a-z_]*paise\s+(numeric|real|double precision|float)/gim)];
  assert.deepEqual(numericMoney, []);
});
