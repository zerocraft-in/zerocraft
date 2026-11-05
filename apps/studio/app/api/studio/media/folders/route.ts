import { NextResponse } from "next/server";
import { createStudioSupabaseServerClient } from "@/lib/studio-supabase-server";
import { deleteStudioObject, listStudioObjects, putStudioFolderMarker, renameStudioFolder, safeFolderName } from "@/lib/studio-r2-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function access(permission: "catalog.read" | "catalog.manage" = "catalog.read") {
  const supabase = await createStudioSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  const { data: member, error: memberError } = await supabase.rpc("is_member");
  if (memberError || member !== true) return { response: NextResponse.json({ error: "Active Studio membership required." }, { status: 403 }) } as const;
  const { data: allowed, error: permissionError } = await supabase.rpc("has_permission", { p_permission: permission });
  if (permissionError || allowed !== true) return { response: NextResponse.json({ error: `Permission required: ${permission}.` }, { status: 403 }) } as const;
  return { supabase } as const;
}

export async function GET() {
  const result = await access();
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
  const result = await access("catalog.manage");
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
    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create folder." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const result = await access("catalog.manage");
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
    const { data: rows } = await result.supabase.from("files").select("storage_path").like("storage_path", `studio/${from}/%`);
    for (const row of rows ?? []) {
      const storagePath = row.storage_path as string;
      await result.supabase.from("files").update({ storage_path: storagePath.replace(`studio/${from}/`, `studio/${to}/`), folder: to, updated_at: new Date().toISOString() }).eq("storage_path", storagePath);
    }
    return NextResponse.json({ folder: to, moved: renamed.count });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not rename folder." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const result = await access("catalog.manage");
  if ("response" in result) return result.response;
  try {
    const folder = safeFolderName(new URL(request.url).searchParams.get("name") || "");
    if (folder === "general") return NextResponse.json({ error: "The general folder cannot be deleted." }, { status: 400 });
    const { objects } = await listStudioObjects(folder);
    const files = objects.filter(({ key }) => !key.endsWith("/.keep"));
    if (files.length) return NextResponse.json({ error: "Only empty folders can be deleted." }, { status: 409 });
    for (const object of objects) await deleteStudioObject(object.key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete folder." }, { status: 400 });
  }
}
