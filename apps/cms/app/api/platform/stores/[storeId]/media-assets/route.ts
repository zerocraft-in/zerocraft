import { randomUUID } from "node:crypto";
import { isSameOrigin } from "@/lib/request-origin";
import { copyStoreR2Object, createStoreR2Client, deleteStoreR2Object, getStoreR2Config, listStoreR2Objects, putStoreR2Object, storeR2PublicUrl } from "@/lib/platform/media-storage";
import { jsonBody, PlatformError, platformResponse, platformService, storeMember } from "@/lib/platform/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const SAFE_NAME = /^[^\\/\u0000-\u001f]{1,180}$/;
const SAFE_FOLDER = /^[^\\/\u0000-\u001f]{1,120}$/;
const BLOCKED_TYPES = /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|application\/javascript|text\/javascript|application\/x-msdownload)/i;
const BLOCKED_EXTENSIONS = /\.(html?|xhtml|svg|js|mjs|cjs|xml)$/i;

function ownedKey(value: unknown, prefix: string) {
  const path = typeof value === "string" ? value : "";
  const key = path.startsWith("r2/") ? path.slice(3) : "";
  const base = `${prefix.replace(/\/$/, "")}/`;
  const relative = key.startsWith(base) ? key.slice(base.length).split("/") : [];
  const legacy = relative[0]?.toLocaleLowerCase() === "media";
  if (legacy) relative.shift();
  if (!relative[0] || relative[0].startsWith(".") || relative[0].toLocaleLowerCase() === "media" || relative.some((part) => !part || part === "." || part === "..") || relative.length < (legacy ? 1 : 2) || key.includes("\\")) throw new PlatformError("File path is invalid.");
  return key;
}

