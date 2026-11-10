import { NextResponse } from "next/server";
import { apiError, audit, readJson, requireStudioAccess } from "@/lib/studio-api";

const actions = ["submit", "approve", "reject", "publish"] as const;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireStudioAccess("content.manage");
  if ("response" in access) return access.response;
  const { id } = await context.params; const body = await readJson(request); const action = typeof body?.action === "string" && actions.includes(body.action as (typeof actions)[number]) ? body.action : "submit";
  const { data: current } = await access.supabase.from("pages").select("id,status,workflow_status").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ error: "Content not found." }, { status: 404 });
  const next = action === "submit" ? "pending_review" : action === "reject" ? "rejected" : "approved";
  const updates: Record<string, unknown> = { workflow_status: next, workflow_note: typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : "", updated_at: new Date().toISOString() };
  if (action === "approve" || action === "publish") { updates.approved_by = access.user.id; updates.approved_at = new Date().toISOString(); }
  if (action === "publish") { updates.status = "published"; updates.published_at = new Date().toISOString(); }
  const { data, error } = await access.supabase.from("pages").update(updates).eq("id", id).select("*").single();
  if (error) return apiError(error, 400);
  await access.supabase.from("content_workflow_events").insert({ page_id: id, from_status: current.workflow_status, to_status: action === "publish" ? "published" : next, note: updates.workflow_note, actor_id: access.user.id });
  await audit(access.supabase, access.user.id, `content.workflow_${action}`, "page", id, { from: current.workflow_status, to: next });
  return NextResponse.json({ page: data });
}
