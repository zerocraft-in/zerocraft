import { NextResponse } from "next/server";
import { createStudioSupabaseServerClient } from "@/lib/studio-supabase-server";
import { deleteStudioObject, listStudioObjects, putStudioObject, publicUrl, safeFileName, safeSegment, studioKey } from "@/lib/studio-r2-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxBytes = 250 * 1024 * 1024;

async function access(permission: "catalog.read" | "catalog.manage" = "catalog.read") {
  const supabase = await createStudioSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  const { data: member, error: memberError } = await supabase.rpc("is_member");
  if (memberError || member !== true) return { response: NextResponse.json({ error: "Active Studio membership required." }, { status: 403 }) } as const;
  const { data: allowed, error: permissionError } = await supabase.rpc("has_permission", { p_permission: permission });
  if (permissionError || allowed !== true) return { response: NextResponse.json({ error: `Permission required: ${permission}.` }, { status: 403 }) } as const;
  return { supabase, user } as const;
}

function typeFor(mime: string) {
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime === "image/svg+xml") return "SVG";
  return "Doc";
}

export async function GET(request: Request) {
  const result = await access("catalog.read");
  if ("response" in result) return result.response;
  const folder = new URL(request.url).searchParams.get("folder") || undefined;
  try {
    const [{ objects, bucket }, { data: metadata, error }] = await Promise.all([
      listStudioObjects(folder),
      result.supabase.from("files").select("storage_path,public_url,file_name,folder,alt_text,mime_type,size_bytes,created_at,updated_at").order("updated_at", { ascending: false }).limit(1000),
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 503 });
    const known = new Map((metadata ?? []).map((item) => [item.storage_path.replace(/^r2\//, ""), item]));
    const assets = objects.filter((object) => !object.key.endsWith("/.keep")).map((object) => {
      const item = known.get(object.key);
      return { ...object, fileName: item?.file_name ?? object.key.split("/").pop() ?? object.key, folder: item?.folder ?? object.key.split("/").slice(1, -1).join("/"), altText: item?.alt_text ?? "", mimeType: item?.mime_type ?? "application/octet-stream", sizeBytes: item?.size_bytes ?? object.size, type: typeFor(item?.mime_type ?? "application/octet-stream"), publicUrl: item?.public_url || publicUrl(object.key, process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.replace(/\/$/, "")) };
    });
    return NextResponse.json({ bucket, prefix: "studio/", assets });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read Cloudflare R2." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const result = await access("catalog.manage");
  if ("response" in result) return result.response;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (file.size > maxBytes) return NextResponse.json({ error: "Files must be smaller than 250 MB." }, { status: 413 });
  const folder = safeSegment(String(form?.get("folder") || "general"));
  const key = studioKey(folder, file.name);
  try {
    const uploaded = await putStudioObject({ key, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type || "application/octet-stream" });
    const url = uploaded.publicUrl ?? "";
    const { error } = await result.supabase.from("files").upsert({ storage_path: key, public_url: url, file_name: safeFileName(file.name), folder, alt_text: String(form?.get("altText") || ""), mime_type: file.type || "application/octet-stream", size_bytes: file.size, created_by: result.user.id, updated_at: new Date().toISOString() });
    if (error) { await deleteStudioObject(key).catch(() => undefined); return NextResponse.json({ error: error.message }, { status: 503 }); }
    return NextResponse.json({ asset: { key, fileName: file.name, folder, mimeType: file.type, sizeBytes: file.size, publicUrl: url || null } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload to Cloudflare R2." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const result = await access("catalog.manage");
  if ("response" in result) return result.response;
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!key.startsWith("studio/")) return NextResponse.json({ error: "Invalid Studio media key." }, { status: 400 });
  try { await deleteStudioObject(key); const { error } = await result.supabase.from("files").delete().eq("storage_path", key); if (error) return NextResponse.json({ error: error.message }, { status: 503 }); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete media." }, { status: 503 }); }
}
