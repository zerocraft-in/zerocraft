"use server";

import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/utils";
import { fetchTaxonomyVertical } from "@/lib/taxonomy";

export type ProductResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

// ============================================================================
// Helpers
// ============================================================================

function generateHandle(name: string, existingHandles: string[] = []): string {
  const handle = slugify(name);
  let counter = 1;
  let uniqueHandle = handle;
  while (existingHandles.includes(uniqueHandle)) {
    uniqueHandle = `${handle}-${counter}`;
    counter++;
  }
  return uniqueHandle;
}

async function getExistingHandles(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("products")
    .select("handle")
    .eq("organization_id", organizationId);
  return (data ?? []).map((d) => d.handle);
}

// ============================================================================
// Product Actions
// ============================================================================
// Validate the selected Shopify category against the authoritative Worker taxonomy.
async function isValidShopifyCategoryId(value: string | null): Promise<boolean> {
  if (value === null) return true;
  const match = value.match(/^gid:\/\/shopify\/TaxonomyCategory\/([a-z]{2}(?:-[0-9]+)*)$/);
  if (!match) return false;
  try {
    const vertical = await fetchTaxonomyVertical(match[1].slice(0, 2));
    return vertical.categories.some((category) => category.id === match[1]);
  } catch {
    return false;
  }
}


const productBaseSchema = z.object({
  category_id: z.string().regex(/^gid:\/\/shopify\/TaxonomyCategory\/[a-z]{2}(?:-[0-9]+)*$/, "Invalid Shopify category GID.").nullable(),
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(160, "Product name must be at most 160 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be at most 2000 characters")
    .nullable()
    .optional(),
  handle: z
    .string()
    .trim()
    .max(255, "Handle must be at most 255 characters")
    .nullable()
    .optional(),
  vendor: z
    .string()
    .trim()
    .max(100, "Vendor must be at most 100 characters")
    .nullable()
    .optional(),
  product_type: z
    .string()
    .trim()
    .max(100, "Product type must be at most 100 characters")
    .nullable()
    .optional(),
  tags: z.array(z.string()).default([]),
  tax_rate_bps: z
    .number()
    .int()
    .min(0, "Tax rate must be zero or greater")
    .max(10000, "Tax rate must be 100% or less"),
  is_tax_inclusive: z.boolean(),
  requires_shipping: z.boolean(),
  weight_grams: z.number().int().min(0).nullable(),
  weight_unit: z.enum(["g", "kg", "oz", "lb"]).default("g"),
  hs_code: z.string().trim().max(20).nullable().optional(),
  country_of_origin: z.string().trim().length(2).nullable().optional(),
  seo_title: z.string().trim().max(70).nullable().optional(),
  seo_description: z.string().trim().max(320).nullable().optional(),
  published_scope: z.enum(["web", "global"]).default("web"),
  status: z.enum(["draft", "active", "archived"]),
  options: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(50),
        values: z.array(z.string().trim().min(1).max(50)),
      }),
    )
    .max(3)
    .optional(),
});

export async function createProduct(input: unknown): Promise<ProductResult> {
  const context = await requirePermission("products.create");
  const organization = context.activeOrganization;
  if (!organization) {
    return { ok: false, error: "No active organization." };
  }

  const parseResult = productBaseSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: parseResult.error.issues[0]?.message ?? "Invalid product data.",
    };
  }

  const {
    category_id,
    name,
    description,
    handle: inputHandle,
    vendor,
    product_type,
    tags,
    tax_rate_bps,
    is_tax_inclusive,
    requires_shipping,
    weight_grams,
    weight_unit,
    hs_code,
    country_of_origin,
    seo_title,
    seo_description,
    published_scope,
    status,
    options,
  } = parseResult.data;

  if (!(await isValidShopifyCategoryId(category_id))) {
    return { ok: false, error: "Select a valid Shopify product category." };
  }

  if (status === "archived") {
    return { ok: false, error: "New products cannot be archived." };
  }

  const supabase = await createServerSupabaseClient();

  // Generate handle if not provided
  const existingHandles = await getExistingHandles(supabase, organization.id);
  const handle =
    inputHandle && inputHandle.trim()
      ? slugify(inputHandle.trim())
      : generateHandle(name, existingHandles);

  // Check handle uniqueness
  if (existingHandles.includes(handle)) {
    return { ok: false, error: "A product with this handle already exists." };
  }

  const published_at = status === "active" ? new Date().toISOString() : null;

  const { data, error } = await supabase.rpc("create_product_with_shopify_category", {
    p_organization_id: organization.id,
    p_name: name,
    p_description: description || null,
    p_handle: handle,
    p_vendor: vendor || null,
    p_product_type: product_type || null,
    p_tags: tags,
    p_tax_rate_bps: tax_rate_bps,
    p_is_tax_inclusive: is_tax_inclusive,
    p_requires_shipping: requires_shipping,
    p_weight_grams: weight_grams,
    p_weight_unit: weight_unit,
    p_hs_code: hs_code || null,
    p_country_of_origin: country_of_origin || null,
    p_seo_title: seo_title || null,
    p_seo_description: seo_description || null,
    p_published_scope: published_scope,
    p_status: status,
    p_published_at: published_at,
    p_shopify_category_id: category_id,
  });

  if (error) {
    console.error(
      `Product creation failed. code=${error.code ?? "-"} message=${error.message}`,
    );
    if (error.code === "23505") {
      return { ok: false, error: "A product with this handle already exists." };
    }
    return { ok: false, error: "Unable to create product. Please try again." };
  }

  const productId = data as string;

  // Create options if provided
  if (options && options.length > 0) {
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (opt.values.length > 0) {
        const { error: optError } = await supabase.rpc(
          "create_product_option",
          {
            p_organization_id: organization.id,
            p_product_id: productId,
            p_name: opt.name,
            p_position: i + 1,
            p_values: opt.values,
          },
        );
        if (optError) {
          console.error(`Option creation failed: ${optError.message}`);
        }
      }
    }
  }

  revalidatePath("/products");
  return { ok: true, id: productId };
}

