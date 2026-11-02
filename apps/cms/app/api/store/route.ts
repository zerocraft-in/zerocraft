import { isCurrencyCode, STORE_CURRENCY } from "@/lib/currency";
import { createClient } from "@zerocraft/supabase/server";
import { createServiceClient } from "@/lib/supabase-service";
import { isSameOrigin } from "@/lib/request-origin";
import { requireCommercePermission } from "@/lib/commerce-auth";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

function catalogErrorMessage(error: { code?: string } | null) {
  if (error?.code === "42P01") return "Catalog tables are not available.";
  if (error?.code === "42703") return "Catalog schema is incompatible with this application.";
  if (error?.code === "42501") return "Catalog access is not authorized.";
  return "Catalog data could not be loaded.";
}

function revalidateStoreCatalog(slug?: string) {
  revalidatePath("/store", "layout");
  revalidatePath("/api/store/catalog");
  if (slug) revalidatePath(`/store/product/${slug}`);
}

async function recordCatalogAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: { actor_id: string; action: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown> },
) {
  let auditClient = supabase;
  try { auditClient = await createServiceClient() as typeof supabase; } catch { /* fall back to the authenticated client when service credentials are unavailable */ }
  const { error } = await auditClient.from("audit_logs").insert(entry);
  if (error) console.error("Catalog audit log write failed", { action: entry.action, entityId: entry.entity_id, error });
}

function buildCatalogHealth(categories: any[], products: any[]) {
  const activeCategories = categories.filter((category) => category.is_active);
  const activeSubcategories = activeCategories.flatMap((category) => (category.subcategories || []).filter((subcategory: any) => subcategory.is_active));
  const activeProducts = products.filter((product) => product.status === "active" && !product.deleted_at);
  const duplicateValues = (values: unknown[]) => [...new Set(values.filter(Boolean).map(String).filter((value, index, list) => list.indexOf(value) !== index))];
  const duplicateSlugs = new Set(duplicateValues(products.map((product) => product.slug)));
  const duplicateSkus = new Set(duplicateValues(products.map((product) => product.sku)));
  const categoryIds = new Set(activeCategories.map((category) => category.id));
  const subcategoryIds = new Map(activeSubcategories.map((subcategory: any) => [subcategory.id, subcategory.category_id]));
  return {
    activeCategories: activeCategories.length,
    activeSubcategories: activeSubcategories.length,
    activeProducts: activeProducts.length,
    productsWithoutMedia: activeProducts.filter((product) => !product.image_url && !(product.product_media || []).some((media: any) => media.public_url || media.storage_path)).map((product) => product.slug),
    productsWithoutVariants: activeProducts.filter((product) => !(product.variants || []).some((variant: any) => variant.is_active !== false)).map((product) => product.slug),
    rightsReviewProducts: activeProducts.filter((product) => product.rights_status === "review_required").map((product) => product.slug),
    orphanedTaxonomy: activeProducts.filter((product) => !product.category_id || !product.subcategory_id || !categoryIds.has(product.category_id) || !subcategoryIds.has(product.subcategory_id) || subcategoryIds.get(product.subcategory_id) !== product.category_id).map((product) => product.slug),
    duplicateCategorySlugs: duplicateValues(categories.map((category) => category.slug)),
    duplicateProductSlugs: products.filter((product) => duplicateSlugs.has(String(product.slug))).map((product) => product.slug),
    duplicateProductSkus: products.filter((product) => duplicateSkus.has(String(product.sku))).map((product) => product.slug),
  };
}

