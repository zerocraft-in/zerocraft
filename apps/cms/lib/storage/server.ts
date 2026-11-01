import "server-only";

import { createClient } from "@zerocraft/supabase/server";
import { requireCommerceAccess, requireCommercePermission, type CommercePermission } from "@/lib/commerce-auth";

export const PRODUCT_MEDIA_BUCKET = "product-media" as const;
export const CUSTOMER_CUSTOMIZATIONS_BUCKET = "customer-customizations" as const;
export const DIGITAL_PRODUCTS_BUCKET = "digital-products" as const;

const productMediaTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const customizationTypes = new Map([
  ...productMediaTypes,
  ["application/pdf", ".pdf"],
]);
const digitalProductTypes = new Map([
  ["application/pdf", ".pdf"],
  ["application/zip", ".zip"],
  ["application/x-zip-compressed", ".zip"],
  ["application/octet-stream", ".bin"],
  ["audio/mpeg", ".mp3"],
  ["video/mp4", ".mp4"],
  ["text/plain", ".txt"],
]);

export type StorageUploadKind = "product-media" | "customer-customizations" | "digital-products";

export function validateStorageFile(file: File, kind: StorageUploadKind) {
  const types = kind === PRODUCT_MEDIA_BUCKET ? productMediaTypes : kind === DIGITAL_PRODUCTS_BUCKET ? digitalProductTypes : customizationTypes;
  const extension = types.get(file.type);
  const maxBytes = kind === PRODUCT_MEDIA_BUCKET ? 10 * 1024 * 1024 : kind === DIGITAL_PRODUCTS_BUCKET ? 250 * 1024 * 1024 : 25 * 1024 * 1024;
  if (!extension || file.size <= 0 || file.size > maxBytes) {
    throw new Error(kind === PRODUCT_MEDIA_BUCKET
      ? "Use a JPEG, PNG, or WebP image up to 10 MB."
      : kind === DIGITAL_PRODUCTS_BUCKET
        ? "Use PDF, ZIP, MP3, MP4, TXT, or a binary file up to 250 MB."
        : "Use a JPEG, PNG, WebP, or PDF file up to 25 MB.");
  }
  return { extension };
}

export function safeObjectKey(prefix: string, extension: string) {
  return `${prefix}/${crypto.randomUUID()}${extension}`;
}

export async function requireCommerceStorageClient(permission?: CommercePermission) {
  const access = permission ? await requireCommercePermission(permission) : await requireCommerceAccess();
  if (!access.ok) throw new Error(access.response.status === 401 ? "Sign in to use Commerce." : "You do not have permission to manage this resource.");
  return { supabase: access.supabase, user: access.user };
}

export async function requireCustomerStorageClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to upload customization artwork.");
  return { supabase, user };
}

export function isProductMediaPath(path: string, productId: string) {
  const parts = path.startsWith("r2/") ? path.split("/").slice(1) : path.split("/");
  const filePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;
  if (parts[0] === "assets" && parts[1] === "products") return parts.length === 3 && filePattern.test(parts[2] ?? "");
  if (parts[0] === "assets" && parts[1] === "library") return parts.length === 3 && filePattern.test(parts[2] ?? "");
  if (parts[0] === "library") return parts.length === 2 && filePattern.test(parts[1] ?? "");
  return parts[0] === "products" && parts[1] === productId && parts.length === 3 && filePattern.test(parts[2] ?? "");
}

export function isCustomerCustomizationPath(path: string, userId: string) {
  const [ownerId, fileName, ...extra] = path.split("/");
  return ownerId === userId
    && extra.length === 0
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/i.test(fileName ?? "");
}

export function isDigitalProductPath(path: string, productId: string) {
  const [root, ownerId, fileName, ...extra] = path.split("/");
  return root === "products"
    && ownerId === productId
    && extra.length === 0
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|zip|mp3|mp4|txt|bin)$/i.test(fileName ?? "");
}
