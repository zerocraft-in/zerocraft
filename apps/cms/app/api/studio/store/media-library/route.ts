import { createClient as createServiceClient } from "@supabase/supabase-js";
import { PRODUCT_MEDIA_BUCKET, requireStudioStorageClient } from "@/lib/storage/server";

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

export async function GET(request: Request) {
  let client;
  try { client = await requireStudioStorageClient(); } catch (error) { return errorResponse(error instanceof Error ? error.message : "Studio access required.", 403); }
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
    const groups = await Promise.all(prefixes.map((prefix) => listFiles(storage, prefix)));
    const assets = groups.flat().sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
    return Response.json({ bucket: PRODUCT_MEDIA_BUCKET, assets }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return errorResponse("The Supabase Storage media library could not be loaded.", 503); }
}
