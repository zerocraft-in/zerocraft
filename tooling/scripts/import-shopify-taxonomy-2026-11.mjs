#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const directory = path.resolve(process.argv[2] ?? "infrastructure/supabase/taxonomy/import");
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

const readJson = async (name) => JSON.parse(await fs.readFile(path.join(directory, name), "utf8"));
const [categoriesSource, attributesSource, reasonsSource] = await Promise.all([
  readJson("categories.en.json"),
  readJson("attributes.en.json"),
  readJson("return_reasons.en.json"),
]);

const version = categoriesSource?.version;
if (version !== "2026-11" || attributesSource?.version !== version || reasonsSource?.version !== version) {
  throw new Error("All three Shopify source files must use the same pinned version 2026-11.");
}
if (!Array.isArray(categoriesSource.verticals) || !Array.isArray(attributesSource.attributes) ||
    !Array.isArray(reasonsSource.return_reasons)) {
  throw new Error("Invalid Shopify taxonomy source envelope.");
}

const base = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

const storageBucket = "shopify-taxonomy";
const storageObjects = {
  "categories.en.json.gz": "categories.en.json.gz",
  "attributes.en.json.gz": "attributes.en.json.gz",
  "return_reasons.en.json.gz": "return_reasons.en.json.gz",
};

async function uploadSourceJsonAssets() {
  for (const [fileName, objectName] of Object.entries(storageObjects)) {
    const filePath = path.join(directory, fileName);
    const body = await fs.readFile(filePath);
    const response = await fetch(
      `${supabaseUrl.replace(/\\/$/, "")}/storage/v1/object/${storageBucket}/${version}/${objectName}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/gzip",
          "x-upsert": "true",
        },
        body,
      },
    );
    if (!response.ok) {
      throw new Error(`Supabase Storage upload failed for ${fileName}: ${response.status} ${(await response.text()).slice(0, 1000)}`);
    }
    console.log(`Uploaded shared taxonomy JSON: ${version}/${objectName} (${body.length} bytes)`);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(table, init = {}, query = "") {
  const url = `${base}/${table}${query ? `?${query}` : ""}`;
  let lastError;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...headers, ...(init.headers ?? {}) },
      });
      if (response.ok) return response;
      const body = (await response.text()).slice(0, 1200);
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`Supabase REST ${response.status} on ${table}: ${body}`);
      }
      lastError = new Error(`Supabase REST ${response.status} on ${table}: ${body}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(Math.min(15000, 1000 * (2 ** attempt)));
  }
  throw lastError ?? new Error(`Request failed for ${table}`);
}

async function upsert(table, rows, conflict, batchSize = 300) {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const chunk = rows.slice(offset, offset + batchSize);
    await request(table, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(chunk),
    }, `on_conflict=${encodeURIComponent(conflict)}`);
    if ((offset + chunk.length) % 3000 === 0 || offset + chunk.length === rows.length) {
      console.log(`${table}: ${Math.min(offset + chunk.length, rows.length)}/${rows.length}`);
    }
  }
}

async function updateRelease(values) {
  await request("shopify_taxonomy_releases", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...values, updated_at: new Date().toISOString() }),
  }, `version=eq.${encodeURIComponent(version)}`);
}

const verticals = categoriesSource.verticals.map((v) => ({
  version, prefix: v.prefix, name: v.name,
}));
const categories = [];
for (const vertical of categoriesSource.verticals) {
  if (!Array.isArray(vertical.categories)) throw new Error(`Invalid categories array for ${vertical.name}`);
  for (const category of vertical.categories) {
    if (!category?.id || !category?.name || !Number.isInteger(category.level) ||
        !(category.parent_id === null || typeof category.parent_id === "string")) {
      throw new Error(`Invalid category record: ${JSON.stringify(category).slice(0, 300)}`);
    }
    categories.push({ ...category, vertical_prefix: vertical.prefix });
  }
}
const categoryIds = new Set(categories.map((c) => c.id));
if (categoryIds.size !== categories.length) throw new Error("Duplicate Shopify category GID detected.");
if ([...categoryIds].some((id) => !id.startsWith("gid://shopify/TaxonomyCategory/"))) {
  throw new Error("A category ID is not an official Shopify TaxonomyCategory GID.");
}
for (const category of categories) {
  if (category.parent_id !== null && !categoryIds.has(category.parent_id)) {
    throw new Error(`Missing parent ${category.parent_id} for ${category.id}`);
  }
}