const updateProductSchema = productBaseSchema.extend({
  id: z.string().uuid("Invalid product ID."),
});

export async function updateProduct(input: unknown): Promise<ProductResult> {
  const context = await requirePermission("products.update");

  const parseResult = updateProductSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: parseResult.error.issues[0]?.message ?? "Invalid product data.",
    };
  }

  const {
    id,
    category_id,
    name,
    description,
    handle: inputHandle,
    vendor,
    product_type,
    tags,
    tax_rate_bps,
    is_tax_inclusive,
    requires_shipping,
    weight_grams,
    weight_unit,
    hs_code,
    country_of_origin,
    seo_title,
    seo_description,
    published_scope,
    status,
    options,
  } = parseResult.data;

  if (!(await isValidShopifyCategoryId(category_id))) {
    return { ok: false, error: "Select a valid Shopify product category." };
  }

  const supabase = await createServerSupabaseClient();

  // Get current product for handle check
  const { data: currentProduct } = await supabase
    .from("products")
    .select("handle, status")
    .eq("id", id)
    .single();

  if (!currentProduct) {
    return { ok: false, error: "Product not found." };
  }

  // Handle uniqueness check
  if (
    inputHandle &&
    inputHandle.trim() &&
    slugify(inputHandle.trim()) !== currentProduct.handle
  ) {
    const existingHandles = await getExistingHandles(
      supabase,
      context.activeOrganization!.id,
    );
    const newHandle = slugify(inputHandle.trim());
    if (existingHandles.includes(newHandle)) {
      return { ok: false, error: "A product with this handle already exists." };
    }
  }

  const handle =
    inputHandle && inputHandle.trim()
      ? slugify(inputHandle.trim())
      : currentProduct.handle;
  const wasPublished = currentProduct.status === "active";
  const willBePublished = status === "active";
  const published_at =
    willBePublished && !wasPublished ? new Date().toISOString() : null;

  const { error } = await supabase.rpc("update_product_with_shopify_category", {
    p_product_id: id,
    p_name: name,
    p_description: description || null,
    p_handle: handle,
    p_vendor: vendor || null,
    p_product_type: product_type || null,
    p_tags: tags,
    p_tax_rate_bps: tax_rate_bps,
    p_is_tax_inclusive: is_tax_inclusive,
    p_requires_shipping: requires_shipping,
    p_weight_grams: weight_grams,
    p_weight_unit: weight_unit,
    p_hs_code: hs_code || null,
    p_country_of_origin: country_of_origin || null,
    p_seo_title: seo_title || null,
    p_seo_description: seo_description || null,
    p_published_scope: published_scope,
    p_status: status,
    p_published_at: published_at,
    p_shopify_category_id: category_id,
  });

  if (error) {
    console.error(
      `Product update failed. code=${error.code ?? "-"} message=${error.message}`,
    );
    return { ok: false, error: "Unable to update product. Please try again." };
  }

  // Update options (delete and recreate for simplicity)
  if (options !== undefined) {
    await supabase.from("product_options").delete().eq("product_id", id);

    const { data: orgRow } = await supabase
      .from("products")
      .select("organization_id")
      .eq("id", id)
      .single();
    const organizationId = orgRow?.organization_id ?? null;

    if (options.length > 0 && organizationId) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.values.length > 0) {
          await supabase.rpc("create_product_option", {
            p_organization_id: organizationId,
            p_product_id: id,
            p_name: opt.name,
            p_position: i + 1,
            p_values: opt.values,
          });
        }
      }
    }
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { ok: true };
}

