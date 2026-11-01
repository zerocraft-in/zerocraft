import { getRequestStoreConfig } from "@zerocraft/supabase/store-server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireCommercePermission } from "@/lib/commerce-auth";
import { PRODUCT_MEDIA_BUCKET } from "@/lib/storage/server";
import { deleteR2Object, r2PublicUrl } from "@/lib/r2/server";
import { isSameOrigin } from "@/lib/request-origin";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CommerceSupabase = Extract<
  Awaited<ReturnType<typeof requireCommercePermission>>,
  { ok: true }
>["supabase"];

function jsonError(message: string, status = 400) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

async function storageClient(fallback: CommerceSupabase) {
  const { url, serviceKey: key } = await getRequestStoreConfig();
  return url && key
    ? createServiceClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : fallback;
}

async function purgeExpiredAssets(supabase: CommerceSupabase) {
  const { data: expired, error: listError } = await supabase
    .from("deleted_files")
    .select("storage_path")
    .lte("purge_after", new Date().toISOString());
  if (listError) throw new Error("Expired gallery assets could not be loaded.");
  if (!expired?.length) return;

  const storage = await storageClient(supabase) as typeof supabase;
  for (let index = 0; index < expired.length; index += 100) {
    const batch = expired.slice(index, index + 100);
    const r2Assets = batch.filter((asset) => asset.storage_path.startsWith("r2/"));
    const supabaseAssets = batch.filter((asset) => !asset.storage_path.startsWith("r2/"));
    for (const asset of r2Assets) {
      try {
        await deleteR2Object(asset.storage_path);
      } catch {
        throw new Error("Expired gallery files could not be permanently removed.");
      }
    }
    if (supabaseAssets.length) {
      const { error: storageError } = await storage.storage
        .from(PRODUCT_MEDIA_BUCKET)
        .remove(supabaseAssets.map((asset) => asset.storage_path));
      if (storageError) throw new Error("Expired gallery files could not be permanently removed.");
    }
    const { error: deleteError } = await supabase
      .from("deleted_files")
      .delete()
      .in(
        "storage_path",
        batch.map((asset) => asset.storage_path),
      );
    if (deleteError) throw new Error("Expired gallery asset history could not be cleared.");
  }
}

export async function GET() {
  const access = await requireCommercePermission("catalog.read");
  if (!access.ok) return access.response;

  try {
    const { data: canManage, error: permissionError } =
      await access.supabase.rpc("has_permission", {
        p_permission: "catalog.manage",
      });
    if (permissionError) {
      return jsonError("Catalog permissions could not be verified.", 503);
    }
    if (canManage) await purgeExpiredAssets(access.supabase);
    const [products, categories, subcategories, assets] = await Promise.all([
      access.supabase
        .from("products")
        .select("id,title,sku,product_type,deleted_at,purge_after")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
      access.supabase
        .from("categories")
        .select("id,name,slug,deleted_at,purge_after")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
      access.supabase
        .from("subcategories")
        .select("id,category_id,name,slug,deleted_at,purge_after")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
      access.supabase
        .from("deleted_files")
        .select("storage_path,file_name,folder,mime_type,size_bytes,deleted_at,purge_after")
        .order("deleted_at", { ascending: false }),
    ]);

    const failed = products.error || categories.error || subcategories.error || assets.error;
    if (failed) {
      if (failed.code === "42P01" || failed.code === "42703") {
        return jsonError("The store recycle bin migration has not been applied.", 503);
      }
      return jsonError("Recycle bin history could not be loaded.", 503);
    }

    const storage = await storageClient(access.supabase);
    const recycledAssets = (assets.data || []).map((asset) => ({
      ...asset,
      url: asset.storage_path.startsWith("r2/")
        ? r2PublicUrl(asset.storage_path)
        : storage.storage
            .from(PRODUCT_MEDIA_BUCKET)
            .getPublicUrl(asset.storage_path).data.publicUrl,
    }));

    return Response.json(
      {
        products: products.data || [],
        categories: categories.data || [],
        subcategories: subcategories.data || [],
        assets: recycledAssets,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Recycle bin history could not be loaded.",
      503,
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Invalid request origin.", 403);
  const access = await requireCommercePermission("catalog.manage");
  if (!access.ok) return access.response;

  let body: { type?: unknown; id?: unknown; storagePath?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid restore request.");
  }

  if (body.type === "category" || body.type === "subcategory") {
    if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) {
      return jsonError("Choose a valid deleted category.");
    }
    const { error } =
      body.type === "category"
        ? await access.supabase.rpc("restore_store_category", {
            p_category_id: body.id,
          })
        : await access.supabase.rpc("restore_store_subcategory", {
            p_subcategory_id: body.id,
          });
    if (error) {
      if (error.code === "P0002") return jsonError(error.message, 404);
      if (error.code === "22023") return jsonError(error.message, 409);
      return jsonError("The category could not be restored.", 503);
    }
    revalidatePath("/store", "layout");
    revalidatePath("/api/store/catalog");
    return Response.json({ ok: true });
  }

  if (body.type === "asset" && typeof body.storagePath === "string") {
    const { data: asset, error: assetError } = await access.supabase
      .from("deleted_files")
      .select("storage_path")
      .eq("storage_path", body.storagePath)
      .maybeSingle();
    if (assetError) return jsonError("The gallery item could not be loaded.", 503);
    if (!asset) return jsonError("Deleted gallery item not found.", 404);

    const { error } = await access.supabase
      .from("deleted_files")
      .delete()
      .eq("storage_path", asset.storage_path);
    if (error) return jsonError("The gallery item could not be restored.", 503);
    return Response.json({ ok: true });
  }

  return jsonError("Choose a valid recycle bin item.");
}