export async function GET(request: Request) {
  const access = await requireCommercePermission("catalog.read");
  if (!access.ok) return access.response;
  const { supabase, user } = access;
  const currency = new URL(request.url).searchParams.get("currency") ?? STORE_CURRENCY;
  if (!isCurrencyCode(currency)) return jsonError("Unsupported reporting currency.");
  const [categories, products, recentOrders, analyticsOrders, orderSummary, inventoryLocations] = await Promise.all([
    supabase.from("categories").select("id,name,slug,description,image_url,is_active,created_at,updated_at,deleted_at,purge_after,deleted_from_is_active,subcategories(id,category_id,name,slug,description,image_url,sort_order,is_active,created_at,updated_at,deleted_at,purge_after,deleted_from_is_active)").order("name"),
    supabase.from("products").select("id,category_id,subcategory_id,design_origin,rights_status,title,vendor,merchandise_type,tags,slug,description,product_type,status,sku,price,compare_at_price,price_paise,compare_at_price_paise,currency,currency_code,stock,image_url,digital_delivery,write_version,created_at,updated_at,deleted_at,purge_after,deleted_from_status,product_media(id,storage_path,public_url,alt_text,sort_order,media_type,is_primary),digital_files(id,product_id,variant_id,file_name,mime_type,size_bytes,sort_order,created_at),variants(id,label,sku,options,price,price_paise,currency_code,stock,is_active,inventory_levels(location_id,on_hand,reserved,reorder_point)),collection_products(collection:collections(id,name,slug,status))").order("updated_at", { ascending: false }),
    supabase.from("orders").select("id,total,currency,status,payment_status,created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("orders").select("id,total,currency,status,payment_status,created_at").order("created_at", { ascending: false }).limit(1000),
    supabase.rpc("order_summary"),
    supabase.from("locations").select("id,name,code,is_active").order("name"),
  ]);
  const catalogReady = !categories.error && !products.error;
  const orderReady = !recentOrders.error && !analyticsOrders.error && !orderSummary.error;
  const paidByCurrency = (orderSummary.data?.paidByCurrency || {}) as Record<string, number>;
  const legacyPaidByCurrency = Object.fromEntries(Object.entries(paidByCurrency).filter(([code]) => code !== currency));
  return Response.json({
    configured: catalogReady,
    catalogError: catalogReady ? null : catalogErrorMessage(categories.error || products.error),
    categories: categories.data || [], products: products.data || [],
    catalogHealth: catalogReady ? buildCatalogHealth(categories.data || [], products.data || []) : null,
    inventoryLocations: inventoryLocations.error ? [] : inventoryLocations.data || [],
    orders: { available: orderReady, count: orderReady ? Number(orderSummary.data.count) : null, pending: orderReady ? Number(orderSummary.data.pending) : null, paidTotal: orderReady ? Number(paidByCurrency[currency] || 0) : null, currencyCount: orderReady ? 1 : 0, currency, paidByCurrency: orderReady ? { [currency]: Number(paidByCurrency[currency] || 0) } : {}, legacyPaidByCurrency: orderReady ? legacyPaidByCurrency : {}, recent: orderReady ? recentOrders.data || [] : [], analytics: orderReady ? analyticsOrders.data || [] : [] },
  }, { headers: { "Cache-Control": "private, no-store" } });
}

type CategoryInput = { name?: string; slug?: string; description?: string; image_url?: string; is_active?: boolean };
type SubcategoryInput = { category_id?: string; name?: string; slug?: string; description?: string; image_url?: string; sort_order?: number; is_active?: boolean };
type VariantInput = { id?: string; label: string; sku: string; options?: Record<string, string | string[]>; price: number; price_paise?: number | null; stock?: number | null; is_active?: boolean; inventory?: { location_id: string; on_hand: number; reserved?: number; reorder_point?: number }[]; inventory_levels?: { location_id: string; on_hand: number; reserved?: number; reorder_point?: number }[] };
type ProductInput = { vendor?: string; merchandise_type?: string; tags?: string[]; id?: string; write_version?: number; title?: string; slug?: string; category_id?: string | null; subcategory_id?: string | null; design_origin?: "original_zerocraft" | "licensed" | "fan_inspired"; rights_status?: "not_applicable" | "approved_license" | "review_required"; description?: string; product_type?: "physical" | "digital"; status?: "draft" | "active" | "archived"; sku?: string; price?: number; price_paise?: number | null; compare_at_price?: number | null; compare_at_price_paise?: number | null; currency?: string; currency_code?: string | null; stock?: number | null; image_url?: string; digital_delivery?: { mode?: "instant" | "manual"; download_limit?: number; link_expiry_hours?: number }; collection_ids?: string[]; variants?: VariantInput[] };

function validSlug(slug: unknown): slug is string { return typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug); }
function validVariants(value: unknown): value is VariantInput[] {
  return Array.isArray(value) && value.length <= 60 && value.every((variant) => variant && typeof variant.label === "string" && variant.label.trim().length > 0 && typeof variant.sku === "string" && variant.sku.trim().length > 0 && Number.isFinite(Number(variant.price)) && Number(variant.price) >= 0 && (variant.stock == null || (Number.isInteger(Number(variant.stock)) && Number(variant.stock) >= 0)) && (!variant.options || (typeof variant.options === "object" && !Array.isArray(variant.options))));
}