const archiveProductSchema = z.object({
  id: z.string().uuid("Invalid product ID."),
});

export async function archiveProduct(input: unknown): Promise<ProductResult> {
  await requirePermission("products.archive");

  const parseResult = archiveProductSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: parseResult.error.issues[0]?.message ?? "Invalid product ID.",
    };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("archive_product", {
    p_product_id: parseResult.data.id,
  });

  if (error) {
    console.error(
      `Product archive failed. code=${error.code ?? "-"} message=${error.message}`,
    );
    return { ok: false, error: "Unable to archive product. Please try again." };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${parseResult.data.id}`);
  return { ok: true };
}

const deleteProductSchema = z.object({
  id: z.string().uuid("Invalid product ID."),
});

export async function deleteProduct(input: unknown): Promise<ProductResult> {
  await requirePermission("products.archive");

  const parseResult = deleteProductSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: parseResult.error.issues[0]?.message ?? "Invalid product ID.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("delete_product", {
    p_product_id: parseResult.data.id,
  });

  if (error) {
    console.error(
      `Product deletion failed. code=${error.code ?? "-"} message=${error.message}`,
    );
    return { ok: false, error: "Unable to delete product. Please try again." };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${parseResult.data.id}`);
  return { ok: true };
}

export async function bulkDeleteProducts(input: unknown): Promise<ProductResult> {
  const parseResult = z.object({ ids: z.array(z.string().uuid()).min(1) }).safeParse(input);
  if (!parseResult.success) return { ok: false, error: "Select at least one product." };

  for (const id of parseResult.data.ids) {
    const result = await deleteProduct({ id });
    if (!result.ok) return result;
  }

  return { ok: true };
}

const setProductStatusSchema = z.object({
  id: z.string().uuid("Invalid product ID."),
  status: z.enum(["draft", "active"]),
});

export async function setProductStatus(input: unknown): Promise<ProductResult> {
  await requirePermission("products.update");

  const parseResult = setProductStatusSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error: parseResult.error.issues[0]?.message ?? "Invalid status data.",
    };
  }

  const supabase = await createServerSupabaseClient();

  const { data: current } = await supabase
    .from("products")
    .select("status")
    .eq("id", parseResult.data.id)
    .single();

  const published_at =
    parseResult.data.status === "active" && current?.status !== "active"
      ? new Date().toISOString()
      : null;

  const { error } = await supabase.rpc("set_product_status", {
    p_product_id: parseResult.data.id,
    p_status: parseResult.data.status,
    p_published_at: published_at,
  });

  if (error) {
    console.error(
      `Product status change failed. code=${error.code ?? "-"} message=${error.message}`,
    );
    return {
      ok: false,
      error: "Unable to change product status. Please try again.",
    };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${parseResult.data.id}`);
  return { ok: true };
}

// ============================================================================
// Bulk Actions
// ============================================================================

export async function bulkArchiveProducts(
  input: unknown,
): Promise<ProductResult> {
  await requirePermission("products.archive");

  const parseResult = z
    .object({
      ids: z.array(z.string().uuid()),
    })
    .safeParse(input);

  if (!parseResult.success) {
    return { ok: false, error: "Invalid product IDs." };
  }

  const supabase = await createServerSupabaseClient();

  for (const id of parseResult.data.ids) {
    const { error } = await supabase.rpc("archive_product", {
      p_product_id: id,
    });
    if (error) {
      console.error(`Bulk archive failed for ${id}:`, error);
    }
  }

  revalidatePath("/products");
  return { ok: true };
}

export async function bulkSetProductStatus(
  input: unknown,
): Promise<ProductResult> {
  await requirePermission("products.update");

  const parseResult = z
    .object({
      ids: z.array(z.string().uuid()),
      status: z.enum(["draft", "active"]),
    })
    .safeParse(input);

  if (!parseResult.success) {
    return { ok: false, error: "Invalid input." };
  }

  const supabase = await createServerSupabaseClient();

  for (const id of parseResult.data.ids) {
    const { error } = await supabase.rpc("set_product_status", {
      p_product_id: id,
      p_status: parseResult.data.status,
      p_published_at:
        parseResult.data.status === "active" ? new Date().toISOString() : null,
    });
    if (error) {
      console.error(`Bulk status change failed for ${id}:`, error);
    }
  }

  revalidatePath("/products");
  return { ok: true };
}
