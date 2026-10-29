import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stages = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;

export async function GET() {
  const access = await requireStudioPermission("clients.read");
  if (!access.ok) return access.response;
  const { data, error } = await access.supabase.from("studio_leads").select("id,client_id,name,email,phone,company,stage,source,utm_source,utm_medium,utm_campaign,service_interest,owner_id,next_action,next_action_at,notes,created_at,updated_at").order("updated_at", { ascending: false }).limit(250);
  if (error) return Response.json({ error: "Lead pipeline is unavailable. Apply the leads migration first." }, { status: 503 });
  return Response.json({ leads: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const access = await requireStudioPermission("clients.manage");
  if (!access.ok) return access.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const stage = typeof body.stage === "string" && stages.includes(body.stage as (typeof stages)[number]) ? body.stage : "new";
  if (!name || !email || !email.includes("@")) return Response.json({ error: "Name and a valid email are required." }, { status: 400 });
  const { data, error } = await access.supabase.from("studio_leads").insert({ name, email, phone: typeof body.phone === "string" ? body.phone.trim() : "", company: typeof body.company === "string" ? body.company.trim() : "", stage, source: typeof body.source === "string" ? body.source.trim() || "manual" : "manual", service_interest: typeof body.service_interest === "string" ? body.service_interest.trim() : "", next_action: typeof body.next_action === "string" ? body.next_action.trim() : "", notes: typeof body.notes === "string" ? body.notes.trim() : "" }).select("*").single();
  if (error) return Response.json({ error: "Lead could not be created." }, { status: 503 });
  return Response.json({ lead: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await requireStudioPermission("clients.manage");
  if (!access.ok) return access.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "Lead id is required." }, { status: 400 });
  const update: Record<string, unknown> = {};
  for (const key of ["name", "email", "phone", "company", "source", "service_interest", "next_action", "notes", "next_action_at", "owner_id"]) if (key in body) update[key] = typeof body[key] === "string" ? body[key].trim() : body[key];
  if (typeof body.stage === "string" && stages.includes(body.stage as (typeof stages)[number])) update.stage = body.stage;
  update.updated_at = new Date().toISOString();
  const { data, error } = await access.supabase.from("studio_leads").update(update).eq("id", id).select("*").single();
  if (error) return Response.json({ error: "Lead could not be updated." }, { status: 503 });
  return Response.json({ lead: data });
}
