import "server-only";

import { requireStudioPermission, type StudioPermission } from "@/lib/studio-auth";
import { GmailError } from "./gmail";

export async function requireGmailAdmin(permission: StudioPermission) {
  const access = await requireStudioPermission(permission);
  if (!access.ok) return access;
  if (access.role !== "admin") {
    return {
      ok: false as const,
      response: Response.json(
        { error: "Gmail workspace access is restricted to Studio admins." },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      ),
    };
  }
  return { ok: true as const, access };
}

export function gmailErrorResponse(error: unknown) {
  if (error instanceof GmailError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  console.error("Unexpected Gmail workspace error", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return Response.json(
    { error: "The email workspace request failed unexpectedly." },
    { status: 500, headers: { "Cache-Control": "private, no-store" } },
  );
}

export function gmailJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function bodyTooLarge(request: Request, limitBytes = 4_300_000) {
  const contentLength = Number(request.headers.get("content-length"));
  return Number.isFinite(contentLength) && contentLength > limitBytes;
}

export function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/.test(value);
}

export function validEmailList(value: unknown): string[] | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  const addresses = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (!addresses.length || addresses.length > 20 || addresses.some((item) => !validEmail(item))) return null;
  return addresses;
}

export function cleanHeader(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
}
