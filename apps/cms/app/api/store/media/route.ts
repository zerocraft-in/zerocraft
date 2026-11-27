import { getRequestStoreConfig } from "@zerocraft/supabase/store-server";
import { revalidatePath } from "next/cache";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isSameOrigin } from "@/lib/request-origin";
import {
  PRODUCT_MEDIA_BUCKET,
  isProductMediaPath,
  requireCommerceStorageClient,
  safeObjectKey,
  validateStorageFile,
} from "@/lib/storage/server";
import { isR2Configured, putR2Object, deleteR2Object } from "@/lib/r2/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

function refreshProduct(slug?: string) {
  revalidatePath("/store", "layout");
  revalidatePath("/api/store/catalog");
  if (slug) revalidatePath(`/store/product/${slug}`);
}

async function storageClient(fallback: Awaited<ReturnType<typeof requireCommerceStorageClient>>["supabase"]) {
  const { url, serviceKey: key } = await getRequestStoreConfig();
  return url && key ? createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : fallback;
}

function uploadErrorMessage(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  if (message.includes("bucket") && message.includes("not found")) return "The product-media Storage bucket is missing in Supabase.";
  if (message.includes("row-level security") || message.includes("not authorized") || message.includes("permission")) return "Supabase Storage denied the Commerce upload. Check the product-media Commerce policy.";
  if (message.includes("mime") || message.includes("content type")) return "Supabase Storage rejected this image type. Use JPEG, PNG, or WebP.";
  return "The product image could not be uploaded. Check the product-media bucket and Storage policy.";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  let client;
  try {
    client = await requireCommerceStorageClient("catalog.manage");
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Commerce access required.", 403);
  }
  const storage = await storageClient(client.supabase);
  const form = await request.formData();
  const productId = form.get("productId");
  const altText = form.get("altText");
  const file = form.get("file");
  if (typeof productId !== "string" || !/^[0-9a-f-]{36}$/i.test(productId) || !(file instanceof File)) return errorResponse("A product and image file are required.");
  if (altText != null && (typeof altText !== "string" || altText.length > 240)) return errorResponse("Alt text is too long.");

  let extension: string;
  try {
    ({ extension } = validateStorageFile(file, PRODUCT_MEDIA_BUCKET));
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "The image file is invalid.");
  }

  const { data: product, error: productError } = await client.supabase.from("products").select("id,slug").eq("id", productId).maybeSingle();
  if (productError) return errorResponse("The product could not be verified.", 503);
  if (!product) return errorResponse("Product not found.", 404);
  const { data: existing, error: existingError } = await client.supabase.from("product_media").select("sort_order").eq("product_id", productId).order("sort_order", { ascending: false }).limit(1);
  if (existingError) return errorResponse("Product media could not be loaded.", 503);
  const storagePath = safeObjectKey(isR2Configured() ? "products" : `products/${productId}`, extension);
  let persistedPath = storagePath;
  let publicUrl: string;
  if (isR2Configured()) {
    try {
      const uploaded = await putR2Object({ sourcePath: storagePath, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
      persistedPath = uploaded.storagePath;
      publicUrl = uploaded.publicUrl;
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Cloudflare R2 rejected the image.", 502);
    }
  } else {
    const { error: uploadError } = await storage.storage.from(PRODUCT_MEDIA_BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) return errorResponse(uploadErrorMessage(uploadError), 502);
    publicUrl = storage.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  }
  const { data: media, error: mediaError } = await client.supabase.from("product_media").insert({
    product_id: productId,
    storage_path: persistedPath,
    public_url: publicUrl,
    alt_text: typeof altText === "string" ? altText.trim() : product.slug,
    media_type: "image",
    sort_order: existing?.[0] ? existing[0].sort_order + 1 : 0,
    is_primary: !existing?.[0],
  }).select("id,storage_path,public_url,alt_text,sort_order,media_type,is_primary").single();
  if (mediaError) {
    if (persistedPath.startsWith("r2/")) await deleteR2Object(persistedPath);
    else await storage.storage.from(PRODUCT_MEDIA_BUCKET).remove([storagePath]);
    return errorResponse("The product image metadata could not be saved.", 503);
  }
  refreshProduct(product.slug);
  return Response.json({ media }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  let client;
  try {
    client = await requireCommerceStorageClient("catalog.manage");
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Commerce access required.", 403);
  }
  const storage = await storageClient(client.supabase);
  let body: { productId?: unknown; mediaId?: unknown; action?: unknown; sortOrder?: unknown };
  try { body = await request.json(); } catch { return errorResponse("Invalid media request."); }
  if (typeof body.productId !== "string" || typeof body.mediaId !== "string") return errorResponse("A product and media record are required.");
  const { data: media, error: mediaError } = await client.supabase.from("product_media").select("id,product_id,storage_path").eq("id", body.mediaId).eq("product_id", body.productId).maybeSingle();
  if (mediaError) return errorResponse("Product media could not be loaded.", 503);
  if (!media || !isProductMediaPath(media.storage_path, body.productId)) return errorResponse("Product media not found.", 404);
  if (body.action === "primary") {
    const { error: clearError } = await client.supabase.from("product_media").update({ is_primary: false }).eq("product_id", body.productId);
    if (clearError) return errorResponse("The primary image could not be updated.", 503);
    const { error } = await client.supabase.from("product_media").update({ is_primary: true }).eq("id", body.mediaId).eq("product_id", body.productId);
    if (error) return errorResponse("The primary image could not be updated.", 503);
  } else if (body.action === "reorder" && Number.isInteger(body.sortOrder) && Number(body.sortOrder) >= 0) {
    const { error } = await client.supabase.from("product_media").update({ sort_order: Number(body.sortOrder) }).eq("id", body.mediaId).eq("product_id", body.productId);
    if (error) return errorResponse("The image order could not be updated.", 503);
  } else {
    return errorResponse("Choose a valid media action.");
  }
  refreshProduct();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  let client;
  try {
    client = await requireCommerceStorageClient("catalog.manage");
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Commerce access required.", 403);
  }
  const storage = await storageClient(client.supabase);
  let body: { productId?: unknown; mediaId?: unknown };
  try { body = await request.json(); } catch { return errorResponse("Invalid media request."); }
  if (typeof body.productId !== "string" || typeof body.mediaId !== "string") return errorResponse("A product and media record are required.");
  const { data: media, error: mediaError } = await client.supabase.from("product_media").select("id,product_id,storage_path").eq("id", body.mediaId).eq("product_id", body.productId).maybeSingle();
  if (mediaError) return errorResponse("Product media could not be loaded.", 503);
  if (!media || !isProductMediaPath(media.storage_path, body.productId)) return errorResponse("Product media not found.", 404);
  const { data: remaining, error: deleteError } = await client.supabase.from("product_media").delete().eq("id", body.mediaId).eq("product_id", body.productId).select("id");
  if (deleteError || !remaining?.length) return errorResponse("The image metadata could not be removed; the storage object was retained.", 503);
  if (media.storage_path.startsWith("r2/")) {
    try { await deleteR2Object(media.storage_path); } catch { return errorResponse("Image metadata was removed, but the R2 object could not be removed. Retry cleanup.", 502); }
  } else {
    const { error: storageError } = await storage.storage.from(PRODUCT_MEDIA_BUCKET).remove([media.storage_path]);
    if (storageError) return errorResponse("Image metadata was removed, but the storage object could not be removed. Retry cleanup.", 502);
  }
  const { data: afterDelete, error: remainingError } = await client.supabase.from("product_media").select("id,is_primary").eq("product_id", body.productId).order("sort_order", { ascending: true }).limit(1);
  if (remainingError) return errorResponse("The image was removed, but primary-image verification failed.", 503);
  if (afterDelete?.[0]) {
    const { error: clearError } = await client.supabase.from("product_media").update({ is_primary: false }).eq("product_id", body.productId);
    if (clearError) return errorResponse("The image was removed, but primary-image repair failed.", 503);
    const { error: primaryError } = await client.supabase.from("product_media").update({ is_primary: true }).eq("id", afterDelete[0].id).eq("product_id", body.productId);
    if (primaryError) return errorResponse("The image was removed, but primary-image repair failed.", 503);
  }
  refreshProduct();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}


