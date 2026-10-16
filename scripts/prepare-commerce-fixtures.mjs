#!/usr/bin/env node

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const kinds = [
  "simple-physical",
  "size-option",
  "color-option",
  "size-color-option",
  "digital",
  "customizable",
  "inr-priced",
  "usd-priced",
  "insufficient-stock",
  "final-one-unit",
  "multiple-variant-cart",
  "invalid-archived",
];

function uuidFrom(seed) {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][parseInt(hex[16], 16) % 4];
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20).join("")].join("-");
}

function slugPart(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--run-id") args.set("runId", argv[++i]);
    if (argv[i] === "--output") args.set("output", argv[++i]);
  }
  return args;
}

function optionPlan(productId, optionName, values, runId) {
  const optionId = uuidFrom(`${runId}:option:${productId}:${optionName}`);
  return {
    option: { id: optionId, product_id: productId, name: optionName },
    values: values.map((value) => ({
      id: uuidFrom(`${runId}:option-value:${optionId}:${value}`),
      option_id: optionId,
      value,
    })),
  };
}

export function createFixturePlan(runId) {
  const normalized = String(runId).toLowerCase();
  const categoryId = uuidFrom(`${normalized}:category:integration-tests`);
  const locationId = uuidFrom(`${normalized}:location:integration-tests`);
  const category = {
    id: categoryId,
    name: `zc_itest_${normalized} Integration Fixtures`,
    slug: `zc-itest-${slugPart(normalized)}-integration-fixtures`,
  };
  const location = {
    id: locationId,
    name: `zc_itest_${normalized} Disposable Location`,
    code: `ZC_ITEST_${normalized.slice(0, 24).toUpperCase()}`,
    is_active: true,
  };
  const products = [];
  const variants = [];
  const options = [];
  const optionValues = [];
  const variantValues = [];
  const inventoryLevels = [];
  const templates = [];

  for (const kind of kinds) {
    const productId = uuidFrom(`${normalized}:product:${kind}`);
    const digital = kind === "digital";
    const usd = kind === "usd-priced";
    const archived = kind === "invalid-archived";
    const pricePaise = usd ? null : 12900 + kinds.indexOf(kind) * 500;
    const price = usd ? 19.99 : pricePaise / 100;
    const productSlug = `zc-itest-${slugPart(normalized)}-${kind}`;
    products.push({
      id: productId,
      category_id: categoryId,
      title: `zc_itest_${normalized} ${kind}`,
      slug: productSlug,
      description: `Disposable development fixture ${normalized}; never production catalog data.`,
      product_type: digital ? "digital" : "physical",
      status: archived ? "archived" : "active",
      sku: `ZC-ITEST-${normalized.slice(0, 16).toUpperCase()}-${kind.toUpperCase()}`,
      price,
      compare_at_price: usd ? 24.99 : price + 20,
      currency: usd ? "USD" : "INR",
      stock: digital ? null : 10,
      image_url: "",
      price_paise: pricePaise,
      compare_at_price_paise: usd ? null : pricePaise + 2000,
      currency_code: usd ? "USD" : "INR",
    });

    const productOptionPlans = [];
    if (["size-option", "size-color-option", "multiple-variant-cart"].includes(kind)) productOptionPlans.push(optionPlan(productId, "Size", ["S", "M"], normalized));
    if (["color-option", "size-color-option"].includes(kind)) productOptionPlans.push(optionPlan(productId, "Color", ["Red", "Blue"], normalized));
    options.push(...productOptionPlans.map((entry) => entry.option));
    optionValues.push(...productOptionPlans.flatMap((entry) => entry.values));

    const combinations = kind === "size-color-option"
      ? [["S", "Red"], ["S", "Blue"], ["M", "Red"], ["M", "Blue"]]
      : productOptionPlans.length === 1 ? productOptionPlans[0].values.map((entry) => [entry.value]) : [[null]];
    for (const [first, second] of combinations) {
      const variantId = uuidFrom(`${normalized}:variant:${kind}:${first ?? "default"}:${second ?? "default"}`);
      const variantOptions = {};
      const linkedValues = [];
      if (first && productOptionPlans[0]) {
        variantOptions[productOptionPlans[0].option.name] = first;
        linkedValues.push(optionValues.find((value) => value.option_id === productOptionPlans[0].option.id && value.value === first));
      }
      if (second && productOptionPlans[1]) {
        variantOptions[productOptionPlans[1].option.name] = second;
        linkedValues.push(optionValues.find((value) => value.option_id === productOptionPlans[1].option.id && value.value === second));
      }
      const stock = kind === "insufficient-stock" ? 0 : kind === "final-one-unit" ? 1 : 10;
      variants.push({
        id: variantId,
        product_id: productId,
        label: Object.values(variantOptions).join(" / ") || "Default",
        sku: `ZC-ITEST-${normalized.slice(0, 16).toUpperCase()}-${kind.toUpperCase()}-${variants.length + 1}`,
        options: variantOptions,
        price,
        stock: digital ? null : stock,
        is_active: true,
        price_paise: pricePaise,
        currency_code: usd ? "USD" : "INR",
      });
      for (const linked of linkedValues) {
        variantValues.push({ variant_id: variantId, option_value_id: linked.id });
      }
      if (!digital) inventoryLevels.push({ location_id: locationId, variant_id: variantId, on_hand: stock, reserved: 0, reorder_point: 1 });
    }

    if (kind === "customizable") {
      templates.push({
        id: uuidFrom(`${normalized}:template:${kind}`),
        product_id: productId,
        name: `zc_itest_${normalized} Custom Artwork`,
        slug: `zc-itest-${slugPart(normalized)}-custom-artwork`,
        schema: { fixture: normalized, fields: [{ id: "artwork", type: "image", required: true }] },
        preview_url: "",
        status: "published",
      });
    }
  }

  return {
    fixtureMarker: `zc_itest_${normalized}`,
    runId: normalized,
    remoteWrites: false,
    developmentOnly: true,
    schema: {
      products: "store_products",
      variants: "store_product_variants",
      options: "store_variant_options",
      optionValues: "store_variant_option_values",
      variantValues: "store_variant_values",
      inventoryLocations: "store_inventory_locations",
      inventoryLevels: "store_inventory_levels",
      customizationTemplates: "store_customization_templates",
    },
    category,
    location,
    products,
    variants,
    options,
    optionValues,
    variantValues,
    inventoryLevels,
    templates,
    expectedMutations: {
      store_categories: 1,
      store_inventory_locations: 1,
      store_products: products.length,
      store_product_variants: variants.length,
      store_variant_options: options.length,
      store_variant_option_values: optionValues.length,
      store_variant_values: variantValues.length,
      store_inventory_levels: inventoryLevels.length,
      store_customization_templates: templates.length,
    },
  };
}

const args = parseArgs(process.argv.slice(2));
if (process.argv[1]?.endsWith("prepare-commerce-fixtures.mjs")) {
  const runId = args.get("runId");
  if (!runId || !/^[a-z0-9][a-z0-9-]{7,63}$/.test(runId)) {
    console.error("Usage: node scripts/prepare-commerce-fixtures.mjs --run-id <unique-run-id> [--output <local-json-path>]");
    process.exit(2);
  }
  const plan = createFixturePlan(runId);
  const serialized = `${JSON.stringify(plan, null, 2)}\n`;
  if (args.get("output")) await writeFile(args.get("output"), serialized, "utf8");
  else process.stdout.write(serialized);
}
