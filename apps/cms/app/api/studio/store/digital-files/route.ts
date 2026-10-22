import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isSameOrigin } from "@/lib/request-origin";
import {
  DIGITAL_PRODUCTS_BUCKET,
  isDigitalProductPath,
  requireStudioStorageClient,
  safeObjectKey,
  validateStorageFile,
} from "@/lib/storage/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

function storageClient(fallback: Awaited<ReturnType<typeof requireStudioStorageClient>>["supabase"]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : fallback;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

export async function GET(request: Request) {
  if (!isSameOrigin(request)) return fail("Invalid request origin.", 403);
  let client;
  try { client = await requireStudioStorageClient(); } catch (error) { return fail(error instanceof Error ? error.message : "Studio access required.", 403); }
  const productId = new URL(request.url).searchParams.get("productId");
  if (!validId(productId)) return fail("A valid product is required.");
  const { data, error } = await client.supabase.from("store_product_digital_files").select("id,product_id,variant_id,file_name,mime_type,size_bytes,sort_order,created_at").eq("product_id", productId).order("sort_order");
  if (error) return fail("Digital files could not be loaded. Apply the digital-products migration first.", 503);
  return Response.json({ files: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Invalid request origin.", 403);
  let client;
  try { client = await requireStudioStorageClient(); } catch (error) { return fail(error instanceof Error ? error.message : "Studio access required.", 403); }
  const storage = storageClient(client.supabase);
  const form = await request.formData();
  const productId = form.get("productId");
  const variantId = form.get("variantId");
  const file = form.get("file");
  if (!validId(productId) || !(file instanceof File)) return fail("A product and digital file are required.");
  if (variantId != null && variantId !== "" && !validId(variantId)) return fail("The selected variant is invalid.");
  let extension: string;
  try { ({ extension } = validateStorageFile(file, DIGITAL_PRODUCTS_BUCKET)); } catch (error) { return fail(error instanceof Error ? error.message : "The digital file is invalid."); }
  const { data: product, error: productError } = await client.supabase.from("store_products").select("id,product_type").eq("id", productId).maybeSingle();
  if (productError) return fail("The product could not be verified.", 503);
  if (!product || product.product_type !== "digital") return fail("Digital files can only be added to digital products.", 422);
  if (variantId) {
    const { data: variant } = await client.supabase.from("store_product_variants").select("id").eq("id", variantId).eq("product_id", productId).maybeSingle();
    if (!variant) return fail("The selected variant does not belong to this product.");
  }
  const { data: existing, error: existingError } = await client.supabase.from("store_product_digital_files").select("sort_order").eq("product_id", productId).order("sort_order", { ascending: false }).limit(1);
  if (existingError) return fail("Digital files could not be loaded. Apply the digital-products migration first.", 503);
  const storagePath = safeObjectKey(`products/${productId}`, extension);
  const { error: uploadError } = await storage.storage.from(DIGITAL_PRODUCTS_BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return fail("The digital file could not be uploaded. Check the private digital-products bucket and policy.", 502);
  const { data: digitalFile, error: insertError } = await client.supabase.from("store_product_digital_files").insert({ product_id: productId, variant_id: variantId || null, storage_path: storagePath, file_name: file.name.slice(0, 180), mime_type: file.type, size_bytes: file.size, sort_order: existing?.[0] ? existing[0].sort_order + 1 : 0 }).select("id,product_id,variant_id,file_name,mime_type,size_bytes,sort_order,created_at").single();
  if (insertError) { await storage.storage.from(DIGITAL_PRODUCTS_BUCKET).remove([storagePath]); return fail("The digital file metadata could not be saved.", 503); }
  return Response.json({ file: digitalFile }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return fail("Invalid request origin.", 403);
  let client;
  try { client = await requireStudioStorageClient(); } catch (error) { return fail(error instanceof Error ? error.message : "Studio access required.", 403); }
  let body: { productId?: unknown; fileId?: unknown; sortOrder?: unknown; variantId?: unknown };
  try { body = await request.json(); } catch { return fail("Invalid digital file request."); }
  if (!validId(body.productId) || !validId(body.fileId)) return fail("A product and digital file are required.");
  const changes: Record<string, unknown> = {};
  if (Number.isInteger(body.sortOrder) && Number(body.sortOrder) >= 0) changes.sort_order = Number(body.sortOrder);
  if (body.variantId === null || body.variantId === "") changes.variant_id = null;
  else if (validId(body.variantId)) changes.variant_id = body.variantId;
  if (!Object.keys(changes).length) return fail("Choose a valid digital file update.");
  const { error } = await client.supabase.from("store_product_digital_files").update(changes).eq("id", body.fileId).eq("product_id", body.productId);
  if (error) return fail("The digital file could not be updated.", 503);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return fail("Invalid request origin.", 403);
  let client;
  try { client = await requireStudioStorageClient(); } catch (error) { return fail(error instanceof Error ? error.message : "Studio access required.", 403); }
  const storage = storageClient(client.supabase);
  let body: { productId?: unknown; fileId?: unknown };
  try { body = await request.json(); } catch { return fail("Invalid digital file request."); }
  if (!validId(body.productId) || !validId(body.fileId)) return fail("A product and digital file are required.");
  const { data: file, error: fileError } = await client.supabase.from("store_product_digital_files").select("id,storage_path").eq("id", body.fileId).eq("product_id", body.productId).maybeSingle();
  if (fileError) return fail("Digital file could not be loaded.", 503);
  if (!file || !isDigitalProductPath(file.storage_path, body.productId)) return fail("Digital file not found.", 404);
  const { error: deleteError } = await client.supabase.from("store_product_digital_files").delete().eq("id", body.fileId).eq("product_id", body.productId);
  if (deleteError) return fail("The digital file metadata could not be removed.", 503);
  const { error: storageError } = await storage.storage.from(DIGITAL_PRODUCTS_BUCKET).remove([file.storage_path]);
  if (storageError) return fail("The file was removed from the catalog, but storage cleanup failed.", 502);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
