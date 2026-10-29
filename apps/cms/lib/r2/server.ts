import "server-only";

import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const R2_MEDIA_PREFIX = (process.env.CLOUDFLARE_R2_MEDIA_PREFIX || "zerocraft").replace(/^\/+|\/+$/g, "");

const productPathPattern = /^products\/[0-9a-f-]{36}\/([^/]+)$/i;

function normalizeSourcePath(sourcePath: string) {
  let normalized = sourcePath.replace(/^\/+/, "").replace(/^r2\//, "");
  const prefix = `${R2_MEDIA_PREFIX}/`;
  if (normalized.startsWith(prefix)) normalized = normalized.slice(prefix.length);
  const productMatch = normalized.match(productPathPattern);
  if (productMatch) return `products/${productMatch[1]}`;
  return normalized;
}

export function isR2Configured() {
  return Boolean(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim() &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.CLOUDFLARE_R2_BUCKET?.trim() &&
      process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.trim(),
  );
}

function requireR2Config() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim();
  const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new Error("Cloudflare R2 is not configured. Add the R2 account, S3 credentials, bucket, and public base URL to the server environment.");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

let client: S3Client | undefined;
function getClient() {
  const config = requireR2Config();
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  return { client, config };
}

export function r2Key(sourcePath: string) {
  return `${R2_MEDIA_PREFIX}/${normalizeSourcePath(sourcePath)}`;
}

export function r2StoragePath(sourcePath: string) {
  return `r2/${r2Key(sourcePath)}`;
}

export function r2PublicUrl(sourcePath: string) {
  const { config } = getClient();
  return `${config.publicBaseUrl}/${r2Key(sourcePath).split("/").map(encodeURIComponent).join("/")}`;
}

export async function listR2Objects(prefix = R2_MEDIA_PREFIX) {
  const { client: r2, config } = getClient();
  const objects: Array<{ key: string; size: number; lastModified: string | null }> = [];
  let continuationToken: string | undefined;

  do {
    const result = await r2.send(new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: prefix.replace(/^\/+|\/+$/g, "") + "/",
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    }));
    for (const object of result.Contents || []) {
      if (object.Key && !object.Key.endsWith("/")) {
        objects.push({
          key: object.Key,
          size: object.Size || 0,
          lastModified: object.LastModified?.toISOString() || null,
        });
      }
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

export async function putR2Object(input: { sourcePath: string; body: Uint8Array; contentType: string }) {
  const { client: r2, config } = getClient();
  const key = r2Key(input.sourcePath);
  await r2.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: input.body, ContentType: input.contentType, CacheControl: "public, max-age=31536000, immutable" }));
  return { key, storagePath: r2StoragePath(input.sourcePath), publicUrl: r2PublicUrl(input.sourcePath) };
}

export async function verifyR2Connection() {
  const { client: r2, config } = getClient();
  await r2.send(new ListObjectsV2Command({ Bucket: config.bucket, MaxKeys: 1 }));
  return { bucket: config.bucket };
}

export async function deleteR2Object(storagePath: string) {
  const { client: r2, config } = getClient();
  await r2.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: r2Key(storagePath.replace(/^r2\//, "")) }));
}