function validateProductInput(product: ProductInput) {
  if ((product.vendor !== undefined && (typeof product.vendor !== "string" || product.vendor.length > 100)) || (product.merchandise_type !== undefined && (typeof product.merchandise_type !== "string" || product.merchandise_type.length > 100)) || (product.tags !== undefined && (!Array.isArray(product.tags) || product.tags.length > 50 || product.tags.some(tag => typeof tag !== "string" || !tag.trim() || tag.length > 100)))) return "Check vendor, product type, and tags (maximum 50 tags).";
  if (!product.title?.trim() || !validSlug(product.slug) || !product.sku?.trim() || !["physical", "digital"].includes(product.product_type || "") || !["draft", "active", "archived"].includes(product.status || "") || !Number.isFinite(Number(product.price)) || Number(product.price) < 0 || (product.stock != null && (!Number.isInteger(Number(product.stock)) || Number(product.stock) < 0)) || (product.variants && !validVariants(product.variants))) return "Check the product name, SKU, type, status, price, stock, and variants.";
  if (!isCurrencyCode(product.currency_code ?? product.currency ?? STORE_CURRENCY)) return "Choose INR or USD for this product.";
  const delivery = product.digital_delivery;
  if (delivery && (!['instant', 'manual'].includes(delivery.mode || '') || !Number.isInteger(Number(delivery.download_limit)) || Number(delivery.download_limit) < 0 || !Number.isInteger(Number(delivery.link_expiry_hours)) || Number(delivery.link_expiry_hours) < 0)) return "Check the digital delivery settings.";
  if (product.status === "active" && product.rights_status === "review_required") return "Products awaiting rights review cannot be published.";
  if (product.status === "active" && (!product.category_id || !product.subcategory_id)) return "Active products require an active category and subcategory.";
  return null;
}

async function validateProductIdentity(supabase: Awaited<ReturnType<typeof createClient>>, product: ProductInput, productId: string | null) {
  const slug = product.slug!.trim();
  const sku = product.sku!.trim();
  const variantSkus = (product.variants || []).map((variant) => variant.sku.trim()).filter(Boolean);
  const [productIdentity, variantIdentity] = await Promise.all([
    supabase.from("products").select("id,slug,sku").or(`slug.eq.${slug},sku.eq.${sku}`),
    variantSkus.length ? supabase.from("variants").select("id,product_id,sku").in("sku", variantSkus) : Promise.resolve({ data: [], error: null }),
  ]);
  if (productIdentity.error || variantIdentity.error) return "Product identity could not be validated. Try again.";
  const conflictingProduct = (productIdentity.data || []).find((item) => item.id !== productId && (item.slug === slug || item.sku === sku));
  if (conflictingProduct) return conflictingProduct.slug === slug ? "A product with this slug already exists." : "A product with this SKU already exists.";
  const conflictingVariant = (variantIdentity.data || []).find((item) => item.product_id !== productId && variantSkus.includes(item.sku));
  if (conflictingVariant) return "A variant with this SKU already exists.";
  const duplicateVariant = variantSkus.find((value, index) => variantSkus.indexOf(value) !== index);
  return duplicateVariant ? "Variant SKUs must be unique within the product." : null;
}

