/**
 * Cloudflare R2 media file API — database-backed.
 *
 * File bytes live in Cloudflare R2; metadata (key, name, content type, size,
 * and an internal r2:// reference) lives in `public.media` with
 * organization-scoped RLS.
 *
 * Routes:
 *   GET    /api/content/files?cursor=&limit=&search=&type=&sort=
 *           List media files (server-side cursor pagination, org-scoped)
 *   POST   /api/content/files                                   Initiate direct-to-R2 upload
 *           (validates file policy server-side, returns presigned PUT url)
 *   DELETE /api/content/files                                   Delete file  (body: { mediaId })
 *   PATCH  /api/content/files                                   Rename file  (body: { mediaId, newName })
 *
 * Security:
 *   - The organization is resolved from the authenticated session, never
 *     trusted from the client.
 *   - All mutation routes verify media.* permissions and organization
 *     ownership before touching R2 or the database.
 *   - Object keys are generated server-side; clients never supply keys.
 *
 * Upload flow (direct-to-R2 + DB registration):
 *   1. Client POSTs { filename, contentType, size } → server validates the
 *      file policy, generates a server-controlled object key, and returns a
 *      short-lived presigned PUT url.
 *   2. Client PUTs the file bytes to `uploadUrl` with Content-Type header.
 *   3. Client calls the registerMediaFile server action → inserts into
 *      public.media. On registration failure the R2 object is deleted
 *      (compensating transaction) and an error is returned.
 *   4. File is public at https://media.maara.co.in/{key} and tracked in DB.
 */

import { NextResponse } from "next/server";
import {
  requirePermission,
  requireRoles,
  requireOrganization,
} from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  deleteFile,
  getObjectUrl,
  getPublicCdnUrl,
  isPrivateR2SignedUrl,
  renameFile,
} from "@/lib/r2";
import { initUpload, ASSET_FOLDERS, sanitizeAssetFilename } from "@/lib/storage";
import { requestIdFrom } from "@/lib/http";
import {
  isCanonicalMediaFolder,
  mediaVisibilityForKey,
} from "@/lib/media-visibility";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type SortValue = "newest" | "oldest" | "name-asc" | "name-desc" | "size-asc" | "size-desc";

const ALLOWED_TYPES = new Set(["all", "image", "video", "document", "other"]);
const ALLOWED_SORTS = new Set<SortValue>([
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
  "size-asc",
  "size-desc",
]);

/** Resolve the caller's active organization from the session (never client input). */
async function resolveOrganization(): Promise<{
  readonly id: string;
  readonly slug: string;
}> {
  const context = await requireOrganization();
  if (!context.activeOrganization) {
    throw new Error("No active organization");
  }
  return {
    id: context.activeOrganization.id,
    slug: context.activeOrganization.slug,
  };
}

