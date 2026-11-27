import "server-only";

import {
  DeleteObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { PlatformError, platformService, unseal } from "@/lib/platform/server";

export type StoreR2Config = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  prefix: string;
};

export async function getStoreR2Config(storeId: string) {
  const { data, error } = await platformService()
    .from("connections")
    .select("status,encrypted_config")
    .eq("store_id", storeId)
    .eq("provider", "r2")
    .maybeSingle();

  if (error) throw new PlatformError("Media storage configuration could not be loaded.", 503);
  if (!data || data.status !== "ready" || !data.encrypted_config) {
    throw new PlatformError("Connect and verify Cloudflare R2 in store setup before using Media Manager.", 409);
  }

  return unseal<StoreR2Config>(data.encrypted_config, `${storeId}:r2:connection`);
}

export function createStoreR2Client(config: StoreR2Config) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    maxAttempts: 2,
  });
}

export function storeR2PublicUrl(config: StoreR2Config, key: string) {
  const base = config.publicBaseUrl.replace(/\/$/, "");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function listStoreR2Objects(client: S3Client, bucket: string, prefix: string) {
  const objects: Array<{ key: string; size: number; lastModified: string | null }> = [];
  let continuationToken: string | undefined;
  do {
    const result = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: `${prefix.replace(/^\/+|\/+$/g, "")}/`,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    }));
    for (const item of result.Contents || []) {
      if (item.Key && !item.Key.endsWith("/")) {
        objects.push({ key: item.Key, size: item.Size || 0, lastModified: item.LastModified?.toISOString() || null });
      }
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}

export async function putStoreR2Object(input: {
  client: S3Client;
  bucket: string;
  key: string;
  body: Uint8Array;
  contentType: string;
}) {
  await input.client.send(new PutObjectCommand({
    Bucket: input.bucket,
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
}

export async function copyStoreR2Object(client: S3Client, bucket: string, sourceKey: string, destinationKey: string) {
  const source = `${bucket}/${sourceKey.split("/").map(encodeURIComponent).join("/")}`;
  await client.send(new CopyObjectCommand({ Bucket: bucket, Key: destinationKey, CopySource: source, MetadataDirective: "COPY" }));
}

export async function deleteStoreR2Object(client: S3Client, bucket: string, key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
