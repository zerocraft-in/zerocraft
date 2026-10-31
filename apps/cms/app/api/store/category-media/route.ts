import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isSameOrigin } from "@/lib/request-origin";
import {
  PRODUCT_MEDIA_BUCKET,
  requireStudioStorageClient,
  safeObjectKey,
  validateStorageFile,
} from "@/lib/storage/server";
import { isR2Configured, putR2Object } from "@/lib/r2/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  let client;
  try {
    client = await requireStudioStorageClient();
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Studio access required.", 403);
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return errorResponse("Choose an image to upload.");
  let extension: string;
  try {
    ({ extension } = validateStorageFile(file, PRODUCT_MEDIA_BUCKET));
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "The image is invalid.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const storage = url && key
    ? createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : client.supabase;
  const storagePath = safeObjectKey("categories", extension);
  if (isR2Configured()) {
    try {
      const uploaded = await putR2Object({ sourcePath: storagePath, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
      return Response.json({ publicUrl: uploaded.publicUrl, storagePath: uploaded.storagePath }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Cloudflare R2 rejected the image.", 502);
    }
  }
  const { error } = await storage.storage.from(PRODUCT_MEDIA_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return errorResponse("The category image could not be uploaded. Check the product-media bucket and Storage policy.", 502);
  const { data } = storage.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(storagePath);
  return Response.json({ publicUrl: data.publicUrl, storagePath }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}


