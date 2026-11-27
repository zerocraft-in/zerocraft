#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const inputDir = path.resolve(process.argv[2] ?? "infrastructure/supabase/taxonomy/import");
const outputDir = path.resolve(process.argv[3] ?? "tmp/taxonomy-r2");

const readJson = async (name) =>
  JSON.parse(await fs.readFile(path.join(inputDir, name), "utf8"));

const categories = await readJson("categories.en.json");
const attributes = await readJson("attributes.en.json");
const returnReasons = await readJson("return_reasons.en.json");

if (
  categories.version !== "2026-11" ||
  attributes.version !== categories.version ||
  returnReasons.version !== categories.version
) {
  throw new Error("All taxonomy sources must use version 2026-11.");
}

if (!Array.isArray(categories.verticals)) {
  throw new Error("categories.en.json must contain a verticals array.");
}

const gzipJson = (value) =>
  zlib.gzipSync(Buffer.from(JSON.stringify(value)), { level: 9 });

const writeGzipJson = async (relativePath, value) => {
  const filePath = path.join(outputDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, gzipJson(value));
};

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const versionDir = path.join(outputDir, categories.version);
await fs.mkdir(versionDir, { recursive: true });

const roots = categories.verticals.map((vertical) => ({
  id: `gid://shopify/TaxonomyCategory/${vertical.prefix}`,
  prefix: vertical.prefix,
  name: vertical.name,
  category_count: vertical.categories.length,
}));

await writeGzipJson(`${categories.version}/manifest.json.gz`, {
  version: categories.version,
  roots,
});

await fs.copyFile(
  path.join(inputDir, "attributes.en.json.gz"),
  path.join(versionDir, "attributes.en.json.gz"),
);
await fs.copyFile(
  path.join(inputDir, "return_reasons.en.json.gz"),
  path.join(versionDir, "return_reasons.en.json.gz"),
);

await fs.mkdir(path.join(versionDir, "source"), { recursive: true });
for (const fileName of [
  "categories.en.json.gz",
  "attributes.en.json.gz",
  "return_reasons.en.json.gz",
]) {
  await fs.copyFile(
    path.join(inputDir, fileName),
    path.join(versionDir, "source", fileName),
  );
}

for (const vertical of categories.verticals) {
  await writeGzipJson(
    `${categories.version}/verticals/${vertical.prefix}.json.gz`,
    {
      version: categories.version,
      prefix: vertical.prefix,
      name: vertical.name,
      categories: vertical.categories,
    },
  );
}

console.log(
  JSON.stringify(
    {
      outputDir,
      version: categories.version,
      verticals: categories.verticals.length,
      objects: 6 + categories.verticals.length,
    },
    null,
    2,
  ),
);
