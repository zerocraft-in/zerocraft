import { NextResponse } from "next/server";
import { apiError, audit, readJson, requireStudioAccess, text } from "@/lib/studio-api";

const stages = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;

export async function GET(request: Request) {
  const access = await requireStudioAccess("leads.read");
  if ("response" in access) return access.response;
  const params = new URL(request.url).searchParams;
  const requestedPage = Number(params.get("page") || 1);
  const requestedPageSize = Number(params.get("pageSize") || 50);
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, requestedPage) : 1;
  const pageSize = Number.isSafeInteger(requestedPageSize)
    ? Math.min(100, Math.max(1, requestedPageSize))
    : 50;
  const search = params.get("search")?.trim();
  let query = access.supabase
    .from("leads")
    .select("id,name,email,company,stage,source,service_interest,next_action,next_action_at,updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (params.get("stage") && stages.includes(params.get("stage") as (typeof stages)[number])) query = query.eq("stage", params.get("stage")!);
  if (params.get("ownerId")) query = query.eq("owner_id", params.get("ownerId")!);
  if (params.get("source")) query = query.eq("source", params.get("source")!);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,service_interest.ilike.%${search}%`);
  const { data, count, error } = await query;
  if (error) return apiError(error, 503);
  return NextResponse.json({ leads: data ?? [], page, pageSize, total: count ?? 0 });
}

export async function POST(request: Request) {
  const access = await requireStudioAccess("leads.manage");
  if ("response" in access) return access.response;
  try {
    const body = await readJson(request);
    const name = text(body?.name, "Name", 160);
    const email = text(body?.email, "Email", 320);
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email must be valid.");
    const stage = typeof body?.stage === "string" && stages.includes(body.stage as (typeof stages)[number]) ? body.stage : "new";
    const values = {
      name, email, stage, phone: typeof body?.phone === "string" ? body.phone.trim().slice(0, 60) : "",
      company: typeof body?.company === "string" ? body.company.trim().slice(0, 180) : "",
      source: typeof body?.source === "string" ? body.source.trim().slice(0, 80) || "manual" : "manual",
      utm_source: typeof body?.utm_source === "string" ? body.utm_source.trim().slice(0, 120) : null,
      utm_medium: typeof body?.utm_medium === "string" ? body.utm_medium.trim().slice(0, 120) : null,
      utm_campaign: typeof body?.utm_campaign === "string" ? body.utm_campaign.trim().slice(0, 120) : null,
      service_interest: typeof body?.service_interest === "string" ? body.service_interest.trim().slice(0, 180) : "",
      owner_id: typeof body?.owner_id === "string" ? body.owner_id : null,
      next_action: typeof body?.next_action === "string" ? body.next_action.trim().slice(0, 300) : "",
      next_action_at: typeof body?.next_action_at === "string" && body.next_action_at ? body.next_action_at : null,
      notes: typeof body?.notes === "string" ? body.notes.trim().slice(0, 4000) : "",
    };
    const { data: duplicate } = await access.supabase.from("leads").select("id").ilike("email", email).neq("stage", "lost").limit(1).maybeSingle();
    if (duplicate) return NextResponse.json({ error: "An active lead with this email already exists.", leadId: duplicate.id }, { status: 409 });
    const { data, error } = await access.supabase.from("leads").insert(values).select("*").single();
    if (error) return apiError(error, 400);
    await audit(access.supabase, access.user.id, "lead.created", "studio_lead", data.id);
    return NextResponse.json({ lead: data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