const attributeRows = attributesSource.attributes.map((a) => ({
  id: a.id, version, name: a.name, handle: a.handle,
  description: a.description ?? null,
  extended_attributes: a.extended_attributes ?? [],
  raw_data: a,
}));
const attributeIds = new Set(attributeRows.map((a) => a.id));
if (attributeIds.size !== attributeRows.length ||
    [...attributeIds].some((id) => !id.startsWith("gid://shopify/TaxonomyAttribute/"))) {
  throw new Error("Duplicate or invalid Shopify TaxonomyAttribute GID detected.");
}
const valueRows = [];
for (const attribute of attributesSource.attributes) {
  for (const value of attribute.values ?? []) {
    valueRows.push({
      id: value.id, version, attribute_id: attribute.id,
      name: value.name, handle: value.handle, raw_data: value,
    });
  }
}
const returnReasonRows = reasonsSource.return_reasons.map((r) => ({
  id: r.id, version, name: r.name, handle: r.handle,
  description: r.description ?? null, raw_data: r,
}));
const returnReasonIds = new Set(returnReasonRows.map((r) => r.id));
if (returnReasonIds.size !== returnReasonRows.length ||
    [...returnReasonIds].some((id) => !id.startsWith("gid://shopify/ReturnReasonDefinition/"))) {
  throw new Error("Duplicate or invalid Shopify ReturnReasonDefinition GID detected.");
}
const valueIds = new Set(valueRows.map((value) => value.id));
if (valueIds.size !== valueRows.length ||
    [...valueIds].some((id) => !id.startsWith("gid://shopify/TaxonomyValue/"))) {
  throw new Error("Duplicate or invalid Shopify TaxonomyValue GID detected.");
}

const categoryAttributeRows = [];
const categoryReturnReasonRows = [];
for (const category of categories) {
  for (const [position, attribute] of (category.attributes ?? []).entries()) {
    if (!attributeIds.has(attribute.id)) {
      throw new Error(`Category ${category.id} references missing attribute ${attribute.id}`);
    }
    categoryAttributeRows.push({
      version, category_id: category.id, attribute_id: attribute.id,
      is_extended: Boolean(attribute.extended), position,
    });
  }
  for (const [position, reason] of (category.return_reasons ?? []).entries()) {
    if (!returnReasonIds.has(reason.id)) {
      throw new Error(`Category ${category.id} references missing return reason ${reason.id}`);
    }
    categoryReturnReasonRows.push({
      version, category_id: category.id, return_reason_id: reason.id, position,
    });
  }
}

// Shopify source data may repeat the same attribute/reason link for a
// category. Postgres rejects a single INSERT ... ON CONFLICT statement when
// the same conflict key occurs more than once in its input batch. Collapse
// those repeated links deterministically before sending batches.
function deduplicateLinks(rows, keyFields, merge) {
  const unique = new Map();
  for (const row of rows) {
    const key = keyFields.map((field) => row[field]).join("\\u0000");
    const previous = unique.get(key);
    unique.set(key, previous ? merge(previous, row) : row);
  }
  return [...unique.values()];
}

const rawCategoryAttributeLinkCount = categoryAttributeRows.length;
const rawCategoryReturnReasonLinkCount = categoryReturnReasonRows.length;

const uniqueCategoryAttributeRows = deduplicateLinks(
  categoryAttributeRows,
  ["version", "category_id", "attribute_id"],
  (a, b) => ({
    ...a,
    is_extended: a.is_extended || b.is_extended,
    position: Math.min(a.position, b.position),
  }),
);
const uniqueCategoryReturnReasonRows = deduplicateLinks(
  categoryReturnReasonRows,
  ["version", "category_id", "return_reason_id"],
  (a, b) => ({ ...a, position: Math.min(a.position, b.position) }),
);

