import "server-only";

import { createClient } from "@zerocraft/supabase/server";

export type StoreBundle = {
  id: string;
  slug: string;
  name: string;
  description: string;
  discountPercent: number;
  imageUrl: string;
  items: Array<{
    productId: string;
    productSlug: string;
    title: string;
    price: number;
    quantity: number;
  }>;
};

export async function getPublishedBundles(): Promise<StoreBundle[]> {
  const supabase = await createClient();
  const { data: bundles, error: bundleError } = await supabase
    .from("bundles")
    .select("id,slug,name,description,discount_percent,image_url")
    .eq("status", "published")
    .order("created_at", { ascending: true });
  if (bundleError)
    throw new Error(`Bundle query failed: ${bundleError.message}`);
  if (!bundles?.length) return [];

  const bundleIds = bundles.map((bundle) => bundle.id);
  const { data: items, error: itemError } = await supabase
    .from("bundle_items")
    .select(
      "bundle_id,product_id,quantity,sort_order,product:products!inner(id,slug,title,price,price_paise,status)",
    )
    .in("bundle_id", bundleIds)
    .eq("product.status", "active")
    .order("sort_order", { ascending: true });
  if (itemError)
    throw new Error(`Bundle item query failed: ${itemError.message}`);

  const itemsByBundle = new Map<string, StoreBundle["items"]>();
  for (const row of items ?? []) {
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    if (!product) continue;
    const price =
      product.price_paise == null
        ? Number(product.price)
        : Number(product.price_paise) / 100;
    const list = itemsByBundle.get(row.bundle_id) ?? [];
    list.push({
      productId: product.id,
      productSlug: product.slug,
      title: product.title,
      price,
      quantity: row.quantity,
    });
    itemsByBundle.set(row.bundle_id, list);
  }

  return bundles
    .map((bundle) => ({
      id: bundle.id,
      slug: bundle.slug,
      name: bundle.name,
      description: bundle.description,
      discountPercent: Number(bundle.discount_percent),
      imageUrl: bundle.image_url,
      items: itemsByBundle.get(bundle.id) ?? [],
    }))
    .filter((bundle) => bundle.items.length > 0);
}