function atomicError(error: { code?: string; message?: string } | null) {
  const message = error?.message || "Product could not be saved.";
  console.error("Atomic product save failed", { code: error?.code, message });
  if (message.includes("STALE_VERSION") || error?.code === "40001") return jsonError("This product changed in another session. Reload it and try again.", 409);
  if (message.includes("INVENTORY_RESERVED")) return jsonError("A variant with active fulfillment cannot be archived.", 409);
  if (message.includes("DUPLICATE_SKU") || message.includes("CONFLICT") || error?.code === "23505") return jsonError("A product, variant SKU, option, or combination already exists.", 409);
  if (message.includes("NOT_FOUND") || error?.code === "P0002") return jsonError("The product no longer exists. Refresh the catalog.", 404);
  if (message.includes("FORBIDDEN") || error?.code === "42501") return jsonError("Commerce access required.", 403);
  if (message.includes("VALIDATION_ERROR") || error?.code === "22023") {
    const detail = message.split("VALIDATION_ERROR:")[1]?.trim();
    const safeDetails = new Set([
      "action must be create or edit.",
      "invalid JSON payload.",
      "payload exceeds limits.",
      "unsupported product field.",
      "unsupported or malformed variant field.",
      "unsupported option field.",
      "create identity/version must be null.",
      "edit requires expected_version.",
      "invalid product payload.",
      "invalid INR price.",
      "invalid INR compare-at price.",
      "invalid INR compare-at relationship.",
      "INR compare-at paise is required.",
      "invalid variant payload.",
      "invalid INR variant paise.",
      "variant price exceeds supported range.",
      "option arrays must contain strings.",
      "option values must be strings or arrays.",
      "digital variants cannot receive inventory.",
      "new physical variants require inventory.",
      "existing inventory cannot be changed here.",
      "invalid inventory initialization.",
      "invalid collection.",
      "category is invalid.",
      "inventory location is unavailable.",
    ]);
    return jsonError(detail && safeDetails.has(detail) ? detail : "Check the product, currency, price, variants, and inventory values.", 400);
  }
  return jsonError("Product could not be saved.", 400);
}

