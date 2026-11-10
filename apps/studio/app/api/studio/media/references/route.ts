import { NextResponse } from "next/server";
import { requireStudioAccess } from "@/lib/studio-api";
import { findMediaReferences } from "@/lib/studio-media-references";
import { isR2Configured } from "@/lib/studio-r2-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await requireStudioAccess("media.read");
  if ("response" in result) return result.response;
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!key.startsWith("studio/")) return NextResponse.json({ error: "Invalid Studio media key." }, { status: 400 });
  if (!isR2Configured()) return NextResponse.json({ error: "Cloudflare R2 is not configured on the server." }, { status: 503 });
  try {
    const references = await findMediaReferences(result.supabase, key);
    return NextResponse.json({ references });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not check references." }, { status: 503 });
  }
}
