import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await requireStudioPermission("clients.manage");
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  if (!leadId) return Response.json({ error: "Lead id is required." }, { status: 400 });
  const { data: lead, error: leadError } = await access.supabase.from("studio_leads").select("id,name,email,phone,company").eq("id", leadId).single();
  if (leadError || !lead) return Response.json({ error: "Lead could not be found." }, { status: 404 });
  const { data: existing } = await access.supabase.from("clients").select("id,name,email").eq("email", lead.email).maybeSingle();
  const client = existing || (await access.supabase.from("clients").insert({ name: lead.name, email: lead.email, phone: lead.phone || "", company: lead.company || "", status: "active" }).select("id,name,email").single()).data;
  if (!client) return Response.json({ error: "Client could not be created." }, { status: 503 });
  const { error: updateError } = await access.supabase.from("studio_leads").update({ client_id: client.id, stage: "won", updated_at: new Date().toISOString() }).eq("id", leadId);
  if (updateError) return Response.json({ error: "Lead conversion could not be completed." }, { status: 503 });
  return Response.json({ client, leadId, converted: true });
}
