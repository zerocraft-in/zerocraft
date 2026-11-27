#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";

const gunzip = promisify(zlib.gunzip);
const defaultFile = path.resolve("supabase", "taxonomy", "categories.en.json.gz");
const sourceFile = path.resolve(process.argv[2] ?? defaultFile);
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before importing.",
  );
}

const source = JSON.parse(
  (await gunzip(await fs.readFile(sourceFile))).toString("utf8"),
);

if (!source || typeof source !== "object" || typeof source.version !== "string" || !Array.isArray(source.verticals)) {
  throw new Error("Invalid Shopify taxonomy envelope: expected version and verticals.");
}

const categories = source.verticals.flatMap((vertical) => {
  if (!vertical || !Array.isArray(vertical.categories)) {
    throw new Error("Invalid Shopify taxonomy vertical: categories must be an array.");
  }
  return vertical.categories;
});

const required = ["id", "level", "name", "full_name", "parent_id"];
const byId = new Map();
const invalid = [];

for (const category of categories) {
  if (!category || typeof category !== "object") {
    invalid.push("non-object category");
    continue;
  }
  const missing = required.filter((field) => !(field in category));
  if (missing.length > 0) {
    invalid.push(`${String(category.id ?? "unknown")}: missing ${missing.join(", ")}`);
    continue;
  }
  if (typeof category.id !== "string" || typeof category.name !== "string" ||
      typeof category.full_name !== "string" || typeof category.level !== "number" ||
      (category.parent_id !== null && typeof category.parent_id !== "string")) {
    invalid.push(`${String(category.id ?? "unknown")}: invalid field types`);
    continue;
  }
  if (byId.has(category.id)) {
    invalid.push(`${category.id}: duplicate official ID`);
    continue;
  }
  byId.set(category.id, category);
}

if (invalid.length > 0) {
  throw new Error(`Taxonomy validation failed with ${invalid.length} issue(s):\n${invalid.slice(0, 20).join("\n")}`);
}

for (const category of byId.values()) {
  if (category.parent_id !== null && !byId.has(category.parent_id)) {
    invalid.push(`${category.id}: missing parent ${category.parent_id}`);
  }
}
if (invalid.length > 0) {
  throw new Error(`Taxonomy parent validation failed:\n${invalid.slice(0, 20).join("\n")}`);
}

const pathState = new Map();
const fullPathById = new Map();
function buildFullPath(id) {
  if (pathState.get(id) === "visiting") {
    throw new Error(`Taxonomy cycle detected at ${id}`);
  }
  if (pathState.get(id) === "done") return fullPathById.get(id);

  pathState.set(id, "visiting");
  const category = byId.get(id);
  const parentPath = category.parent_id ? buildFullPath(category.parent_id) : "";
  const fullPath = parentPath ? `${parentPath} > ${category.name}` : category.name;
  pathState.set(id, "done");
  fullPathById.set(id, fullPath);
  return fullPath;
}

for (const id of byId.keys()) buildFullPath(id);

const rows = [...byId.values()].map((category) => ({
  shopify_category_id: category.id,
  name: category.name.trim(),
  parent_shopify_category_id: category.parent_id,
  full_name: fullPathById.get(category.id),
  level: category.level,
  is_leaf: !Array.isArray(category.children) || category.children.length === 0,
  taxonomy_version: source.version,
  attributes: Array.isArray(category.attributes) ? category.attributes : [],
}));

const apiBase = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

async function api(pathname, init = {}) {
  const response = await fetch(`${apiBase}${pathname}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase REST ${response.status}: ${body.slice(0, 1000)}`);
  }
  return response;
}

const existingIds = new Set();
for (let offset = 0; ; offset += 1000) {
  const response = await api(
    `/shopify_product_categories?select=shopify_category_id&limit=1000&offset=${offset}`,
  );
  const page = await response.json();
  for (const row of page) existingIds.add(row.shopify_category_id);
  if (page.length < 1000) break;
}

let imported = 0;
let updated = 0;
let failed = 0;
for (let offset = 0; offset < rows.length; offset += 500) {
  const chunk = rows.slice(offset, offset + 500);
  try {
    await api("/shopify_product_categories?on_conflict=shopify_category_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(chunk),
    });
    for (const row of chunk) {
      if (existingIds.has(row.shopify_category_id)) updated += 1;
      else imported += 1;
    }
  } catch (error) {
    failed += chunk.length;
    console.error(`Failed chunk ${offset}-${offset + chunk.length - 1}:`, error);
  }
}

console.log(JSON.stringify({
  taxonomy_version: source.version,
  source_file: sourceFile,
  source_categories: categories.length,
  valid_categories: rows.length,
  imported,
  updated,
  skipped: invalid.length,
  failed,
  hierarchy_validation: "passed",
}, null, 2));

if (failed > 0) process.exitCode = 1;
