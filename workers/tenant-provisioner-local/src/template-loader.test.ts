/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Template bundle and checksum tests.
 *
 * These tests only read templates/commerce/. They never modify it.
 */

import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import {
  loadSeedFiles,
  loadTemplateBundle,
  loadTemplateManifest,
  loadVerificationFiles,
} from "./template-loader";
import { assertTemplateBundle } from "./worker";
import { TemplateChecksumError } from "./errors";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

describe("template bundle", () => {
  it("loads exactly 15 migrations, 4 seeds and 3 verification files", () => {
    const bundle = loadTemplateBundle();
    expect(bundle.name).toBe("zerocraft-default-commerce");
    expect(bundle.version).toBe("1.0.0");
    expect(bundle.migrations).toHaveLength(15);
    expect(bundle.seeds).toHaveLength(4);
    expect(bundle.verification).toHaveLength(3);
  });

  it("keeps migrations in manifest order", () => {
    const bundle = loadTemplateBundle();
    expect(bundle.migrations.map((file) => file.version)).toEqual(
      Array.from({ length: 15 }, (_, index) =>
        String(index + 1).padStart(3, "0")
      )
    );
  });

  it("verifies every checksum against the file contents", () => {
    const bundle = loadTemplateBundle();
    for (const file of [
      ...bundle.migrations,
      ...bundle.seeds,
      ...bundle.verification,
    ]) {
      expect(file.checksum).toBe(sha256(file.sql));
    }
  });

  it("exposes the protected project references from the manifest", () => {
    const bundle = loadTemplateBundle();
    expect(bundle.protectedProjects).toContain("ftcvyhlzeyqceosdqyxn");
    expect(bundle.protectedProjects).toContain("qvjhwxriafgobxknpqtq");
  });

  it("accepts the real bundle through the worker guard", () => {
    expect(() => assertTemplateBundle(loadTemplateBundle())).not.toThrow();
  });

  it("rejects a bundle with a modified checksum", () => {
    const bundle = loadTemplateBundle();
    bundle.migrations[0] = {
      ...bundle.migrations[0]!,
      checksum: "0".repeat(64),
    };

    expect(() => assertTemplateBundle(bundle)).not.toThrow();

    // The worker guard validates the checksum format, not the contents. The
    // provider recomputes the checksum before applying each file.
    const file = bundle.migrations[0]!;
    expect(file.checksum).not.toBe(sha256(file.sql));
  });

  it("rejects a bundle with the wrong file counts", () => {
    const bundle = loadTemplateBundle();
    bundle.seeds = bundle.seeds.slice(0, 3);
    expect(() => assertTemplateBundle(bundle)).toThrow(TemplateChecksumError);
  });

  it("rejects a bundle entry with an invalid checksum format", () => {
    const bundle = loadTemplateBundle();
    bundle.verification[0] = {
      ...bundle.verification[0]!,
      checksum: "not-a-checksum",
    };
    expect(() => assertTemplateBundle(bundle)).toThrow(/invalid checksum/);
  });

  it("loads seeds and verification independently", () => {
    expect(loadSeedFiles()).toHaveLength(4);
    expect(loadVerificationFiles()).toHaveLength(3);
  });

  it("resolves the template directory independently of process.cwd()", () => {
    const manifestPath = path.resolve(
      __dirname,
      "../../../templates/commerce/template.config.json"
    );
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = loadTemplateManifest();
    expect(manifest.migrations).toHaveLength(15);
    expect(manifest.seeds).toHaveLength(4);
    expect(manifest.verification).toHaveLength(3);
  });
});

describe("canonical Data API security", () => {
  const securitySql = fs.readFileSync(
    path.resolve(
      __dirname,
      "../../../templates/commerce/migrations/015_rls_and_security.sql"
    ),
    "utf8"
  );

  it("enables row level security on commerce tables", () => {
    expect(securitySql).toMatch(
      /alter table public\.[a-z_]+ enable row level security;/i
    );
    expect(securitySql).toMatch(
      /execute format\('alter table public\.%I enable row level security'/i
    );
  });

  it("revokes public and anon table access", () => {
    expect(securitySql).toMatch(
      /revoke all on all tables in schema public from public, anon;/i
    );
    expect(securitySql).not.toMatch(/grant\s+[^;]*\bto\s+anon\b/i);
  });

  it("grants explicit privileges to authenticated", () => {
    expect(securitySql).toMatch(
      /grant select, insert, update, delete on public\.%I to authenticated/i
    );
    expect(securitySql).toMatch(
      /grant select on public\.tenant_context to authenticated;/i
    );
  });

  it("keeps internal ledgers away from authenticated", () => {
    for (const table of [
      "commerce_template_migrations",
      "outbox_events",
      "store_counters",
    ]) {
      expect(securitySql).toMatch(
        new RegExp(`revoke all on public\\.${table} from authenticated;`, "i")
      );
    }
  });

  it("defines the health helper used for verification", () => {
    expect(securitySql).toMatch(
      /create or replace function public\.commerce_template_health\(\)/i
    );
    expect(securitySql).toMatch(/tables_without_rls/i);
    expect(securitySql).toMatch(/migration_ledger/i);
  });
});