async function saveProductAtomically(supabase: Awaited<ReturnType<typeof createClient>>, action: "create" | "edit", id: string | null, product: ProductInput) {
  const variants = product.variants || [];
  const currency = product.currency_code ?? product.currency ?? STORE_CURRENCY;
  const atomicProduct: Record<string, unknown> = {
    category_id: product.category_id || null,
    title: product.title!.trim(),
    slug: product.slug,
    description: product.description || "",
    product_type: product.product_type,
    status: product.status,
    sku: product.sku!.trim(),
    price: product.price,
    compare_at_price: product.compare_at_price ?? null,
    currency,
    currency_code: currency,
    stock: product.stock ?? null,
    image_url: product.image_url || "",
  };
  if (currency === "INR") atomicProduct.price_paise = Math.round(Number(product.price) * 100);
  if (currency === "INR" && product.compare_at_price != null) atomicProduct.compare_at_price_paise = Math.round(Number(product.compare_at_price) * 100);
  if (product.collection_ids) atomicProduct.collection_ids = product.collection_ids;

  let locationId: string | null = null;
  if (product.product_type === "physical" && variants.some((variant) => !variant.id)) {
    const { data: location, error: locationError } = await supabase.from("locations").select("id").eq("is_active", true).order("created_at").limit(1).maybeSingle();
    if (locationError) return { data: null, error: { code: locationError.code, message: "VALIDATION_ERROR: inventory location is unavailable." } };
    locationId = location?.id || null;
    if (!locationId) return { data: null, error: { code: "22023", message: "VALIDATION_ERROR: create an active inventory location before adding physical variants." } };
  }

  const hasMultipleOptionlessVariants = variants.length > 1 && variants.every((variant) => !variant.options || Object.keys(variant.options).length === 0);
  const atomicVariants = variants.map((variant, index) => {
    const options = hasMultipleOptionlessVariants ? { variant: variant.label.trim() || `Variant ${index + 1}` } : (variant.options || {});
    const item: Record<string, unknown> = {
      ...(variant.id ? { id: variant.id } : {}),
      label: variant.label.trim(),
      sku: variant.sku.trim(),
      options,
      price: variant.price,
      is_active: variant.is_active ?? true,
      stock: variant.stock ?? null,
    };
    if (currency === "INR") item.price_paise = Math.round(Number(variant.price) * 100);
    if (!variant.id && product.product_type === "physical") {
      item.inventory = variant.inventory?.length
        ? variant.inventory.map((level) => ({ location_id: level.location_id, on_hand: level.on_hand, reserved: 0, reorder_point: level.reorder_point ?? 0 }))
        : [{ location_id: locationId, on_hand: variant.stock ?? 0, reserved: 0, reorder_point: 0 }];
    }
    return item;
  });

  return supabase.rpc("save_product", {
    p_action: action,
    p_product_id: id,
    p_expected_version: action === "edit" ? product.write_version ?? null : null,
    p_product: atomicProduct,
    p_variants: atomicVariants,
    p_options: [],
  });
}

