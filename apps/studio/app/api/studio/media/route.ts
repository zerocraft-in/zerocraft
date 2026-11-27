import { NextResponse } from "next/server";
import { audit, requireStudioAccess } from "@/lib/studio-api";
import { findMediaReferences } from "@/lib/studio-media-references";
import {
  copyStudioObject,
  deleteStudioObject,
  headStudioObject,
  isR2Configured,
  listStudioObjects,
  putStudioObject,
  publicUrl,
  r2CapacityBytes,
  renameStudioObject,
  safeFileName,
  safeSegment,
  typeFor,
  uniqueStudioKey,
  updateStudioObjectMetadata,
} from "@/lib/studio-r2-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxBytes = 250 * 1024 * 1024;

export async function GET() {
  const result = await requireStudioAccess("media.read");
  if ("response" in result) return result.response;
  const bucket = (process.env.CLOUDFLARE_R2_BUCKET || "zerocraft-media").trim();
  const capacityBytes = r2CapacityBytes();

  if (!isR2Configured()) {
    return NextResponse.json({ configured: false, bucket, capacityBytes });
  }

  try {
    const { objects, bucket: listedBucket } = await listStudioObjects();
    const usable = objects.filter((object) => !object.key.endsWith("/.keep"));
    const assets = await Promise.all(usable.map(async (object) => {
      const details = await headStudioObject(object.key).catch(() => ({ contentType: "application/octet-stream", altText: "" }));
      const mimeType = details.contentType;
      return { ...object, fileName: object.key.split("/").pop() ?? object.key, folder: object.key.split("/").slice(1, -1).join("/"), altText: details.altText, mimeType, sizeBytes: object.size, type: typeFor(mimeType), publicUrl: publicUrl(object.key, process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.replace(/\/$/, "")) };
    }));

    const folderMap = new Map<string, { name: string; count: number; bytes: number }>();
    for (const asset of assets) {
      if (!asset.folder) continue; // root-level assets sit outside every folder
      const key = asset.folder || "general";
      const entry = folderMap.get(key) ?? { name: key, count: 0, bytes: 0 };
      entry.count += 1;
      entry.bytes += asset.sizeBytes;
      folderMap.set(key, entry);
    }
    // Folders freshly created with a .keep marker have no assets yet but must still show.
    for (const object of objects) {
      if (!object.key.endsWith("/.keep")) continue;
      const folder = object.key.split("/").slice(1, -1).join("/");
      if (folder && !folderMap.has(folder)) folderMap.set(folder, { name: folder, count: 0, bytes: 0 });
    }
    const folders = [...folderMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    const usedBytes = assets.reduce((sum, asset) => sum + asset.sizeBytes, 0);

    return NextResponse.json({
      configured: true,
      bucket: listedBucket || bucket,
      capacityBytes,
      publicBaseUrlConfigured: Boolean(process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.trim()),
      publicBaseUrl: (process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "")) || null,
      storage: { usedBytes, objectCount: assets.length, folderCount: folders.length, largestFolder: folders.slice().sort((a, b) => b.bytes - a.bytes)[0]?.name ?? null },
      folders,
      assets,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read Cloudflare R2." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const result = await requireStudioAccess("media.manage");
  if ("response" in result) return result.response;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (file.size > maxBytes) return NextResponse.json({ error: "Files must be smaller than 250 MB." }, { status: 413 });
  const requestedFolder = String(form?.get("folder") ?? "general").trim();
  const folder = requestedFolder ? safeSegment(requestedFolder) : "";
  const key = await uniqueStudioKey(folder, file.name);
  try {
    const altText = String(form?.get("altText") || "").trim().slice(0, 500);
    const uploaded = await putStudioObject({ key, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type || "application/octet-stream", altText });
    const url = uploaded.publicUrl ?? "";
    await audit(result.supabase, result.user.id, "media.uploaded", "file", null, { storage_path: key, file_name: file.name, size_bytes: file.size });
    return NextResponse.json({ asset: { key, fileName: file.name, folder, mimeType: file.type, sizeBytes: file.size, publicUrl: url || null } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload to Cloudflare R2." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const result = await requireStudioAccess("media.manage");
  if ("response" in result) return result.response;
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!key.startsWith("studio/")) return NextResponse.json({ error: "Invalid Studio media key." }, { status: 400 });
  try {
    const references = await findMediaReferences(result.supabase, key);
    if (references.length) {
      return NextResponse.json({ error: "This asset is still used elsewhere, so it cannot be deleted.", references }, { status: 409 });
    }
    await deleteStudioObject(key);
    await audit(result.supabase, result.user.id, "media.deleted", "file", null, { storage_path: key });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete media." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const result = await requireStudioAccess("media.manage");
  if ("response" in result) return result.response;
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!key.startsWith("studio/")) return NextResponse.json({ error: "Invalid Studio media key." }, { status: 400 });
  const body = await request.json().catch(() => null) as { altText?: unknown; fileName?: unknown; folder?: unknown; operation?: unknown } | null;
  const operation = body?.operation;
  if (operation === "copy") {
    if (typeof body?.folder !== "string") {
      return NextResponse.json({ error: "Choose a destination folder." }, { status: 400 });
    }
    try {
      const copied = await copyStudioObject(key, body.folder);
      await audit(result.supabase, result.user.id, "media.copied", "file", null, { from: key, to: copied.key });
      const fileName = copied.key.split("/").pop() ?? "asset";
      const folder = copied.key.split("/").slice(1, -1).join("/");
      return NextResponse.json({ ok: true, key: copied.key, fileName, folder });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not copy the asset." }, { status: 503 });
    }
  }
  const altText = typeof body?.altText === "string" ? body.altText : null;
  if (altText !== null && altText.length > 500) return NextResponse.json({ error: "Alt text must be 500 characters or fewer." }, { status: 400 });
  const wantedName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const wantsMove = typeof body?.folder === "string" && body.folder.trim() !== "" ? true : body?.folder === "";
  const wantedFolder = wantsMove ? (body?.folder as string).trim() : undefined;
  if (altText === null && !wantedName && !wantsMove) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  // Renaming or moving changes the public URL, so sweep references first.
  if (wantedName || wantsMove) {
    try {
      const references = await findMediaReferences(result.supabase, key);
      if (references.length) {
        return NextResponse.json({ error: "This asset is still used elsewhere, so changing its URL would break those references.", references }, { status: 409 });
      }
      const renamed = await renameStudioObject(key, wantedName ? safeFileName(wantedName) : key.split("/").pop() ?? "asset", wantedFolder);
      if (altText !== null) await updateStudioObjectMetadata(renamed.key, altText);
      await audit(result.supabase, result.user.id, "media.renamed", "file", null, { from: key, to: renamed.key });
      const fileName = renamed.key.split("/").pop() ?? wantedName;
      const folder = renamed.key.split("/").slice(1, -1).join("/");
      return NextResponse.json({ ok: true, key: renamed.key, fileName, folder });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not rename the asset." }, { status: 503 });
    }
  }

  try { await updateStudioObjectMetadata(key, altText ?? ""); await audit(result.supabase, result.user.id, "media.metadata_updated", "file", null, { storage_path: key }); return NextResponse.json({ ok: true, altText: altText ?? "" }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update R2 metadata." }, { status: 503 }); }
}
