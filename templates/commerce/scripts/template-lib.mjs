/**
 * Shared helpers for the Commerce Template static verifier.
 *
 * These checks are intentionally dependency-free so they can run in CI with
 * plain Node and without a database.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "..");

export function read(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

export function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function listSql(directory) {
  return readdirSync(join(ROOT, directory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

export function parseConfig() {
  return JSON.parse(read("template.config.json"));
}

const REQUIRED_TABLES = [
  "stores",
  "tenant_context",
  "commerce_template_migrations",
  "roles",
  "permissions",
  "role_permissions",
  "tenant_members",
  "tenant_member_stores",
  "tenant_settings",
  "product_public_id_registry",
  "products",
  "variants",
  "product_options",
  "product_option_values",
  "variant_option_values",
  "media",
  "product_images",
  "product_image_variants",
  "media_references",
  "collections",
  "collection_products",
  "metafields",
  "taxonomy_root_selections",
  "taxonomy_pin",
  "locations",
  "inventory_items",
  "inventory_levels",
  "inventory_movements",
  "customers",
  "customer_addresses",
  "store_counters",
  "orders",
  "order_line_items",
  "order_addresses",
  "order_adjustments",
  "order_events",
  "payments",
  "refunds",
  "payment_events",
  "shipping_profiles",
  "shipping_zones",
  "shipping_rates",
  "fulfillments",
  "fulfillment_line_items",
  "sales_channels",
  "product_publications",
  "pos_devices",
  "pos_register_sessions",
  "pos_cash_movements",
  "pos_settings",
  "audit_logs",
  "webhook_endpoints",
  "webhook_deliveries",
  "outbox_events"
];

const REQUIRED_FUNCTIONS = [
  "initialize_tenant",
  "adjust_inventory",
  "close_pos_session",
  "resolve_taxonomy_category",
  "commerce_template_health"
];

const FORBIDDEN_PATTERNS = [
  { pattern: /\bdrop\s+database\b/i, label: "DROP DATABASE" },
  { pattern: /\bdrop\s+schema\s+public\b/i, label: "DROP SCHEMA public" },
  { pattern: /\btruncate\s+table\b/i, label: "TRUNCATE TABLE" },
  { pattern: /\bsupabase_service_role_key\b/i, label: "service role key literal" },
  { pattern: /\bpostgres(?:ql)?:\/\/[^\s'"]+:[^\s'"]+@/i, label: "database URL with password" },
  { pattern: /\bsk_live_[A-Za-z0-9]+/i, label: "live secret key" },
  { pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, label: "JWT literal" }
];

export function collectSql() {
  return [
    ...listSql("migrations").map((file) => `migrations/${file}`),
    ...listSql("seeds").map((file) => `seeds/${file}`),
    ...listSql("tests").map((file) => `tests/${file}`)
  ];
}

export function verifyTemplate() {
  const errors = [];
  const warnings = [];
  const config = parseConfig();

  // 1. Manifest integrity.
  const manifest = [...config.migrations, ...config.seeds, ...config.verification];
  for (const entry of manifest) {
    const contents = read(entry.file);
    const checksum = sha256(contents);
    if (checksum !== entry.checksum) {
      errors.push(`checksum mismatch for ${entry.file}`);
    }
  }

  // 2. Deterministic, gap-free migration order.
  const migrations = config.migrations;
  migrations.forEach((entry, index) => {
    const expected = String(index + 1).padStart(3, "0");
    if (!entry.file.includes(`${expected}_`)) {
      errors.push(`migration ${entry.file} is out of order; expected prefix ${expected}_`);
    }
  });

  // 3. Required schema objects are created somewhere.
  const allSql = collectSql()
    .map((file) => read(file))
    .join("\n");

  for (const table of REQUIRED_TABLES) {
    if (!new RegExp(`create table if not exists public\\.${table}\\b`, "i").test(allSql)) {
      errors.push(`missing table definition: public.${table}`);
    }
  }

  for (const fn of REQUIRED_FUNCTIONS) {
    if (!new RegExp(`create or replace function public\\.${fn}\\b`, "i").test(allSql)) {
      errors.push(`missing function: public.${fn}`);
    }
  }

  // 4. RLS must be enabled for every table created by the template.
  const createdTables = [...allSql.matchAll(/create table if not exists public\.([a-z0-9_]+)/gi)]
    .map((match) => match[1]);
  const rlsBlock = read("migrations/015_rls_and_security.sql");
  for (const table of new Set(createdTables)) {
    const explicitlyEnabled = new RegExp(
      `alter table public\\.${table} enable row level security`,
      "i"
    ).test(rlsBlock);
    const viaLoop = /for r in\s+select \* from \(values/i.test(rlsBlock);
    if (!explicitlyEnabled && !viaLoop) {
      errors.push(`RLS not enabled for public.${table}`);
    }
  }

  // 5. Every table in the policy loop must be listed.
  const policyLoop = rlsBlock.slice(
    rlsBlock.indexOf("for r in"),
    rlsBlock.indexOf("loop")
  );
  for (const table of new Set(createdTables)) {
    const exempt = [
      "tenant_context", "stores", "tenant_settings", "tenant_members",
      "tenant_member_stores", "roles", "permissions", "role_permissions",
      "taxonomy_root_selections", "taxonomy_pin", "audit_logs",
      "store_counters", "outbox_events",
      "commerce_template_migrations", "product_public_id_registry"
    ];
    if (!exempt.includes(table) && !policyLoop.includes(`('${table}'`)) {
      errors.push(`table public.${table} is not covered by store-scoped policies`);
    }
  }

  // 6. Ledgers must have no client write grants.
  for (const ledger of [
    "audit_logs", "inventory_movements", "payment_events",
    "pos_cash_movements", "webhook_deliveries"
  ]) {
    if (!new RegExp(`revoke insert, update, delete on public\\.${ledger} from authenticated`, "i").test(rlsBlock)) {
      errors.push(`ledger public.${ledger} still grants client writes`);
    }
  }

  // 7. Forbidden destructive/secret patterns.
  for (const file of collectSql()) {
    const contents = read(file);
    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.pattern.test(contents)) {
        errors.push(`${rule.label} found in ${file}`);
      }
    }
  }

  // 8. Idempotency markers.
  for (const file of listSql("migrations")) {
    const contents = read(`migrations/${file}`);
    if (!/create table if not exists/i.test(contents) && !/create or replace/i.test(contents)) {
      warnings.push(`migrations/${file} has no idempotency marker`);
    }
    if (!/begin;/i.test(contents) || !/commit;/i.test(contents)) {
      errors.push(`migrations/${file} is not wrapped in a transaction`);
    }
  }

  for (const file of listSql("seeds")) {
    const contents = read(`seeds/${file}`);
    if (!/on conflict/i.test(contents) && !/create or replace/i.test(contents)) {
      warnings.push(`seeds/${file} may not be idempotent`);
    }
  }

  // 9. Protected Platform project refs must be listed for the installer.
  for (const ref of ["ftcvyhlzeyqceosdqyxn", "qvjhwxriafgobxknpqtq"]) {
    if (!config.protectedProjects.includes(ref)) {
      errors.push(`protected project ${ref} missing from template.config.json`);
    }
  }

  return { errors, warnings, config, tableCount: new Set(createdTables).size };
}
