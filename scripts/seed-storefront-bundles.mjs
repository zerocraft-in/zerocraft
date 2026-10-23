import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allow = process.env.ZEROCRAFT_SEED_ENV === "development" || process.env.ZEROCRAFT_SEED_ENV === "staging";
if (!url || !key) throw new Error("Missing Supabase server credentials.");
if (!allow) throw new Error("Refusing to seed. Set ZEROCRAFT_SEED_ENV=development or staging explicitly.");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "apps/store/lib/zerocraft-products.json"), "utf8"));
const supabase = createClient(url, key, { auth: { persistSession: false } });

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const categoryRows = [...new Set(source.map((product) => product.category))].map((name) => ({
  slug: slugify(name), name, description: `Zerocraft ${name.toLowerCase()} demo products.`, image_url: "", is_active: true,
}));
const { data: categories, error: categoryError } = await supabase.from("store_categories").upsert(categoryRows, { onConflict: "slug" }).select("id,slug");
if (categoryError) throw new Error(`Category seed failed: ${categoryError.message}`);
const categoryByName = new Map(categories.map((row) => [row.slug, row.id]));
const subcategoryRows = categoryRows.map((category) => ({
  category_id: categoryByName.get(category.slug), slug: category.slug, name: category.name,
  description: `${category.name} demo products.`, image_url: "", sort_order: 0, is_active: true,
}));
const { data: subcategories, error: subcategoryError } = await supabase.from("store_subcategories").upsert(subcategoryRows, { onConflict: "category_id,slug" }).select("id,category_id,slug");
if (subcategoryError) throw new Error(`Subcategory seed failed: ${subcategoryError.message}`);
const subcategoryByCategory = new Map(subcategories.map((row) => [row.category_id, row.id]));

const productRows = source.map((product) => ({
  slug: slugify(product.name), sku: `ZC-DEMO-${String(product.id).padStart(3, "0")}`,
  title: product.name, description: `${product.subtitle}. Development demo product.`, product_type: product.type === "digi" ? "digital" : "physical",
  status: "active", price: product.price, compare_at_price: product.originalPrice, price_paise: product.price * 100,
  compare_at_price_paise: product.originalPrice * 100, currency: "INR", currency_code: "INR", stock: product.type === "digi" ? null : 20,
  image_url: `/brand/store-art/${product.id}.svg`, category_id: categoryByName.get(slugify(product.category)),
  subcategory_id: subcategoryByCategory.get(categoryByName.get(slugify(product.category))),
}));
const { data: products, error: productError } = await supabase.from("store_products").upsert(productRows, { onConflict: "slug" }).select("id,slug,sku");
if (productError) throw new Error(`Product seed failed: ${productError.message}`);
const productBySlug = new Map(products.map((row) => [row.slug, row]));

const variantRows = source.flatMap((product) => (product.sizes?.length ? product.sizes : ["Standard"]).map((label) => ({
  product_id: productBySlug.get(slugify(product.name))?.id, label, sku: `ZC-DEMO-${String(product.id).padStart(3, "0")}-${slugify(label).toUpperCase()}`,
  options: label === "Standard" ? {} : { Size: label }, price: product.price, price_paise: product.price * 100, currency_code: "INR", stock: product.type === "digi" ? null : 20, is_active: true,
})));
const { error: variantError } = await supabase.from("store_product_variants").upsert(variantRows, { onConflict: "sku" });
if (variantError) throw new Error(`Variant seed failed: ${variantError.message}`);

const bundleDefinitions = [
  { slug: "fan-pack", name: "Fan Pack", description: "Vera Level Tee + First Day First Show Poster", productSlugs: ["vera-level-tee", "first-day-first-show-poster"] },
  { slug: "mallu-mode-pack", name: "Mallu Mode Pack", description: "Adipoli Mode Tee + Chaya Kada Poster", productSlugs: ["adipoli-mode-tee", "chaya-kada-poster"] },
  { slug: "frame-it-pack", name: "Frame It Pack", description: "Midnight Kuthu Poster + Matinee Minimal Frame", productSlugs: ["midnight-kuthu-poster", "matinee-minimal-frame"] },
];
const { data: bundles, error: bundleError } = await supabase.from("store_bundles").upsert(bundleDefinitions.map(({ productSlugs, ...bundle }) => ({ ...bundle, discount_percent: 15, status: "published" })), { onConflict: "slug" }).select("id,slug");
if (bundleError) throw new Error(`Bundle seed failed: ${bundleError.message}`);
const bundleBySlug = new Map(bundles.map((row) => [row.slug, row.id]));
const bundleItems = bundleDefinitions.flatMap((bundle) => bundle.productSlugs.map((productSlug, index) => ({ bundle_id: bundleBySlug.get(bundle.slug), product_id: productBySlug.get(productSlug)?.id, quantity: 1, sort_order: index })));
const { error: itemError } = await supabase.from("store_bundle_items").upsert(bundleItems, { onConflict: "bundle_id,product_id" });
if (itemError) throw new Error(`Bundle item seed failed: ${itemError.message}`);

console.log(`Storefront seed complete: ${products.length} products, ${variantRows.length} variants, ${bundles.length} combo bundles.`);
