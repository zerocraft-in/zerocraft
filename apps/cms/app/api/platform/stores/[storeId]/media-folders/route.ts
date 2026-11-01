import { isSameOrigin } from "@/lib/request-origin";
import { copyStoreR2Object, createStoreR2Client, deleteStoreR2Object, getStoreR2Config, listStoreR2Objects, putStoreR2Object, storeR2PublicUrl } from "@/lib/platform/media-storage";
import { jsonBody, PlatformError, platformResponse, platformService, storeMember } from "@/lib/platform/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const VALID_NAME = /^[^\\/\u0000-\u001f]{1,120}$/;
const MARKER = ".zerocraft-folder";

function mediaRoot(prefix: string) { return prefix.replace(/\/$/, ""); }
function folderPrefix(root: string, name: string) { return `${root}/${name}/`; }
function markerKey(root: string, name: string) { return `${folderPrefix(root, name)}${MARKER}`; }

export async function GET(_request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  let client: ReturnType<typeof createStoreR2Client> | undefined;
  try {
    const { storeId } = await params;
    await storeMember(storeId);
    const config = await getStoreR2Config(storeId);
    client = createStoreR2Client(config);
    const root = mediaRoot(config.prefix);
    const [objects, records] = await Promise.all([
      listStoreR2Objects(client, config.bucket, root),
      platformService().from("store_media_assets").select("storage_path,folder").eq("store_id", storeId),
    ]);
    if (records.error) throw new PlatformError("Media folders could not be loaded.", 503);
    const names = new Set<string>(["Library"]);
    const redundantMediaPrefix = `${root}/media/media/`;
    const redundantObjects = objects.filter((object) => object.key.startsWith(redundantMediaPrefix));
    if (redundantObjects.length && redundantObjects.every((object) => object.key === `${redundantMediaPrefix}${MARKER}`)) {
      await deleteStoreR2Object(client, config.bucket, `${redundantMediaPrefix}${MARKER}`);
    }
    for (const object of objects) {
      const remainder = object.key.slice(root.length + 1);
      const parts = remainder.split("/");
      if (parts[0] === "media") parts.shift();
      if (parts.length < 2) continue;
      const name = parts[0] === MARKER ? "" : parts[0];
      if (name && name !== MARKER && name.toLocaleLowerCase() !== "media") names.add(name);
    }
    for (const row of records.data || []) if (row.folder && VALID_NAME.test(row.folder) && row.folder.toLocaleLowerCase() !== "media") names.add(row.folder);
    await Promise.all(Array.from(names, (name) => putStoreR2Object({ client: client!, bucket: config.bucket, key: markerKey(root, name), body: new Uint8Array(), contentType: "application/x-directory" })));
    return Response.json({ folders: Array.from(names).sort((a, b) => a.localeCompare(b)).map((name) => ({ name })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return platformResponse(error); }
  finally { client?.destroy(); }
}

export async function POST(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  let client: ReturnType<typeof createStoreR2Client> | undefined;
  try {
    if (!isSameOrigin(request)) throw new PlatformError("Invalid request origin.", 403);
    const { storeId } = await params;
    await storeMember(storeId, true);
    const config = await getStoreR2Config(storeId);
    const body = await jsonBody(request);
    const name = String(body.name || "").trim();
    if (!VALID_NAME.test(name)) throw new PlatformError("Enter a folder name without slashes.");
    if (name.toLocaleLowerCase() === "media") throw new PlatformError("“media” is the storage root name; choose a different folder name.", 422);
    client = createStoreR2Client(config);
    const root = mediaRoot(config.prefix);
    const current = await listStoreR2Objects(client, config.bucket, folderPrefix(root, name));
    if (current.length) throw new PlatformError("A folder with that name already exists.", 409);
    await putStoreR2Object({ client, bucket: config.bucket, key: markerKey(root, name), body: new Uint8Array(), contentType: "application/x-directory" });
    return Response.json({ folder: { name } }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return platformResponse(error); }
  finally { client?.destroy(); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  let client: ReturnType<typeof createStoreR2Client> | undefined;
  try {
    if (!isSameOrigin(request)) throw new PlatformError("Invalid request origin.", 403);
    const { storeId } = await params;
    await storeMember(storeId, true);
    const config = await getStoreR2Config(storeId);
    const body = await jsonBody(request);
    const oldName = String(body.oldName || "").trim();
    const newName = String(body.newName || "").trim();
    if (oldName === "Library") throw new PlatformError("The Library folder cannot be renamed.", 422);
    if (oldName.toLocaleLowerCase() === "media") throw new PlatformError("“media” is the storage root name and cannot be renamed.", 422);
    if (!VALID_NAME.test(oldName) || !VALID_NAME.test(newName) || newName.toLocaleLowerCase() === "media") throw new PlatformError("Enter a valid folder name. “media” is reserved for the storage root.");
    if (oldName === newName) return Response.json({ folder: { name: newName } }, { headers: { "Cache-Control": "private, no-store" } });
    client = createStoreR2Client(config);
    const root = mediaRoot(config.prefix);
    const sourcePrefix = folderPrefix(root, oldName);
    const destinationPrefix = folderPrefix(root, newName);
    const [directSource, legacySource, destinationObjects] = await Promise.all([
      listStoreR2Objects(client, config.bucket, sourcePrefix),
      listStoreR2Objects(client, config.bucket, folderPrefix(`${root}/media`, oldName)),
      listStoreR2Objects(client, config.bucket, destinationPrefix),
    ]);
    const sourceObjects = directSource.length ? directSource : legacySource;
    const actualSourcePrefix = directSource.length ? sourcePrefix : folderPrefix(`${root}/media`, oldName);
    if (!sourceObjects.length) throw new PlatformError("Folder not found in R2.", 404);
    if (destinationObjects.length) throw new PlatformError("A folder with that name already exists.", 409);
    const copied: string[] = [];
    try {
      for (const object of sourceObjects) {
        const target = `${destinationPrefix}${object.key.slice(actualSourcePrefix.length)}`;
        await copyStoreR2Object(client, config.bucket, object.key, target);
        copied.push(target);
      }
    } catch (error) {
      for (const key of copied) await deleteStoreR2Object(client, config.bucket, key);
      throw error;
    }
    const service = platformService();
    const changedRows: Array<{ oldPath: string; newPath: string }> = [];
    try {
      for (const object of sourceObjects.filter((item) => !item.key.endsWith(`/${MARKER}`))) {
        const oldPath = `r2/${object.key}`;
        const newPath = `r2/${destinationPrefix}${object.key.slice(actualSourcePrefix.length)}`;
        const { error } = await service.from("store_media_assets").update({ storage_path: newPath, public_url: storeR2PublicUrl(config, newPath.slice(3)), folder: newName, updated_at: new Date().toISOString() }).eq("store_id", storeId).eq("storage_path", oldPath);
        if (error) throw new PlatformError("R2 folder moved, but file details could not be updated.", 503);
        changedRows.push({ oldPath, newPath });
      }
    } catch (error) {
      for (const row of changedRows.reverse()) await service.from("store_media_assets").update({ storage_path: row.oldPath, public_url: storeR2PublicUrl(config, row.oldPath.slice(3)), folder: oldName }).eq("store_id", storeId).eq("storage_path", row.newPath);
      for (const key of copied) await deleteStoreR2Object(client, config.bucket, key);
      throw error;
    }
    for (const object of sourceObjects) await deleteStoreR2Object(client, config.bucket, object.key);
    return Response.json({ folder: { name: newName } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return platformResponse(error); }
  finally { client?.destroy(); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  let client: ReturnType<typeof createStoreR2Client> | undefined;
  try {
    if (!isSameOrigin(request)) throw new PlatformError("Invalid request origin.", 403);
    const { storeId } = await params;
    await storeMember(storeId, true);
    const config = await getStoreR2Config(storeId);
    const body = await jsonBody(request);
    const name = String(body.name || "").trim();
    if (name === "Library") throw new PlatformError("The Library folder cannot be deleted.", 422);
    if (name.toLocaleLowerCase() === "media") throw new PlatformError("“media” is the storage root name and cannot be deleted.", 422);
    if (!VALID_NAME.test(name)) throw new PlatformError("Folder name is invalid.");
    client = createStoreR2Client(config);
    const root = mediaRoot(config.prefix);
    const [directObjects, legacyObjects] = await Promise.all([
      listStoreR2Objects(client, config.bucket, folderPrefix(root, name)),
      listStoreR2Objects(client, config.bucket, folderPrefix(`${root}/media`, name)),
    ]);
    const objects = [...directObjects, ...legacyObjects];
    if (!objects.length) throw new PlatformError("Folder not found in R2.", 404);
    if (objects.some((item) => !item.key.endsWith(`/${MARKER}`))) throw new PlatformError("Move or delete this folder's files before deleting it.", 409);
    for (const object of objects) await deleteStoreR2Object(client, config.bucket, object.key);
    return Response.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return platformResponse(error); }
  finally { client?.destroy(); }
}
