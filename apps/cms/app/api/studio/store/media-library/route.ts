import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireStudioPermission } from "@/lib/studio-auth";
import { isSameOrigin } from "@/lib/request-origin";
import {
  isProductMediaPath,
  PRODUCT_MEDIA_BUCKET,
  requireStudioStorageClient,
} from "@/lib/storage/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

function storageClient(fallback: Awaited<ReturnType<typeof requireStudioStorageClient>>["supabase"]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : fallback;
}

type StorageEntry = { name: string; id: string | null; created_at?: string | null; updated_at?: string | null; metadata?: { mimetype?: string; size?: number } | null };

async function listFiles(storage: ReturnType<typeof storageClient>, prefix: string) {
  const { data, error } = await storage.storage.from(PRODUCT_MEDIA_BUCKET).list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  return (data || []).filter((entry) => entry.id && entry.metadata).map((entry: StorageEntry) => {
    const path = `${prefix}/${entry.name}`;
    const { data: publicUrl } = storage.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(path);
    return { path, name: entry.name, folder: prefix, url: publicUrl.publicUrl, mimeType: entry.metadata?.mimetype || "image/*", size: entry.metadata?.size || 0, createdAt: entry.created_at || null, updatedAt: entry.updated_at || null };
  });
}

export async function GET() {
  const access = await requireStudioPermission("catalog.read");
  if (!access.ok) return access.response;
  const client = access;
  const storage = storageClient(client.supabase);
  try {
    const { data: roots, error: rootError } = await storage.storage.from(PRODUCT_MEDIA_BUCKET).list("", { limit: 100, sortBy: { column: "name", order: "asc" } });
    if (rootError) throw rootError;
    const folders = (roots || []).filter((entry) => !entry.id).map((entry) => entry.name);
    const prefixes = folders.includes("categories") ? ["categories"] : [];
    if (folders.includes("products")) {
      const { data: productFolders, error: productFolderError } = await storage.storage.from(PRODUCT_MEDIA_BUCKET).list("products", { limit: 1000 });
      if (productFolderError) throw productFolderError;
      prefixes.push(...(productFolders || []).filter((entry) => !entry.id).map((entry) => `products/${entry.name}`));
    }
    const [groups, productMedia, products, categories, subcategories, recycled] = await Promise.all([
      Promise.all(prefixes.map((prefix) => listFiles(storage, prefix))),
      client.supabase.from("store_product_media").select("storage_path"),
      client.supabase.from("store_products").select("image_url"),
      client.supabase.from("store_categories").select("image_url"),
      client.supabase.from("store_subcategories").select("image_url"),
      client.supabase.from("store_recycle_bin_assets").select("storage_path"),
    ]);
    const failed = productMedia.error || products.error || categories.error || subcategories.error || recycled.error;
    if (failed) return errorResponse("Gallery references could not be verified.", 503);
    const referencedPaths = new Set((productMedia.data || []).map((media) => media.storage_path));
    const referencedUrls = new Set([
      ...(products.data || []).map((product) => product.image_url),
      ...(categories.data || []).map((category) => category.image_url),
      ...(subcategories.data || []).map((subcategory) => subcategory.image_url),
    ].filter(Boolean));
    const recycledPaths = new Set((recycled.data || []).map((asset) => asset.storage_path));
    const assets = groups.flat()
      .filter((asset) => !recycledPaths.has(asset.path))
      .map((asset) => ({
        ...asset,
        referenced: referencedPaths.has(asset.path) || referencedUrls.has(asset.url),
      }))
      .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
    return Response.json({ bucket: PRODUCT_MEDIA_BUCKET, assets }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return errorResponse("The Supabase Storage media library could not be loaded.", 503); }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  const access = await requireStudioPermission("catalog.manage");
  if (!access.ok) return access.response;
  let body: { path?: unknown };
  try { body = await request.json(); } catch { return errorResponse("Invalid gallery request."); }
  if (typeof body.path !== "string") return errorResponse("Choose a gallery asset.");

  const safeCategoryPath = /^categories\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(body.path);
  const productMatch = body.path.match(/^products\/([0-9a-f-]{36})\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i);
  const safeProductPath = productMatch && isProductMediaPath(body.path, productMatch[1]);
  if (!safeCategoryPath && !safeProductPath) return errorResponse("This gallery asset cannot be moved to the recycle bin.", 400);

  const storage = storageClient(access.supabase);
  const { data: publicUrl } = storage.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(body.path);
  const [media, products, categories, subcategories, existing] = await Promise.all([
    access.supabase.from("store_product_media").select("id").eq("storage_path", body.path).limit(1),
    access.supabase.from("store_products").select("id").eq("image_url", publicUrl.publicUrl).limit(1),
    access.supabase.from("store_categories").select("id").eq("image_url", publicUrl.publicUrl).limit(1),
    access.supabase.from("store_subcategories").select("id").eq("image_url", publicUrl.publicUrl).limit(1),
    access.supabase.from("store_recycle_bin_assets").select("storage_path").eq("storage_path", body.path).maybeSingle(),
  ]);
  const failed = media.error || products.error || categories.error || subcategories.error || existing.error;
  if (failed) return errorResponse("Gallery asset references could not be checked.", 503);
  if (media.data?.length || products.data?.length || categories.data?.length || subcategories.data?.length) {
    return errorResponse("This asset is still used by a product or category. Remove its references before moving it to the bin.", 409);
  }
  if (existing.data) return Response.json({ ok: true, alreadyDeleted: true });

  const fileName = body.path.split("/").pop()!;
  const folder = body.path.slice(0, body.path.length - fileName.length - 1);
  const { data: fileList, error: storageError } = await storage.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .list(folder, { search: fileName, limit: 10 });
  if (storageError) return errorResponse("The gallery asset could not be verified in storage.", 503);
  const file = fileList?.find((item) => item.name === fileName && item.id);
  if (!file) return errorResponse("Gallery asset not found.", 404);

  const deletedAt = new Date();
  const { error } = await access.supabase.from("store_recycle_bin_assets").insert({
    storage_path: body.path,
    file_name: fileName,
    folder,
    mime_type: file.metadata?.mimetype || "image/*",
    size_bytes: file.metadata?.size || 0,
    deleted_at: deletedAt.toISOString(),
    purge_after: new Date(deletedAt.getTime() + 15 * 86400000).toISOString(),
    deleted_by: access.user.id,
  });
  if (error) return errorResponse("The gallery asset could not be moved to Recently deleted.", 503);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
