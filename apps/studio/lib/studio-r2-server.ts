import "server-only";

import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const prefix = "studio";

function config() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  const bucket = (process.env.CLOUDFLARE_R2_BUCKET || "zerocraft-media").trim();
  const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error("Cloudflare R2 is not configured on the server.");
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

export function isR2Configured() {
  return Boolean(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim()
    && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim()
    && process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim(),
  );
}

/**
 * R2 is pay-as-you-go, so there is no hard quota. This is the workspace-facing
 * capacity used for the library's storage gauge. Override it with
 * CLOUDFLARE_R2_CAPACITY_GB (whole gigabytes, default 10).
 */
export function r2CapacityBytes() {
  const parsed = Number(process.env.CLOUDFLARE_R2_CAPACITY_GB || "10");
  const gigabytes = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  return Math.round(gigabytes * 1024 ** 3);
}

export function r2Client() {
  const value = config();
  return { value, client: new S3Client({ region: "auto", endpoint: `https://${value.accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: value.accessKeyId, secretAccessKey: value.secretAccessKey }, maxAttempts: 2 }) };
}

export function safeSegment(value: string) {
  return value.trim().replace(/\\/g, "/").split("/").filter(Boolean).map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "-")).filter(Boolean).join("/") || "general";
}

export function safeFileName(value: string) {
  const clean = value.trim().split(/[\\/]/).pop() || "asset";
  return clean.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "asset";
}

/** Human-facing asset category derived from the stored content type. */
export function typeFor(mime: string) {
  if (mime === "image/svg+xml") return "SVG";
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  return "Doc";
}

export function safeFolderName(value: string) {
  const clean = value.trim().replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  if (!clean || clean === "." || clean === "..") throw new Error("Folder names must contain letters, numbers, dots, underscores, or hyphens.");
  return clean;
}

export function publicUrl(key: string, baseUrl?: string) {
  if (!baseUrl) return null;
  return `${baseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function studioObjectExists(key: string) {
  const { client, value } = r2Client();
  try {
    await client.send(new HeadObjectCommand({ Bucket: value.bucket, Key: key }));
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 404 || (error as { name?: string })?.name === "NotFound") return false;
    throw error;
  }
}

/**
 * Find an unused key for `clean`: `studio/<folder>/<name>` (or `studio/<name>`
 * at the root when folder is empty), falling back to stem-2.ext, stem-3.ext …
 * Never overwrites an existing object, because CacheControl "immutable" would
 * keep serving the stale copy.
 */
async function nextAvailableKey(folder: string, clean: string) {
  const base = folder ? `${prefix}/${folder}/${clean}` : `${prefix}/${clean}`;
  if (!(await studioObjectExists(base))) return base;
  const dot = clean.lastIndexOf(".");
  const stem = dot > 0 ? clean.slice(0, dot) : clean;
  const ext = dot > 0 ? clean.slice(dot) : "";
  for (let n = 2; n < 1000; n += 1) {
    const candidate = folder ? `${prefix}/${folder}/${stem}-${n}${ext}` : `${prefix}/${stem}-${n}${ext}`;
    if (!(await studioObjectExists(candidate))) return candidate;
  }
  return folder ? `${prefix}/${folder}/${crypto.randomUUID()}-${clean}` : `${prefix}/${crypto.randomUUID()}-${clean}`;
}

/**
 * Human-readable upload keys: zerocraft-media/studio/<folder>/<original name>.
 * A collision suffix keeps immutable contents intact.
 */
export async function uniqueStudioKey(folder: string, fileName: string) {
  return nextAvailableKey(folder.trim() ? safeSegment(folder) : "", safeFileName(fileName));
}

export async function listStudioObjects(folder?: string) {
  const { client, value } = r2Client();
  const objects: Array<{ key: string; size: number; lastModified: string | null }> = [];
  let token: string | undefined;
  const requestedPrefix = folder ? `${prefix}/${safeSegment(folder)}/` : `${prefix}/`;
  do {
    const result = await client.send(new ListObjectsV2Command({ Bucket: value.bucket, Prefix: requestedPrefix, MaxKeys: 1000, ContinuationToken: token }));
    for (const item of result.Contents ?? []) if (item.Key && !item.Key.endsWith("/")) objects.push({ key: item.Key, size: item.Size ?? 0, lastModified: item.LastModified?.toISOString() ?? null });
    token = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (token);
  return { objects, bucket: value.bucket };
}

export async function putStudioObject(input: { key: string; body: Uint8Array; contentType: string; altText?: string }) {
  const { client, value } = r2Client();
  await client.send(new PutObjectCommand({ Bucket: value.bucket, Key: input.key, Body: input.body, ContentType: input.contentType, CacheControl: "public, max-age=31536000, immutable", Metadata: { "alt-text": input.altText?.trim() || "" } }));
  return { bucket: value.bucket, publicUrl: publicUrl(input.key, value.publicBaseUrl) };
}

export async function headStudioObject(key: string) {
  const { client, value } = r2Client();
  const result = await client.send(new HeadObjectCommand({ Bucket: value.bucket, Key: key }));
  return { contentType: result.ContentType || "application/octet-stream", altText: result.Metadata?.["alt-text"] || result.Metadata?.alttext || "" };
}

/**
 * Move an object to a new key, keeping its content and metadata (CopyObject
 * carries them over by default). Renames within the current folder or moves
 * to another one; an empty target `folder` places the object at `studio/`.
 * A numeric suffix resolves name clashes. Used for renaming/moving without
 * re-uploading.
 */
export async function renameStudioObject(key: string, fileName: string, targetFolder?: string) {
  const segments = key.split("/");
  const currentFolder = segments.slice(1, -1).join("/");
  const folder = targetFolder !== undefined
    ? (targetFolder.trim() ? safeSegment(targetFolder) : "")
    : currentFolder;
  const clean = safeFileName(fileName);
  const desired = folder ? `${prefix}/${folder}/${clean}` : `${prefix}/${clean}`;
  const target = desired === key ? key : await nextAvailableKey(folder, clean);
  if (target === key) return { key };
  const { client, value } = r2Client();
  await client.send(new CopyObjectCommand({
    Bucket: value.bucket,
    Key: target,
    CopySource: `${value.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,
  }));
  await client.send(new DeleteObjectCommand({ Bucket: value.bucket, Key: key }));
  return { key: target };
}

export async function copyStudioObject(key: string, targetFolder: string) {
  if (!key.startsWith(`${prefix}/`) || key.endsWith("/")) throw new Error("Invalid Studio media key.");
  const folder = targetFolder.trim() ? safeSegment(targetFolder) : "";
  const fileName = safeFileName(key.split("/").pop() ?? "asset");
  const target = await nextAvailableKey(folder, fileName);
  const { client, value } = r2Client();
  await client.send(new CopyObjectCommand({
    Bucket: value.bucket,
    Key: target,
    CopySource: `${value.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,
  }));
  return { key: target };
}

export async function updateStudioObjectMetadata(key: string, altText: string) {
  const { client, value } = r2Client();
  const current = await client.send(new HeadObjectCommand({ Bucket: value.bucket, Key: key }));
  await client.send(new CopyObjectCommand({
    Bucket: value.bucket,
    Key: key,
    CopySource: `${value.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,
    MetadataDirective: "REPLACE",
    Metadata: { "alt-text": altText.trim() },
    ContentType: current.ContentType || "application/octet-stream",
    CacheControl: current.CacheControl || "public, max-age=31536000, immutable",
  }));
  return { key };
}

export async function putStudioFolderMarker(folder: string) {
  const { client, value } = r2Client();
  const key = `${prefix}/${safeFolderName(folder)}/.keep`;
  await client.send(new PutObjectCommand({ Bucket: value.bucket, Key: key, Body: new Uint8Array(), ContentType: "application/x-directory" }));
  return { bucket: value.bucket, key };
}

export async function renameStudioFolder(fromFolder: string, toFolder: string) {
  const source = safeFolderName(fromFolder);
  const destination = safeFolderName(toFolder);
  const { client, value } = r2Client();
  const listed = await listStudioObjects(source);
  for (const object of listed.objects) {
    const suffix = object.key.slice(`${prefix}/${source}/`.length);
    const target = `${prefix}/${destination}/${suffix}`;
    await client.send(new CopyObjectCommand({ Bucket: value.bucket, Key: target, CopySource: `${value.bucket}/${object.key.split("/").map(encodeURIComponent).join("/")}` }));
  }
  for (const object of listed.objects) await client.send(new DeleteObjectCommand({ Bucket: value.bucket, Key: object.key }));
  return { count: listed.objects.length };
}

export async function deleteStudioObject(key: string) {
  const { client, value } = r2Client();
  if (!key.startsWith(`${prefix}/`)) throw new Error("Only studio media objects can be deleted.");
  await client.send(new DeleteObjectCommand({ Bucket: value.bucket, Key: key }));
}