console.log(JSON.stringify({
  version, verticals: verticals.length, categories: categories.length,
  attributes: attributeRows.length, values: valueRows.length,
  returnReasons: returnReasonRows.length,
  categoryAttributeLinks: uniqueCategoryAttributeRows.length,
  duplicateCategoryAttributeLinks: rawCategoryAttributeLinkCount - uniqueCategoryAttributeRows.length,
  categoryReturnReasonLinks: uniqueCategoryReturnReasonRows.length,
  duplicateCategoryReturnReasonLinks: rawCategoryReturnReasonLinkCount - uniqueCategoryReturnReasonRows.length,
}, null, 2));

await request("shopify_taxonomy_releases", {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify([{
    version, locale: "en", source_repository: "Shopify/product-taxonomy",
    source_tag: "v2026-11", import_status: "loading",
    source_manifest: {
      release_url: "https://github.com/Shopify/product-taxonomy/releases/tag/v2026-11",
      categories: { file: "categories.en.json.gz", sha256: "bd4de170a7337dc25439c14ab274ec424f68a49ff6114f79dad3f792d23ea959" },
      attributes: { file: "attributes.en.json.gz", sha256: "9c25544fef220e6831ebbb01135aed916bc5933b6ca7e51b88239685e3c96246" },
      return_reasons: { file: "return_reasons.en.json.gz", sha256: "e0c6a50f472004681432d3bf8b836a564962d9103fcf60f00819779abbb0dd61" },
      storage_bucket: "shopify-taxonomy",
      storage_prefix: `${version}/`,
      objects: [
        "categories.en.json.gz",
        "attributes.en.json.gz",
        "return_reasons.en.json.gz",
      ],
    },
  }]),
}, "on_conflict=version");

try {
  // Keep the official compressed JSON source assets in one shared private bucket.
  // The normalized tables below are query indexes/read models, not per-org copies.
  await uploadSourceJsonAssets();

  await upsert("shopify_taxonomy_verticals", verticals, "version,prefix", 100);
  await upsert("shopify_taxonomy_attributes", attributeRows, "version,id", 250);
  await upsert("shopify_taxonomy_attribute_values", valueRows, "version,id", 300);
  await upsert("shopify_taxonomy_return_reasons", returnReasonRows, "version,id", 250);

  // Parent categories are inserted before their descendants to satisfy the
  // self-referencing foreign key without disabling referential integrity.
  const levels = [...new Set(categories.map((c) => c.level))].sort((a, b) => a - b);
  for (const level of levels) {
    const rows = categories.filter((c) => c.level === level).map((c) => ({
      id: c.id, version, vertical_prefix: c.vertical_prefix,
      parent_id: c.parent_id, level: c.level, name: c.name,
      full_name: c.full_name, inherits_return_reasons: Boolean(c.inherits_return_reasons),
      children: c.children ?? [], ancestors: c.ancestors ?? [], raw_data: c,
    }));
    await upsert("shopify_taxonomy_categories", rows, "id", 300);
  }

  await upsert("shopify_taxonomy_category_attributes", uniqueCategoryAttributeRows,
    "version,category_id,attribute_id", 300);
  await upsert("shopify_taxonomy_category_return_reasons", uniqueCategoryReturnReasonRows,
    "version,category_id,return_reason_id", 300);

  const counts = {
    category_count: categories.length,
    attribute_count: attributeRows.length,
    value_count: valueRows.length,
    return_reason_count: returnReasonRows.length,
  };
  await updateRelease({
    ...counts, import_status: "complete", imported_at: new Date().toISOString(),
  });
  console.log(JSON.stringify({ status: "complete", ...counts }, null, 2));
} catch (error) {
  await updateRelease({ import_status: "failed" }).catch(() => {});
  throw error;
}
