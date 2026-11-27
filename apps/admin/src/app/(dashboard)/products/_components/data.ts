import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ProductBaseRow,
  ProductRow,
  VariantRow,
  ProductOption,
  ProductImage,
  Collection,
} from "../types";

export type SupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

type VariantBaseRow = VariantRow & { product_id: string };
type OptionBaseRow = ProductOption & { product_id: string };
type ImageBaseRow = ProductImage & { product_id: string };
type CollectionBaseRow = Collection & { product_ids?: string[]; position?: number };

export async function fetchProducts(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ProductBaseRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      public_id,
      organization_id,
      category_id,
      name,
      description,
      status,
      handle,
      vendor,
      product_type,
      tags,
      tax_rate_bps,
      is_tax_inclusive,
      requires_shipping,
      weight_grams,
      hs_code,
      country_of_origin,
      seo_title,
      seo_description,
      published_at,
      published_scope,
      created_at,
      updated_at
    `,
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as unknown as ProductBaseRow[];
}

export async function fetchVariants(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<VariantBaseRow[]> {
  const { data, error } = await supabase
    .from("variants")
    .select(
      `
      id,
      public_id,
      product_id,
      sku,
      barcode,
      option1,
      option2,
      option3,
      cost_price_paise,
       selling_price_paise:price_paise,
      compare_at_price_paise,
      cost_per_item_paise,
      tax_rate_bps,
      track_quantity,
      quantity,
      continue_selling_when_out_of_stock,
       weight_grams:grams,
      weight_unit,
      requires_shipping,
      is_active,
      reorder_point,
      created_at,
      updated_at
    `,
    )
    .eq("organization_id", organizationId);

  if (error) throw error;

  return (data ?? []) as unknown as VariantBaseRow[];
}

export async function fetchOptions(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OptionBaseRow[]> {
  const { data, error } = await supabase
    .from("product_options")
    .select(
      `
      id,
      public_id,
      product_id,
      name,
      position,
      values,
      created_at,
      updated_at
    `,
    )
    .eq("organization_id", organizationId);

  if (error) throw error;

  return (data ?? []) as unknown as OptionBaseRow[];
}

export async function fetchImages(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ImageBaseRow[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select(
      `
      id,
      public_id,
      product_id,
      variant_ids,
      src,
      alt,
      position,
      width,
      height,
      created_at,
      updated_at
    `,
    )
    .eq("organization_id", organizationId)
    .order("position", { ascending: true });

  if (error) throw error;

  return (data ?? []) as unknown as ImageBaseRow[];
}

export async function fetchCollections(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<CollectionBaseRow[]> {
  const { data: collections, error: collectionsError } = await supabase
    .from("collections")
    .select(
      `
      id,
      title,
      handle,
      description,
      image_src,
      sort_order,
      published_at,
      published_scope,
      created_at,
      updated_at
    `,
    )
    .eq("organization_id", organizationId)
    .order("title", { ascending: true });

  if (collectionsError) throw collectionsError;

  return (collections ?? []).map(c => ({
    ...c,
    product_ids: [],
  })) as unknown as CollectionBaseRow[];
}

export function assembleProducts(
  productRows: ProductBaseRow[],
  variantRows: VariantBaseRow[],
  optionRows: OptionBaseRow[],
  imageRows: ImageBaseRow[],
  collectionRows: CollectionBaseRow[],
): ProductRow[] {
  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const variant of variantRows) {
    const { product_id, ...rest } = variant;
    const existing = variantsByProduct.get(product_id);
    if (existing) {
      existing.push(rest);
    } else {
      variantsByProduct.set(product_id, [rest]);
    }
  }

  const optionsByProduct = new Map<string, ProductOption[]>();
  for (const option of optionRows) {
    const { product_id, ...rest } = option;
    const existing = optionsByProduct.get(product_id);
    if (existing) {
      existing.push(rest);
    } else {
      optionsByProduct.set(product_id, [rest]);
    }
  }

  const imagesByProduct = new Map<string, ProductImage[]>();
  for (const image of imageRows) {
    const { product_id, ...rest } = image;
    const existing = imagesByProduct.get(product_id);
    if (existing) {
      existing.push(rest);
    } else {
      imagesByProduct.set(product_id, [rest]);
    }
  }

  const collectionsByProduct = new Map<string, Collection[]>();
  for (const collection of collectionRows) {
    const { product_ids, ...rest } = collection;
    if (product_ids) {
      for (const productId of product_ids) {
        const existing = collectionsByProduct.get(productId);
        if (existing) {
          existing.push(rest);
        } else {
          collectionsByProduct.set(productId, [rest]);
        }
      }
    }
  }

  return productRows.map((row) => ({
    ...row,
    variants: variantsByProduct.get(row.id) ?? [],
    product_options: optionsByProduct.get(row.id) ?? [],
    product_images: imagesByProduct.get(row.id) ?? [],
    collections: collectionsByProduct.get(row.id) ?? [],
  }));
}

export async function fetchProductById(
  supabase: SupabaseClient,
  organizationId: string,
  productId: string,
): Promise<ProductRow | null> {
  const { data: product, error } = await supabase
    .from("products")
    .select(
      `
      id,
      public_id,
      organization_id,
      category_id,
      name,
      description,
      status,
      handle,
      vendor,
      product_type,
      tags,
      tax_rate_bps,
      is_tax_inclusive,
      requires_shipping,
      weight_grams,
      hs_code,
      country_of_origin,
      seo_title,
      seo_description,
      published_at,
      published_scope,
      created_at,
      updated_at
    `,
    )
    .eq("organization_id", organizationId)
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;
  if (!product) return null;

  const [variants, options, images, collections] = await Promise.all([
    supabase
      .from("variants")
      .select(
        `
        id,
        public_id,
        sku,
        barcode,
        option1,
        option2,
        option3,
        cost_price_paise,
         selling_price_paise:price_paise,
        compare_at_price_paise,
        cost_per_item_paise,
        tax_rate_bps,
        track_quantity,
        quantity,
        continue_selling_when_out_of_stock,
         weight_grams:grams,
        weight_unit,
        requires_shipping,
        is_active,
        reorder_point,
        created_at,
        updated_at
      `,
      )
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .order("created_at", { ascending: true }),
    supabase
      .from("product_options")
      .select("id, public_id, name, position, values")
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .order("position", { ascending: true }),
    supabase
      .from("product_images")
      .select("id, public_id, variant_ids, src, alt, position, width, height")
      .eq("organization_id", organizationId)
      .eq("product_id", productId)
      .order("position", { ascending: true }),
    Promise.resolve({
      data: [] as Array<{ collection_id: string; position: number }>,
      error: null,
    }),
  ]);

  if (variants.error) throw variants.error;
  if (options.error) throw options.error;
  if (images.error) throw images.error;
  if (collections.error) throw collections.error;

  // Fetch collection details
  let collectionsData: Collection[] = [];
  if (collections.data && collections.data.length > 0) {
    const collectionIds = collections.data.map(c => c.collection_id);
    const { data: collData, error: collError } = await supabase
      .from("collections")
      .select("id, title, handle, description, image_src, sort_order, published_at, published_scope")
      .eq("organization_id", organizationId)
      .in("id", collectionIds);
    if (collError) throw collError;
    collectionsData = (collData ?? []) as unknown as Collection[];
    // Merge position
    collectionsData = collectionsData.map(c => {
      const pc = collections.data?.find(p => p.collection_id === c.id);
      return { ...c, position: pc?.position ?? 1 };
    });
  }

  const base = product as unknown as ProductBaseRow;

  return {
    ...base,
    variants: (variants.data ?? []) as unknown as VariantRow[],
    product_options: (options.data ?? []) as unknown as ProductOption[],
    product_images: (images.data ?? []) as unknown as ProductImage[],
    collections: collectionsData,
  };
}

export async function fetchVariantById(
  supabase: SupabaseClient,
  organizationId: string,
  productId: string,
  variantId: string,
): Promise<VariantRow | null> {
  const { data, error } = await supabase
    .from("variants")
    .select(
      `
      id,
      public_id,
      sku,
      barcode,
      option1,
      option2,
      option3,
      cost_price_paise,
       selling_price_paise:price_paise,
      compare_at_price_paise,
      cost_per_item_paise,
      tax_rate_bps,
      track_quantity,
      quantity,
      continue_selling_when_out_of_stock,
       weight_grams:grams,
      weight_unit,
      requires_shipping,
      is_active,
      reorder_point,
      created_at,
      updated_at
    `,
    )
    .eq("organization_id", organizationId)
    .eq("product_id", productId)
    .eq("id", variantId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as VariantRow | null;
}