function assetResponse(row: any, config: Awaited<ReturnType<typeof getStoreR2Config>>, object?: { key: string; size: number; lastModified: string | null }) {
  const key = object?.key || String(row?.storage_path || "").replace(/^r2\//, "");
  const name = row?.file_name || key.split("/").pop() || "file";
  const relative = key.slice(`${config.prefix.replace(/\/$/, "")}/`.length).split("/");
  if (relative[0] === "media") relative.shift();
  const candidateFolder = relative.length > 1 ? relative[0] : row?.folder || "Library";
  const folder = candidateFolder.toLocaleLowerCase() === "media" ? "Library" : candidateFolder;
  return { path: `r2/${key}`, url: row?.public_url || storeR2PublicUrl(config, key), name, fileName: name, folder, mimeType: row?.mime_type || "application/octet-stream", size: object?.size ?? Number(row?.size_bytes || 0), createdAt: row?.created_at || object?.lastModified || null, updatedAt: row?.updated_at || null, altText: row?.alt_text || "", referenced: false, references: [] };
}

export async function GET(_request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  let client: ReturnType<typeof createStoreR2Client> | undefined;
  try {
    const { storeId } = await params;
    await storeMember(storeId);
    const config = await getStoreR2Config(storeId);
    client = createStoreR2Client(config);
    const [objects, records] = await Promise.all([
      listStoreR2Objects(client, config.bucket, config.prefix),
      platformService().from("store_media_assets").select("*").eq("store_id", storeId),
    ]);
    if (records.error) throw new PlatformError("Media records could not be loaded.", 503);
    const byPath = new Map((records.data || []).map((row: any) => [row.storage_path, row]));
    const assets = objects.filter((object) => !object.key.endsWith("/.zerocraft-folder")).map((object) => assetResponse(byPath.get(`r2/${object.key}`), config, object));
    return Response.json({ assets }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return platformResponse(error); }
  finally { client?.destroy(); }
}

export async function POST(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  let client: ReturnType<typeof createStoreR2Client> | undefined;
  let uploadedKey: string | undefined;
  try {
    if (!isSameOrigin(request)) throw new PlatformError("Invalid request origin.", 403);
    const { storeId } = await params;
    const { user } = await storeMember(storeId, true);
    const config = await getStoreR2Config(storeId);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_BYTES) throw new PlatformError("Choose a file between 1 byte and 50 MB.");
    const fileName = file.name.trim();
    if (!SAFE_NAME.test(fileName)) throw new PlatformError("File name is invalid.");
    if (BLOCKED_EXTENSIONS.test(fileName) || BLOCKED_TYPES.test(file.type)) throw new PlatformError("Active web files such as HTML, JavaScript, SVG, and XML are not allowed.");
    const folder = String(form.get("folder") || "Library").trim() || "Library";
    if (!SAFE_FOLDER.test(folder)) throw new PlatformError("Folder name is invalid.");
    if (folder.toLocaleLowerCase() === "media") throw new PlatformError("“media” is reserved for the storage root. Choose another folder.", 422);
    const mimeType = (file.type || "application/octet-stream").slice(0, 120);
    client = createStoreR2Client(config);
    const root = config.prefix.replace(/\/$/, "");
    const folderObjects = await listStoreR2Objects(client, config.bucket, `${root}/${folder}`);
    if (!folderObjects.length) throw new PlatformError("Choose a folder that exists in R2.", 422);
    const originalExt = fileName.match(/\.([a-zA-Z0-9]{1,10})$/)?.[1]?.toLowerCase();
    const key = `${root}/${folder}/${randomUUID()}${originalExt ? `.${originalExt}` : ""}`;
    uploadedKey = key;
    await putStoreR2Object({ client, bucket: config.bucket, key, body: new Uint8Array(await file.arrayBuffer()), contentType: mimeType });
    const { error } = await platformService().from("store_media_assets").insert({ store_id: storeId, storage_path: `r2/${key}`, public_url: storeR2PublicUrl(config, key), file_name: fileName, folder, mime_type: mimeType, size_bytes: file.size, created_by: user.id });
    if (error) throw new PlatformError("File uploaded, but its media record could not be saved.", 503);
    return Response.json({ asset: { path: `r2/${key}`, url: storeR2PublicUrl(config, key), name: fileName, fileName, folder, mimeType, size: file.size, createdAt: new Date().toISOString(), updatedAt: null, altText: "", referenced: false, references: [] } }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (uploadedKey && client) { try { const config = await getStoreR2Config((await params).storeId); await deleteStoreR2Object(client, config.bucket, uploadedKey); } catch { /* Preserve the original error; orphaned R2 objects are visible during refresh. */ } }
    return platformResponse(error);
  } finally { client?.destroy(); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  try {
    if (!isSameOrigin(request)) throw new PlatformError("Invalid request origin.", 403);
    const { storeId } = await params;
    await storeMember(storeId, true);
    const config = await getStoreR2Config(storeId);
    const body = await jsonBody(request);
    const key = ownedKey(body.path, config.prefix);
    const fileName = String(body.fileName || "").trim();
    const folder = String(body.folder || "Library").trim();
    const altText = String(body.altText || "").trim();
    if (!SAFE_NAME.test(fileName) || !SAFE_FOLDER.test(folder) || folder.toLocaleLowerCase() === "media" || altText.length > 240) throw new PlatformError("Enter valid file details. “media” is reserved for the storage root.");
    const service = platformService();
    const destinationPrefix = `${config.prefix.replace(/\/$/, "")}/${folder}/`;
    const targetKey = `${destinationPrefix}${key.split("/").pop()}`;
    let moved = false;
    if (targetKey !== key) {
      const listClient = createStoreR2Client(config);
      let existing;
      try { existing = await listStoreR2Objects(listClient, config.bucket, destinationPrefix); }
      finally { listClient.destroy(); }
      if (!existing.length) throw new PlatformError("Choose a folder that exists in R2.", 422);
      const moveClient = createStoreR2Client(config);
      try { await copyStoreR2Object(moveClient, config.bucket, key, targetKey); moved = true; }
      finally { moveClient.destroy(); }
    }
    const { data, error } = await service.from("store_media_assets").update({ storage_path: `r2/${targetKey}`, public_url: storeR2PublicUrl(config, targetKey), file_name: fileName, folder, alt_text: altText, updated_at: new Date().toISOString() }).eq("store_id", storeId).eq("storage_path", `r2/${key}`).select("*").single();
    if ((error || !data) && moved) { const rollbackClient = createStoreR2Client(config); try { await deleteStoreR2Object(rollbackClient, config.bucket, targetKey); } finally { rollbackClient.destroy(); } }
    if (error || !data) throw new PlatformError("File details could not be saved.", 503);
    if (moved) { const moveClient = createStoreR2Client(config); try { await deleteStoreR2Object(moveClient, config.bucket, key); } finally { moveClient.destroy(); } }
    return Response.json({ asset: assetResponse(data, config) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return platformResponse(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  let client: ReturnType<typeof createStoreR2Client> | undefined;
  try {
    if (!isSameOrigin(request)) throw new PlatformError("Invalid request origin.", 403);
    const { storeId } = await params;
    await storeMember(storeId, true);
    const config = await getStoreR2Config(storeId);
    const body = await jsonBody(request);
    const key = ownedKey(body.path, config.prefix);
    client = createStoreR2Client(config);
    await deleteStoreR2Object(client, config.bucket, key);
    const { error } = await platformService().from("store_media_assets").delete().eq("store_id", storeId).eq("storage_path", `r2/${key}`);
    if (error) throw new PlatformError("File was removed from storage, but its media record could not be removed.", 503);
    return Response.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return platformResponse(error); }
  finally { client?.destroy(); }
}
