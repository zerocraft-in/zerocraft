import { NextResponse } from "next/server";
import { apiError, audit, readJson, requireStudioAccess } from "@/lib/studio-api";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const access = await requireStudioAccess("leads.read");
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const [{ data: lead, error }, { data: activities, error: activityError }] = await Promise.all([
    access.supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    access.supabase.from("lead_activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);
  if (error || activityError) return apiError(error ?? activityError, 503);
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  return NextResponse.json({ lead, activities: activities ?? [] });
}

export async function PATCH(request: Request, context: Context) {
  const access = await requireStudioAccess("leads.manage");
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const body = await readJson(request);
  const allowed = ["name", "email", "phone", "company", "source", "utm_source", "utm_medium", "utm_campaign", "service_interest", "owner_id", "next_action", "next_action_at", "notes"];
  const updates = Object.fromEntries(Object.entries(body ?? {}).filter(([key]) => allowed.includes(key)));
  if (typeof updates.name === "string") updates.name = updates.name.trim().slice(0, 160);
  for (const key of ["phone", "company", "source", "service_interest", "next_action", "notes"]) if (typeof updates[key] === "string") updates[key] = updates[key].trim();
  if (typeof updates.email === "string" && !/^\S+@\S+\.\S+$/.test(updates.email)) return NextResponse.json({ error: "Email must be valid." }, { status: 400 });
  updates.updated_at = new Date().toISOString();
  const { data, error } = await access.supabase.from("leads").update(updates).eq("id", id).select("*").maybeSingle();
  if (error) return apiError(error, 400);
  if (!data) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  await audit(access.supabase, access.user.id, "lead.updated", "studio_lead", id, { fields: Object.keys(updates) });
  return NextResponse.json({ lead: data });
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requireStudioAccess("leads.manage");
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const { data: existing } = await access.supabase.from("leads").select("id,name").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  const { error } = await access.supabase.from("leads").delete().eq("id", id);
  if (error) return apiError(error, 400);
  await audit(access.supabase, access.user.id, "lead.deleted", "studio_lead", id, { name: existing.name });
  return NextResponse.json({ ok: true });
}
