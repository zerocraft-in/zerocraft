import { getRequestStoreConfig } from "@zerocraft/supabase/store-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireCommercePermission } from "@/lib/commerce-auth";
import { isSameOrigin } from "@/lib/request-origin";
import { isProductMediaPath, PRODUCT_MEDIA_BUCKET, requireCommerceStorageClient, safeObjectKey, validateStorageFile } from "@/lib/storage/server";
import { deleteR2Object, isR2Configured, listR2Objects, putR2Object, r2PublicUrl } from "@/lib/r2/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Access = Extract<Awaited<ReturnType<typeof requireCommercePermission>>, { ok: true }>;
type StorageEntry = { name: string; id: string | null; created_at?: string | null; updated_at?: string | null; metadata?: { mimetype?: string; size?: number } | null };
type RawAsset = { path: string; url: string; name: string; folder: string; mimeType: string; size: number; createdAt: string | null; updatedAt: string | null };

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function storageClient(fallback: Access["supabase"]) {
  const { url, serviceKey: key } = await getRequestStoreConfig();
  return url && key ? createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : fallback;
}

function fileName(path: string) { return path.split("/").pop() || path; }
function folderName(path: string) { const name = fileName(path); return path.slice(0, Math.max(0, path.length - name.length - 1)); }
function inferMimeType(path: string) { const extension = path.split(".").pop()?.toLowerCase(); return extension === "jpg" ? "image/jpeg" : extension === "png" ? "image/png" : "image/webp"; }

