import { NextResponse } from "next/server";
import { apiError, requireStudioAccess } from "@/lib/studio-api";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireStudioAccess("content.read");
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const { data, error } = await access.supabase.from("content_versions").select("id,page_id,version,snapshot,created_by,created_at").eq("page_id", id).order("version", { ascending: false }).limit(50);
  if (error) return apiError(error, 503);
  return NextResponse.json({ versions: data ?? [] });
}
