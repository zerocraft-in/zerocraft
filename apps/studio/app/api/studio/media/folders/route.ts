import { NextResponse } from "next/server";
import { audit, requireStudioAccess } from "@/lib/studio-api";
import { deleteStudioObject, listStudioObjects, putStudioFolderMarker, renameStudioFolder, safeFolderName } from "@/lib/studio-r2-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await requireStudioAccess("media.read");
  if ("response" in result) return result.response;
  try {
    const { objects } = await listStudioObjects();
    const folders = Array.from(new Set(objects.map(({ key }) => key.slice("studio/".length).split("/")[0]).filter(Boolean))).sort();
    return NextResponse.json({ folders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read folders." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const result = await requireStudioAccess("media.manage");
  if ("response" in result) return result.response;
  try {
    const body = await request.json();
    const folder = safeFolderName(String(body.name || ""));
    const { folders } = await (async () => {
      const { objects } = await listStudioObjects();
      return { folders: new Set(objects.map(({ key }) => key.slice("studio/".length).split("/")[0])) };
    })();
    if (folders.has(folder)) return NextResponse.json({ error: "That folder already exists." }, { status: 409 });
    await putStudioFolderMarker(folder);
    await audit(result.supabase, result.user.id, "media.folder_created", "media_folder", null, { folder });
    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create folder." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const result = await requireStudioAccess("media.manage");
  if ("response" in result) return result.response;
  try {
    const body = await request.json();
    const from = safeFolderName(String(body.oldName || ""));
    const to = safeFolderName(String(body.newName || ""));
    if (from === to) return NextResponse.json({ folder: to });
    if (from === "general") return NextResponse.json({ error: "The general folder cannot be renamed." }, { status: 400 });
    const existing = await listStudioObjects(to);
    if (existing.objects.length) return NextResponse.json({ error: "That destination folder already exists." }, { status: 409 });
    const renamed = await renameStudioFolder(from, to);
    await audit(result.supabase, result.user.id, "media.folder_renamed", "media_folder", null, { from, to, moved: renamed.count });
    return NextResponse.json({ folder: to, moved: renamed.count });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not rename folder." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const result = await requireStudioAccess("media.manage");
  if ("response" in result) return result.response;
  try {
    const folder = safeFolderName(new URL(request.url).searchParams.get("name") || "");
    if (folder === "general") return NextResponse.json({ error: "The general folder cannot be deleted." }, { status: 400 });
    const { objects } = await listStudioObjects(folder);
    const files = objects.filter(({ key }) => !key.endsWith("/.keep"));
    if (files.length) return NextResponse.json({ error: "Only empty folders can be deleted." }, { status: 409 });
    for (const object of objects) await deleteStudioObject(object.key);
    await audit(result.supabase, result.user.id, "media.folder_deleted", "media_folder", null, { folder });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete folder." }, { status: 400 });
  }
}
