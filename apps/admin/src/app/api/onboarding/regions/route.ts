import { NextResponse } from "next/server";
import { allowedRegions } from "@/lib/provisioner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return NextResponse.json({ ok: true, regions: allowedRegions() });
}
