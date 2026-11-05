import "server-only";

import { CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export function safeFolderName(value: string) {
  const clean = value.trim().replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  if (!clean || clean === "." || clean === "..") throw new Error("Folder names must contain letters, numbers, dots, underscores, or hyphens.");
  return clean;
}

export function studioKey(folder: string, fileName: string) {
  return `${prefix}/${safeSegment(folder)}/${crypto.randomUUID()}-${safeFileName(fileName)}`;
}

export function publicUrl(key: string, baseUrl?: string) {
  if (!baseUrl) return null;
  return `${baseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
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

export async function putStudioObject(input: { key: string; body: Uint8Array; contentType: string }) {
  const { client, value } = r2Client();
  await client.send(new PutObjectCommand({ Bucket: value.bucket, Key: input.key, Body: input.body, ContentType: input.contentType, CacheControl: "public, max-age=31536000, immutable" }));
  return { bucket: value.bucket, publicUrl: publicUrl(input.key, value.publicBaseUrl) };
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
