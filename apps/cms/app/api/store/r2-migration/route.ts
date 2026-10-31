import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isSameOrigin } from "@/lib/request-origin";
import { isR2Configured, putR2Object, verifyR2Connection } from "@/lib/r2/server";
import { PRODUCT_MEDIA_BUCKET, requireStudioStorageClient } from "@/lib/storage/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function listObjects(storage: any, prefix = ""): Promise<Array<{ path: string; mimeType: string }>> {
  const { data, error } = await storage.storage.from(PRODUCT_MEDIA_BUCKET).list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw new Error(error.message);
  const result: Array<{ path: string; mimeType: string }> = [];
  for (const item of data || []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) result.push({ path, mimeType: item.metadata?.mimetype || "application/octet-stream" });
    else result.push(...await listObjects(storage, path));
  }
  return result;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return response({ error: "Invalid request origin." }, 403);
  try {
    await requireStudioStorageClient();
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Studio access required." }, 403);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return response({ error: "Supabase service credentials are not configured." }, 503);
  const body = await request.json().catch(() => ({})) as { mode?: "dry-run" | "execute" };
  const mode = body.mode === "execute" ? "execute" : "dry-run";
  if (mode === "execute" && !isR2Configured()) return response({ error: "Configure Cloudflare R2 server credentials and CLOUDFLARE_R2_PUBLIC_BASE_URL first." }, 503);
  if (mode === "execute") {
    try {
      await verifyR2Connection();
    } catch (error) {
      return response({ error: "Cloudflare R2 credentials were rejected. Check the R2 S3 access key and secret before migrating." }, 503);
    }
  }
  const storage = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const objects = await listObjects(storage);
    if (mode === "dry-run") return response({ mode, bucket: PRODUCT_MEDIA_BUCKET, count: objects.length, objects: objects.map((object) => object.path) });

    const failures: Array<{ path: string; error: string }> = [];
    let migrated = 0;
    for (const object of objects) {
      try {
        const { data, error } = await storage.storage.from(PRODUCT_MEDIA_BUCKET).download(object.path);
        if (error || !data) throw new Error(error?.message || "Supabase object could not be downloaded.");
        const uploaded = await putR2Object({ sourcePath: object.path, body: new Uint8Array(await data.arrayBuffer()), contentType: object.mimeType });
        const oldUrl = storage.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(object.path).data.publicUrl;
        await Promise.all([
          storage.from("store_product_media").update({ storage_path: uploaded.storagePath, public_url: uploaded.publicUrl }).eq("storage_path", object.path),
          storage.from("store_products").update({ image_url: uploaded.publicUrl }).eq("image_url", oldUrl),
          storage.from("store_categories").update({ image_url: uploaded.publicUrl }).eq("image_url", oldUrl),
          storage.from("store_subcategories").update({ image_url: uploaded.publicUrl }).eq("image_url", oldUrl),
        ]);
        migrated += 1;
      } catch (error) {
        failures.push({ path: object.path, error: error instanceof Error ? error.message : "Migration failed." });
      }
    }
    return response({ mode, bucket: PRODUCT_MEDIA_BUCKET, discovered: objects.length, migrated, failed: failures.length, failures, originalsRetained: true });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "R2 migration failed." }, 502);
  }
}