async function saveProductTaxonomy(supabase: Awaited<ReturnType<typeof createClient>>, productId: string, product: ProductInput) {
  const categoryId = product.category_id || null;
  const subcategoryId = product.subcategory_id || null;
  if (subcategoryId) {
    const { data, error } = await supabase.from("subcategories").select("id,category_id").eq("id", subcategoryId).eq("is_active", true).maybeSingle();
    if (error || !data || data.category_id !== categoryId) return { error: { code: "22023", message: "VALIDATION_ERROR: subcategory must belong to the selected category." } };
  }
  const { error } = await supabase.from("products").update({ ...(product.vendor !== undefined ? { vendor: product.vendor.trim() } : {}), ...(product.merchandise_type !== undefined ? { merchandise_type: product.merchandise_type.trim() } : {}), ...(product.tags !== undefined ? { tags: [...new Set(product.tags.map(tag => tag.trim()))] } : {}), subcategory_id: subcategoryId, design_origin: product.design_origin || "original_zerocraft", rights_status: product.rights_status || "not_applicable", digital_delivery: product.digital_delivery || { mode: "instant", download_limit: 0, link_expiry_hours: 0 } }).eq("id", productId);
  return { error };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const access = await requireCommercePermission("catalog.manage");
  if (!access.ok) return access.response;
  const { supabase, user } = access;
  let body: { entity?: string; data?: CategoryInput | ProductInput };
  try { body = await request.json(); } catch { return jsonError("Invalid request body."); }
  const data = body.data || {};
  if (body.entity === "subcategory") {
    const subcategory = data as SubcategoryInput;
    if (!subcategory.category_id || !subcategory.name?.trim() || !validSlug(subcategory.slug)) return jsonError("A parent category, name, and valid URL slug are required.");
    const { data: created, error } = await supabase.from("subcategories").insert({ category_id: subcategory.category_id, name: subcategory.name.trim(), slug: subcategory.slug, description: subcategory.description || "", image_url: subcategory.image_url || "", sort_order: subcategory.sort_order ?? 0, is_active: subcategory.is_active ?? true }).select("id").single();
    if (!error) {
      revalidateStoreCatalog();
      await recordCatalogAudit(supabase, { actor_id: user.id, action: "catalog.subcategory_created", entity_type: "store_subcategory", entity_id: created.id, metadata: { name: subcategory.name.trim(), slug: subcategory.slug, category_id: subcategory.category_id } });
    }
    return error ? jsonError(error.code === "23505" ? "That subcategory slug already exists under this category." : "Subcategory could not be created.", 400) : Response.json({ id: created.id }, { status: 201 });
  }
  if (body.entity === "category") {
    const category = data as CategoryInput;
    if (!category.name?.trim() || !validSlug(category.slug)) return jsonError("A category name and valid URL slug are required.");
    const { data: created, error } = await supabase.from("categories").insert({ name: category.name.trim(), slug: category.slug, description: category.description || "", image_url: category.image_url || "", is_active: category.is_active ?? true }).select("id").single();
    if (!error) {
      revalidateStoreCatalog();
      await recordCatalogAudit(supabase, { actor_id: user.id, action: "catalog.category_created", entity_type: "store_category", entity_id: created.id, metadata: { name: category.name.trim(), slug: category.slug, is_active: category.is_active ?? true } });
    }
    return error ? jsonError(error.code === "23505" ? "That category slug already exists." : "Category could not be created.", 400) : Response.json({ id: created.id }, { status: 201 });
  }
  if (body.entity !== "product") return jsonError("Choose a valid store record type.");
  const product = data as ProductInput;
  const validationError = validateProductInput(product);
  if (validationError) return jsonError(validationError);
  const identityError = await validateProductIdentity(supabase, product, null);
  if (identityError) return jsonError(identityError, 409);
  const { data: saved, error } = await saveProductAtomically(supabase, "create", null, product);
  if (error) return atomicError(error);
  const savedProduct = saved as { product_id?: string } | null;
  if (!savedProduct?.product_id) return jsonError("Product could not be saved.");
  const taxonomy = await saveProductTaxonomy(supabase, savedProduct.product_id, product);
  if (taxonomy.error) return jsonError("The product taxonomy could not be saved.", 400);
  await recordCatalogAudit(supabase, { actor_id: user.id, action: "catalog.product_created", entity_type: "store_product", entity_id: savedProduct.product_id, metadata: { title: product.title!.trim(), slug: product.slug, sku: product.sku!.trim(), status: product.status, variant_count: product.variants?.length || 0 } });
  revalidateStoreCatalog(product.slug);
  return Response.json({ id: savedProduct?.product_id }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const access = await requireCommercePermission("catalog.manage");
  if (!access.ok) return access.response;
  const { supabase, user } = access;
  let body: { entity?: string; id?: string; action?: string; data?: CategoryInput | ProductInput; product_ids?: unknown; subcategory_id?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid request body."); }
  if (body.entity === "category_items") {
    if (!body.id || !Array.isArray(body.product_ids) || body.product_ids.length > 1000 || !body.product_ids.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))) return jsonError("Choose valid category items.");
    const subcategoryId = typeof body.subcategory_id === "string" ? body.subcategory_id : null;
    if (subcategoryId) {
      const { data: subcategory, error } = await supabase.from("subcategories").select("id,category_id").eq("id", subcategoryId).eq("category_id", body.id).maybeSingle();
      if (error || !subcategory) return jsonError("The selected subcategory is unavailable.", 404);
    } else {
      const { data: category, error } = await supabase.from("categories").select("id").eq("id", body.id).maybeSingle();
      if (error || !category) return jsonError("The selected category is unavailable.", 404);
    }
    const { error: assignmentError } = await supabase.rpc("assign_products_to_category", {
      p_category_id: body.id,
      p_subcategory_id: subcategoryId,
      p_product_ids: body.product_ids,
    });
    if (assignmentError) {
      if (assignmentError.code === "P0002") return jsonError("One or more selected products no longer exist.", 404);
      if (assignmentError.code === "42501") return jsonError("Commerce access required.", 403);
      return jsonError("Category items could not be updated atomically.", 503);
    }
    revalidateStoreCatalog();
    await recordCatalogAudit(supabase, { actor_id: user.id, action: "catalog.items_assigned", entity_type: "store_category", entity_id: body.id, metadata: { subcategory_id: subcategoryId, product_count: body.product_ids.length } });
    return Response.json({ ok: true });
  }
  if (body.entity === "product" && body.action === "restore") {
    if (!body.id) return jsonError("A product is required.");
    const { data: deleted, error: findError } = await supabase.from("products").select("id,slug,deleted_at,purge_after,deleted_from_status").eq("id", body.id).maybeSingle();
    if (findError) return jsonError("The deleted product could not be loaded.", 503);
    if (!deleted) return jsonError("This product has already been permanently removed.", 404);
    if (!deleted.deleted_at) return jsonError("This product is not in Recently deleted.", 409);
    if (new Date(deleted.purge_after).getTime() <= Date.now()) return jsonError("The restore window has expired.", 410);
    const { error: restoreError } = await supabase.from("products").update({ status: deleted.deleted_from_status || "draft", deleted_at: null, purge_after: null, deleted_from_status: null, updated_at: new Date().toISOString() }).eq("id", body.id).not("deleted_at", "is", null);
    if (restoreError) return jsonError("The product could not be restored.", 400);
    revalidateStoreCatalog(deleted.slug);
    await recordCatalogAudit(supabase, { actor_id: user.id, action: "catalog.product_restored", entity_type: "store_product", entity_id: body.id, metadata: { restored_status: deleted.deleted_from_status || "draft" } });
    return Response.json({ ok: true, restored: true });
  }
  if (!body.id || !body.data || typeof body.data !== "object") return jsonError("A record and its changes are required.");
  const data = body.data;
  if (body.entity === "subcategory") {
    const subcategory = data as SubcategoryInput;
    if (!subcategory.category_id || !subcategory.name?.trim() || !validSlug(subcategory.slug)) return jsonError("A parent category, name, and valid URL slug are required.");
    const { error } = await supabase.from("subcategories").update({ category_id: subcategory.category_id, name: subcategory.name.trim(), slug: subcategory.slug, description: subcategory.description || "", image_url: subcategory.image_url || "", sort_order: subcategory.sort_order ?? 0, is_active: subcategory.is_active ?? true, updated_at: new Date().toISOString() }).eq("id", body.id);
    if (!error) {
      revalidateStoreCatalog();
      await recordCatalogAudit(supabase, { actor_id: user.id, action: "catalog.subcategory_updated", entity_type: "store_subcategory", entity_id: body.id, metadata: { name: subcategory.name.trim(), slug: subcategory.slug, category_id: subcategory.category_id, is_active: subcategory.is_active ?? true } });
    }
    return error ? jsonError(error.code === "23505" ? "That subcategory slug already exists under this category." : "Subcategory could not be updated.") : Response.json({ ok: true });
  }
  if (body.entity === "category") {
    const category = data as CategoryInput;
    if (!category.name?.trim() || !validSlug(category.slug)) return jsonError("A category name and valid URL slug are required.");
    const { error } = await supabase.from("categories").update({ name: category.name.trim(), slug: category.slug, description: category.description || "", image_url: category.image_url || "", is_active: category.is_active ?? true, updated_at: new Date().toISOString() }).eq("id", body.id);
    if (!error) {
      revalidateStoreCatalog(category.slug);
      await recordCatalogAudit(supabase, { actor_id: user.id, action: "catalog.category_updated", entity_type: "store_category", entity_id: body.id, metadata: { name: category.name.trim(), slug: category.slug, is_active: category.is_active ?? true } });
    }
    return error ? jsonError(error.code === "23505" ? "That category slug already exists." : "Category could not be updated.") : Response.json({ ok: true });
  }
  if (body.entity !== "product") return jsonError("Choose a valid store record type.");
  const { data: editableProduct, error: editableProductError } = await supabase
    .from("products")
    .select("id,deleted_at")
    .eq("id", body.id)
    .maybeSingle();
  if (editableProductError) return jsonError("The product could not be loaded.", 503);
  if (!editableProduct) return jsonError("Product not found.", 404);
  if (editableProduct.deleted_at) return jsonError("Restore this product from Recently deleted before editing it.", 409);
  const product = data as ProductInput;
  const validationError = validateProductInput(product);
  if (validationError) return jsonError(validationError);
  const identityError = await validateProductIdentity(supabase, product, body.id || null);
  if (identityError) return jsonError(identityError, 409);
  const { error } = await saveProductAtomically(supabase, "edit", body.id, product);
  if (error) return atomicError(error);
  const taxonomy = await saveProductTaxonomy(supabase, body.id, product);
  if (taxonomy.error) return jsonError("The product taxonomy could not be saved.", 400);
  await recordCatalogAudit(supabase, { actor_id: user.id, action: "catalog.product_updated", entity_type: "store_product", entity_id: body.id, metadata: { title: product.title!.trim(), slug: product.slug, sku: product.sku!.trim(), status: product.status, variant_count: product.variants?.length || 0 } });
  revalidateStoreCatalog(product.slug);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const access = await requireCommercePermission("catalog.manage");
  if (!access.ok) return access.response;
  const { supabase, user } = access;
  let body: { entity?: string; id?: string };
  try { body = await request.json(); } catch { return jsonError("Invalid request body."); }
  if (!body.id || !["product", "category", "subcategory"].includes(body.entity || "")) return jsonError("Choose a valid store record.");
  let changes: Record<string, unknown>;
  if (body.entity === "product") {
    const { data: existing, error: existingError } = await supabase.from("products").select("status,deleted_at").eq("id", body.id).maybeSingle();
    if (existingError) return jsonError("The product could not be loaded.", 503);
    if (!existing) return jsonError("Product not found.", 404);
    if (existing.deleted_at) return Response.json({ ok: true, deleted: true });
    const deletedAt = new Date();
    changes = { status: "archived", deleted_from_status: existing.status, deleted_at: deletedAt.toISOString(), purge_after: new Date(deletedAt.getTime() + 15 * 86400000).toISOString(), updated_at: deletedAt.toISOString() };
  } else if (body.entity === "category" || body.entity === "subcategory") {
    if (!/^[0-9a-f-]{36}$/i.test(body.id)) return jsonError("Choose a valid category.");
    const { error } = body.entity === "category"
      ? await supabase.rpc("soft_delete_store_category", { p_category_id: body.id })
      : await supabase.rpc("soft_delete_store_subcategory", { p_subcategory_id: body.id });
    if (error) {
      if (error.code === "P0002") return jsonError("Category not found.", 404);
      return jsonError("The category could not be moved to Recently deleted.", 503);
    }
    revalidateStoreCatalog();
    await recordCatalogAudit(supabase, {
      actor_id: user.id,
      action: `catalog.${body.entity}_deleted`,
      entity_type: body.entity === "category" ? "store_category" : "store_subcategory",
      entity_id: body.id,
      metadata: { retention_days: 15, category_tree: body.entity === "category" },
    });
    return Response.json({ ok: true, deleted: true });
  } else {
    return jsonError("Choose a valid store record.");
  }
  const { error } = await supabase.from("products").update(changes).eq("id", body.id);
  if (!error) {
    revalidateStoreCatalog();
    await recordCatalogAudit(supabase, { actor_id: user.id, action: "catalog.product_deleted", entity_type: "store_product", entity_id: body.id, metadata: { retention_days: 15 } });
  }
  return error ? jsonError("The product could not be moved to Recently deleted.") : Response.json({ ok: true, deleted: true });
}