async function getSupabase() {
  return createServerSupabaseClient();
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function categoryFromContentType(contentType: string | null): string {
  const type = (contentType ?? "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf") return "document";
  return "other";
}

function extensionFromName(name: string): string | undefined {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return undefined;
  return name.slice(dot + 1).toLowerCase();
}

async function mediaDelivery(key: string): Promise<{
  visibility: "public" | "private";
  deliveryUrl: string;
  downloadUrl?: string;
}> {
  if (mediaVisibilityForKey(key) === "public") {
    return { visibility: "public", deliveryUrl: getPublicCdnUrl(key) };
  }
  const downloadUrl = await getObjectUrl({ key, expiresIn: 300 });
  if (!isPrivateR2SignedUrl(downloadUrl, key)) {
    throw new Error("R2 signing returned an invalid private download URL");
  }
  return { visibility: "private", deliveryUrl: downloadUrl, downloadUrl };
}

function typeFilterClause(category: string) {
  switch (category) {
    case "image":
      return "content_type ilike 'image/%'";
    case "video":
      return "content_type ilike 'video/%'";
    case "document":
      return "content_type = 'application/pdf'";
    case "other":
      return "(content_type NOT ILIKE 'image/%' AND content_type NOT ILIKE 'video/%' AND content_type <> 'application/pdf')";
    default:
      return null;
  }
}

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    await requirePermission("media.view");
    await requireRoles("admin", "owner", "manager");

    const organizationId = (await resolveOrganization()).id;
    const { searchParams } = new URL(request.url);

    const cursorRaw = searchParams.get("cursor");
    const limit = parseLimit(searchParams.get("limit"));
    const search = (searchParams.get("search") ?? "").trim();
    const type = (searchParams.get("type") ?? "all").toLowerCase();
    const sort = (searchParams.get("sort") ?? "newest") as SortValue;

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: "Invalid type filter" }, { status: 400 });
    }
    if (!ALLOWED_SORTS.has(sort)) {
      return NextResponse.json({ error: "Invalid sort" }, { status: 400 });
    }

    const supabase = await getSupabase();

    let query = supabase
      .from("media")
      .select(
        `
        id,
        key,
        name,
        content_type,
        size_bytes,
        url,
        uploaded_by,
        created_at,
        updated_at
      `,
      )
      .eq("organization_id", organizationId);

    // Search by file name.
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // File type filter.
    const typeClause = typeFilterClause(type);
    if (typeClause) {
      query = query.or(typeClause);
    }

    // Ordering.
    switch (sort) {
      case "oldest":
        query = query.order("created_at", { ascending: true }).order("id", { ascending: true });
        break;
      case "name-asc":
        query = query.order("name", { ascending: true }).order("id", { ascending: true });
        break;
      case "name-desc":
        query = query.order("name", { ascending: false }).order("id", { ascending: false });
        break;
      case "size-asc":
        query = query.order("size_bytes", { ascending: true }).order("id", { ascending: true });
        break;
      case "size-desc":
        query = query.order("size_bytes", { ascending: false }).order("id", { ascending: false });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
        break;
    }

    // Keyset cursor pagination: fetch limit + 1 to detect a next page.
    const fetchLimit = limit + 1;
    if (cursorRaw) {
      try {
        const cursor = JSON.parse(
          Buffer.from(cursorRaw, "base64").toString("utf-8"),
        ) as { created_at: string; id: string };
        // For descending orders (default, name-desc, size-desc): cursor is "less than".
        // For ascending orders: cursor is "greater than".
        const isDesc =
          sort === "newest" || sort === "name-desc" || sort === "size-desc";

        if (isDesc) {
          query = query.or(
            `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
          );
        } else {
          query = query.or(
            `created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`,
          );
        }
      } catch {
        // Malformed cursor: ignore and start from the beginning.
      }
    }

    const { data, error } = await query.limit(fetchLimit);

    if (error) throw error;

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && page.length > 0) {
      const last = page[page.length - 1];
      const cursorPayload = {
        created_at: last.created_at,
        id: last.id,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorPayload)).toString("base64");
    }

    const files = await Promise.all(
      page.map(async (row) => {
        const delivery = await mediaDelivery(row.key);
        return {
          id: row.id,
          key: row.key,
          name: row.name,
          contentType: row.content_type,
          size: row.size_bytes,
          ...delivery,
          uploadedBy: row.uploaded_by,
          lastModified: row.updated_at,
          category: categoryFromContentType(row.content_type),
          extension: extensionFromName(row.name),
          organizationId,
        };
      }),
    );

    return NextResponse.json({
      files,
      nextCursor,
      hasMore,
      organizationId,
    });
  } catch (error) {
    console.error("Media files list error:", error);
    const message = error instanceof Error ? error.message : "Failed to list files";
    const status = message === "Unauthenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json(
      { error: status === 500 ? "Unable to list files." : message },
      { status, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    await requirePermission("media.create");
    await requireRoles("admin", "owner", "manager");

    const body = await request.json();

    const filename =
      typeof body.filename === "string" ? body.filename : "";
    const clientContentType =
      typeof body.contentType === "string" ? body.contentType : "";
    const size = typeof body.size === "number" ? body.size : 0;
    const hasFolder = Object.prototype.hasOwnProperty.call(body, "folder");
    const folderInput = hasFolder ? body.folder : ASSET_FOLDERS.uploads;
    if (!isCanonicalMediaFolder(folderInput)) {
      return NextResponse.json(
        { error: "Invalid media folder." },
        { status: 400, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } },
      );
    }
    const folder = folderInput;

    // --- Use the centralized storage service for upload initialization ---
    // This validates the file policy, generates a server-controlled object key
    // under assets/{folder}/{uuid}-{filename}, creates a short-lived
    // presigned PUT URL, and returns a short-lived signed download URL.
    // Organization isolation is enforced at the database layer via
    // public.media.organization_id + RLS, not in the object key.
    const result = await initUpload({
      filename,
      clientContentType,
      size,
      folder,
    });

    if (!isPrivateR2SignedUrl(result.uploadUrl, result.key)) {
      throw new Error("R2 signing returned an invalid private upload URL");
    }
    if (result.visibility === "private" && !isPrivateR2SignedUrl(result.downloadUrl, result.key)) {
      throw new Error("R2 signing returned an invalid private download URL");
    }

    return NextResponse.json({
      key: result.key,
      name: result.name,
      contentType: result.contentType,
      size: result.size,
      category: categoryFromContentType(result.contentType),
      folder: result.folder,
      uploadUrl: result.uploadUrl,
      visibility: result.visibility,
      deliveryUrl: result.deliveryUrl,
      ...(result.visibility === "private" ? { downloadUrl: result.downloadUrl } : {}),
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    console.error("Media upload init error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to initiate upload";
    const status = message === "Unauthenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json(
      { error: status === 500 ? "Unable to initiate upload." : message },
      { status, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } },
    );
  }
}

export async function DELETE(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    await requirePermission("media.delete");
    await requireRoles("admin", "owner", "manager");

    const organizationId = (await resolveOrganization()).id;
    const body = await request.json();
    const mediaId = typeof body.mediaId === "string" ? body.mediaId : "";

    if (!mediaId) {
      return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
    }

    const supabase = await getSupabase();

    // Fetch the file record to get the R2 key and verify organization ownership.
    const { data: file, error: fetchError } = await supabase
      .from("media")
      .select("id, key, organization_id, name")
      .eq("id", mediaId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "Media file not found" }, { status: 404 });
    }

    // Verify organization ownership (defence in depth beyond RLS).
    if (file.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // --- Reliable delete: R2 first, then database ---
    // Deleting the database record first would lose the only reference (the
    // key) to an object that R2 failed to delete, creating an unreachable
    // orphan. Delete from R2 first so we never lose the reference.
    if (file.key) {
      try {
        await deleteFile({ key: file.key });
      } catch {
        console.error("R2 delete failed, aborting DB delete:", {
          mediaId,
          key: file.key,
        });
        return NextResponse.json(
          { error: "Failed to delete file from storage. Try again." },
          { status: 502 },
        );
      }
    }

    // R2 object deleted (or no key). Now remove the metadata record using the
    // SECURITY DEFINER RPC for reliable deletion with permission checks.
    const { error: dbError } = await supabase.rpc("delete_media", {
      p_media_id: mediaId,
    });

    if (dbError) {
      // Object removed from R2 but DB delete failed. Report the error; the
      // record is harmless and idempotent to retry (R2 delete of a missing
      // object is a no-op).
      console.error("DB delete failed after R2 removal:", {
        mediaId,
        key: file.key,
        code: dbError.code,
        message: dbError.message,
      });
      return NextResponse.json(
        { error: "File removed from storage but metadata could not be cleared. Try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, mediaId });
  } catch (error) {
    console.error("Media delete error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete file";
    const status = message === "Unauthenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json(
      { error: status === 500 ? "Unable to delete file." : message },
      { status, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    await requirePermission("media.update");
    await requireRoles("admin", "owner", "manager");

    const organizationId = (await resolveOrganization()).id;
    const body = await request.json();
    const mediaId = typeof body.mediaId === "string" ? body.mediaId : "";
    const newName =
      typeof body.newName === "string" ? body.newName.trim() : "";

    if (!mediaId || !newName) {
      return NextResponse.json(
        { error: "mediaId and newName are required" },
        { status: 400 },
      );
    }

    const supabase = await getSupabase();

    // Fetch the file record to get the R2 key and verify organization ownership.
    const { data: file, error: fetchError } = await supabase
      .from("media")
      .select("id, key, name, organization_id, content_type")
      .eq("id", mediaId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "Media file not found" }, { status: 404 });
    }

    if (file.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sourceKey = file.key;
    const sourceDir = sourceKey.split("/").slice(0, -1).join("/");
    const safeName = sanitizeAssetFilename(newName);
    const destKey = sourceDir ? `${sourceDir}/${safeName}` : safeName;

    // --- Reliable rename: copy → verify → update metadata → delete original ---
    // R2 has no atomic rename. We copy to the destination first and only
    // remove the source after the destination is confirmed and metadata is
    // updated. If anything fails before source deletion, the original object
    // remains intact and recoverable.

    // 1. Copy original object to destination.
    try {
      await renameFile({ sourceKey, destKey });
    } catch {
      console.error("R2 copy failed:", { mediaId, sourceKey, destKey });
      return NextResponse.json(
        { error: "Failed to rename file in storage" },
        { status: 500 },
      );
    }

    // 2. Update metadata to point at the destination.
    // The CopyObject above already confirms the destination exists; if it had
    // failed we would have returned above.
    const { data: updated, error: dbError } = await supabase
      .from("media")
      .update({
        name: safeName,
        key: destKey,
        url: `r2://${destKey}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mediaId)
      .eq("organization_id", organizationId)
      .select("id, name, key, url")
      .single();

    if (dbError) {
      // Metadata update failed after copy succeeded: clean up the copied
      // destination object so we don't leave a duplicate, then report error.
      // The source object is still intact.
      try {
        await deleteFile({ key: destKey });
      } catch {
        // Best-effort cleanup; log so an orphan can be reaped later.
        console.error("Failed to clean up copied object after metadata update failure:", {
          mediaId,
          destKey,
        });
      }
      console.error("Metadata update failed after R2 copy:", {
        mediaId,
        sourceKey,
        destKey,
        code: dbError.code,
        message: dbError.message,
      });
      return NextResponse.json(
        { error: "Failed to update media metadata." },
        { status: 500 },
      );
    }

    // 4. Delete the original object. If this fails, the DB already points to
    // the destination (valid), and the leftover source is an orphan that can
    // be reaped by retry/cleanup.
    try {
      await deleteFile({ key: sourceKey });
    } catch {
      console.error("Original object deletion failed after rename (orphan):", {
        mediaId,
        sourceKey,
        destKey,
      });
      // Non-fatal: the new object is in place and metadata is correct.
    }

    const delivery = await mediaDelivery(updated.key);

    return NextResponse.json({
      ok: true,
      mediaId: updated.id,
      name: updated.name,
      key: updated.key,
      ...delivery,
    });
  } catch (error) {
    console.error("Media rename error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to rename file";
    const status = message === "Unauthenticated" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json(
      { error: status === 500 ? "Unable to rename file." : message },
      { status, headers: { "X-Request-Id": requestId, "Cache-Control": "no-store" } },
    );
  }
}