function isSupportedAssetPath(path: string) {
  const parts = path.replace(/^r2\//, "").split("/");
  const uuidFile = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;
  if (parts[0] === "assets" && (parts[1] === "products" || parts[1] === "library")) return parts.length === 3 && uuidFile.test(parts[2] || "");
  if (parts[0] === "products") return parts.length === 3 && uuidFile.test(parts[2] || "");
  if (parts[0] === "categories" || parts[0] === "library") return uuidFile.test(parts.at(-1) || "");
  return false;
}

async function listSupabaseFiles(storage: Awaited<ReturnType<typeof storageClient>>) {
  const roots = await storage.storage.from(PRODUCT_MEDIA_BUCKET).list("", { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (roots.error) throw roots.error;
  const prefixes = ["library", "categories"];
  if ((roots.data || []).some((entry) => !entry.id && entry.name === "products")) {
    const products = await storage.storage.from(PRODUCT_MEDIA_BUCKET).list("products", { limit: 1000 });
    if (products.error) throw products.error;
    prefixes.push(...(products.data || []).filter((entry) => !entry.id).map((entry) => `products/${entry.name}`));
  }
  const files = await Promise.all(prefixes.map(async (prefix) => {
    const result = await storage.storage.from(PRODUCT_MEDIA_BUCKET).list(prefix, { limit: 1000 });
    if (result.error) throw result.error;
    return (result.data || []).filter((entry: StorageEntry) => entry.id && entry.metadata).map((entry: StorageEntry) => {
      const path = `${prefix}/${entry.name}`;
      return { path, name: entry.name, folder: prefix, url: storage.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl, mimeType: entry.metadata?.mimetype || inferMimeType(path), size: entry.metadata?.size || 0, createdAt: entry.created_at || null, updatedAt: entry.updated_at || null };
    });
  }));
  return files.flat();
}

async function getAssetReferences(access: Access, assets: RawAsset[]) {
  const [media, products, categories, subcategories, recycled, metadata] = await Promise.all([
    access.supabase.from("product_media").select("id,storage_path,public_url,alt_text,is_primary,product_id,products(id,title,slug,status)"),
    access.supabase.from("products").select("id,title,slug,status,image_url"),
    access.supabase.from("categories").select("id,name,slug,image_url"),
    access.supabase.from("subcategories").select("id,name,slug,image_url"),
    access.supabase.from("deleted_files").select("storage_path"),
    access.supabase.from("files").select("storage_path,public_url,file_name,folder,alt_text,mime_type,size_bytes,created_at,updated_at"),
  ]);
  const failed = media.error || products.error || categories.error || subcategories.error || recycled.error || metadata.error;
  if (failed) throw failed;
  const recycledPaths = new Set((recycled.data || []).map((item) => item.storage_path));
  const metadataByPath = new Map((metadata.data || []).map((item) => [item.storage_path, item]));
  const mediaRows = (media.data || []) as Array<Record<string, any>>;
  return assets.filter((asset) => !recycledPaths.has(asset.path)).map((asset) => {
    const saved = metadataByPath.get(asset.path);
    const references = mediaRows.filter((row) => row.storage_path === asset.path || row.public_url === asset.url).map((row) => ({ id: row.id, type: "product" as const, productId: row.product_id, label: row.products?.title || "Product", slug: row.products?.slug || "", isPrimary: Boolean(row.is_primary) }));
    const relatedProducts = (products.data || []).filter((row) => row.image_url === asset.url).map((row) => ({ id: row.id, type: "product" as const, productId: row.id, label: row.title, slug: row.slug, isPrimary: true }));
    const relatedCategories = (categories.data || []).filter((row) => row.image_url === asset.url).map((row) => ({ id: row.id, type: "category" as const, productId: null, label: row.name, slug: row.slug, isPrimary: false }));
    const relatedSubcategories = (subcategories.data || []).filter((row) => row.image_url === asset.url).map((row) => ({ id: row.id, type: "subcategory" as const, productId: null, label: row.name, slug: row.slug, isPrimary: false }));
    const allReferences = [...references, ...relatedProducts, ...relatedCategories, ...relatedSubcategories].filter((reference, index, list) => list.findIndex((item) => item.id === reference.id && item.type === reference.type) === index);
    return { ...asset, folder: saved?.folder || asset.folder, fileName: saved?.file_name || asset.name, altText: saved?.alt_text || references[0]?.label || "", mimeType: saved?.mime_type || asset.mimeType, size: saved?.size_bytes || asset.size, createdAt: saved?.created_at || asset.createdAt, updatedAt: saved?.updated_at || asset.updatedAt, referenced: allReferences.length > 0, references: allReferences };
  });
}

export async function GET() {
  const access = await requireCommercePermission("catalog.read");
  if (!access.ok) return access.response;
  try {
    const storage = await storageClient(access.supabase);
    const rawAssets = isR2Configured() ? (await listR2Objects()).map((object) => ({ path: `r2/${object.key}`, name: fileName(object.key), folder: folderName(object.key), url: r2PublicUrl(object.key), mimeType: inferMimeType(object.key), size: object.size, createdAt: object.lastModified, updatedAt: object.lastModified })) : await listSupabaseFiles(storage);
    const [assets, products] = await Promise.all([getAssetReferences(access, rawAssets), access.supabase.from("products").select("id,title,slug,status").order("title")]);
    if (products.error) return errorResponse("Products could not be loaded for media references.", 503);
    return Response.json({ bucket: PRODUCT_MEDIA_BUCKET, provider: isR2Configured() ? "r2" : "supabase", assets, products: products.data || [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      return errorResponse("The media storage provider did not respond in time. Check the R2 or Supabase Storage connection and retry.", 503);
    }
    return errorResponse("The media library could not be loaded. Check the storage metadata migration.", 503);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  const access = await requireCommercePermission("catalog.manage");
  if (!access.ok) return access.response;
  const form = await request.formData();
  const file = form.get("file");
  const productId = form.get("productId");
  const altText = form.get("altText");
  const folder = typeof form.get("folder") === "string" ? String(form.get("folder")).trim().slice(0, 120) : "library";
  if (!(file instanceof File)) return errorResponse("Choose an image file to upload.");
  let extension: string;
  try { ({ extension } = validateStorageFile(file, PRODUCT_MEDIA_BUCKET)); } catch (error) { return errorResponse(error instanceof Error ? error.message : "The image file is invalid."); }
  const storage = await storageClient(access.supabase);
  const selectedProductId = typeof productId === "string" && productId ? productId : null;
  let product: { id: string; title: string; slug: string } | null = null;
  if (selectedProductId) {
    const result = await access.supabase.from("products").select("id,title,slug").eq("id", selectedProductId).maybeSingle();
    if (result.error) return errorResponse("The product could not be verified.", 503);
    if (!result.data) return errorResponse("Product not found.", 404);
    product = result.data;
  }
  const sourcePath = safeObjectKey("library", extension);
  let storagePath = sourcePath;
  let publicUrl = "";
  try {
    if (isR2Configured()) {
      const uploaded = await putR2Object({ sourcePath, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
      storagePath = uploaded.storagePath;
      publicUrl = uploaded.publicUrl;
    } else {
      const uploaded = await storage.storage.from(PRODUCT_MEDIA_BUCKET).upload(sourcePath, file, { contentType: file.type, upsert: false });
      if (uploaded.error) return errorResponse("Supabase Storage rejected this image.", 502);
      publicUrl = storage.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(sourcePath).data.publicUrl;
    }
    const metadata = await access.supabase.from("files").insert({ storage_path: storagePath, public_url: publicUrl, file_name: file.name.slice(0, 180), folder: folder || "library", alt_text: typeof altText === "string" ? altText.trim().slice(0, 240) : product?.title || "", mime_type: file.type, size_bytes: file.size, created_by: access.user.id }).select("storage_path,public_url,file_name,folder,alt_text,mime_type,size_bytes,created_at,updated_at").single();
    if (metadata.error) throw metadata.error;
    if (product) {
      const existing = await access.supabase.from("product_media").select("sort_order").eq("product_id", product.id).order("sort_order", { ascending: false }).limit(1);
      if (existing.error) throw existing.error;
      const linked = await access.supabase.from("product_media").insert({ product_id: product.id, storage_path: storagePath, public_url: publicUrl, alt_text: typeof altText === "string" ? altText.trim().slice(0, 240) : product.title, media_type: "image", sort_order: existing.data?.[0] ? existing.data[0].sort_order + 1 : 0, is_primary: !existing.data?.length });
      if (linked.error) throw linked.error;
    }
    return Response.json({ asset: metadata.data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    await access.supabase.from("files").delete().eq("storage_path", storagePath);
    if (storagePath.startsWith("r2/")) { try { await deleteR2Object(storagePath); } catch { /* best effort cleanup */ } } else await storage.storage.from(PRODUCT_MEDIA_BUCKET).remove([sourcePath]);
    return errorResponse(error instanceof Error ? error.message : "The file could not be saved.", 503);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  const access = await requireCommercePermission("catalog.manage");
  if (!access.ok) return access.response;
  let body: { path?: unknown; altText?: unknown; productId?: unknown; fileName?: unknown; folder?: unknown };
  try { body = await request.json(); } catch { return errorResponse("Invalid media request."); }
  if (typeof body.path !== "string" || !isSupportedAssetPath(body.path)) return errorResponse("Choose a valid media asset.");
  const altText = typeof body.altText === "string" ? body.altText.trim().slice(0, 240) : undefined;
  const storagePath = body.path;
  const { data: asset, error: assetError } = await access.supabase.from("files").select("storage_path,public_url,alt_text").eq("storage_path", storagePath).maybeSingle();
  if (assetError) return errorResponse("Media metadata could not be loaded.", 503);
  if (!asset) return errorResponse("Media asset not found.", 404);
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : undefined;
  const folder = typeof body.folder === "string" ? body.folder.trim() : undefined;
  if (fileName !== undefined && (!fileName || fileName.length > 180 || /[/\\]/.test(fileName))) return errorResponse("Enter a file name of 1–180 characters without slashes.");
  if (folder !== undefined && (!folder || folder.length > 120)) return errorResponse("Enter a folder of 1–120 characters.");
  if (fileName !== undefined || folder !== undefined) {
    const update = await access.supabase.from("files").update({ ...(fileName !== undefined ? { file_name: fileName } : {}), ...(folder !== undefined ? { folder } : {}), updated_at: new Date().toISOString() }).eq("storage_path", storagePath);
    if (update.error) return errorResponse("File details could not be saved.", 503);
  }
  if (altText !== undefined) {
    const update = await access.supabase.from("files").update({ alt_text: altText, updated_at: new Date().toISOString() }).eq("storage_path", storagePath);
    if (update.error) return errorResponse("Alt text could not be saved.", 503);
    const linked = await access.supabase.from("product_media").update({ alt_text: altText }).eq("storage_path", storagePath);
    if (linked.error) return errorResponse("The linked product metadata could not be updated.", 503);
  }
  if (typeof body.productId === "string" && body.productId) {
    const product = await access.supabase.from("products").select("id,title").eq("id", body.productId).maybeSingle();
    if (product.error) return errorResponse("The product could not be loaded.", 503);
    if (!product.data) return errorResponse("Product not found.", 404);
    const existing = await access.supabase.from("product_media").select("id").eq("product_id", body.productId).eq("storage_path", storagePath).maybeSingle();
    if (existing.error) return errorResponse("Product references could not be checked.", 503);
    if (!existing.data) {
      const order = await access.supabase.from("product_media").select("sort_order").eq("product_id", body.productId).order("sort_order", { ascending: false }).limit(1);
      if (order.error) return errorResponse("Product media order could not be loaded.", 503);
      const linked = await access.supabase.from("product_media").insert({ product_id: body.productId, storage_path: storagePath, public_url: asset.public_url, alt_text: altText ?? asset.alt_text ?? product.data.title, media_type: "image", sort_order: order.data?.[0] ? order.data[0].sort_order + 1 : 0, is_primary: !order.data?.length });
      if (linked.error) return errorResponse("The asset could not be linked to the product.", 503);
    }
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  const access = await requireCommercePermission("catalog.manage");
  if (!access.ok) return access.response;
  let body: { path?: unknown };
  try { body = await request.json(); } catch { return errorResponse("Invalid gallery request."); }
  if (typeof body.path !== "string" || !isSupportedAssetPath(body.path)) return errorResponse("Choose a valid gallery asset.");
  const storage = await storageClient(access.supabase);
  const publicUrl = body.path.startsWith("r2/") ? r2PublicUrl(body.path) : storage.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(body.path).data.publicUrl;
  const [media, products, categories, subcategories, metadata, existing] = await Promise.all([
    access.supabase.from("product_media").select("id").or(`storage_path.eq.${body.path},public_url.eq.${publicUrl}`),
    access.supabase.from("products").select("id").eq("image_url", publicUrl),
    access.supabase.from("categories").select("id").eq("image_url", publicUrl),
    access.supabase.from("subcategories").select("id").eq("image_url", publicUrl),
    access.supabase.from("files").select("file_name,folder,mime_type,size_bytes").eq("storage_path", body.path).maybeSingle(),
    access.supabase.from("deleted_files").select("storage_path").eq("storage_path", body.path).maybeSingle(),
  ]);
  const failed = media.error || products.error || categories.error || subcategories.error || metadata.error || existing.error;
  if (failed) return errorResponse("Gallery asset references could not be checked.", 503);
  if (media.data?.length || products.data?.length || categories.data?.length || subcategories.data?.length) return errorResponse("This asset is still used by a product or category. Remove its references before moving it to the bin.", 409);
  if (existing.data) return Response.json({ ok: true, alreadyDeleted: true });
  const name = metadata.data?.file_name || fileName(body.path);
  const { error } = await access.supabase.from("deleted_files").insert({ storage_path: body.path, file_name: name, folder: metadata.data?.folder || folderName(body.path), mime_type: metadata.data?.mime_type || inferMimeType(body.path), size_bytes: metadata.data?.size_bytes || 0, deleted_at: new Date().toISOString(), purge_after: new Date(Date.now() + 15 * 86400000).toISOString(), deleted_by: access.user.id });
  if (error) return errorResponse("The gallery asset could not be moved to Recently deleted.", 503);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}


