import { requireCommercePermission } from "@/lib/commerce-auth";
import { isSameOrigin } from "@/lib/request-origin";
import { contentKinds, validateContent, type ContentKind, type MetaField } from "@/lib/content-model";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ kind: string }> };
const reply = (error: string, status = 400) => Response.json({ error }, { status });
async function run(request: Request, context: Context) {
  const { kind: rawKind } = await context.params;
  if (!contentKinds.includes(rawKind as ContentKind)) return reply("Unknown content type.", 404);
  const kind = rawKind as ContentKind;
  const read = request.method === "GET";
  if (!read && !isSameOrigin(request)) return reply("Invalid request origin.", 403);
  const access = await requireCommercePermission(kind === "folders" ? (read ? "catalog.read" : "catalog.manage") : (read ? "content.read" : "content.manage"));
  if (!access.ok) return access.response;
  const table = () => access.supabase.from("content_records");
  if (read) {
    const { data, error } = await table().select("*").eq("kind", kind).order("updated_at", { ascending: false });
    if (error) return reply("Content is unavailable. Apply the CMS content workspaces migration.", 503);
    return Response.json({ records: data }, { headers: { "Cache-Control": "private, no-store" } });
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply("Invalid JSON."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply("Invalid content.");
  if (request.method !== "POST" && (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id))) return reply("A valid record ID is required.");
  if (request.method === "DELETE") {
    const { data, error } = await table().delete().eq("kind", kind).eq("id", body.id).select("id");
    if (error) return reply(error.code === "23503" ? "Delete the entries or posts in this group first." : "Content could not be deleted.", 409);
    return data?.length ? Response.json({ ok: true }) : reply("Content not found.", 404);
  }
  const invalid = validateContent(kind, body);
  if (invalid) return reply(invalid);
  const parentId = kind === "articles" || kind === "entries" ? body.parent_id as string : null;
  if (parentId) {
    const { data: parent } = await table().select("kind,data").eq("id", parentId).single();
    if (!parent || parent.kind !== (kind === "articles" ? "blogs" : "definitions")) return reply("The selected group no longer exists.");
    if (kind === "entries") {
      const values = (body.data as Record<string, unknown>).values;
      if (!values || typeof values !== "object" || Array.isArray(values)) return reply("Entry values are required.");
      for (const field of parent.data.fields as MetaField[]) {
        const value = (values as Record<string, unknown>)[field.key];
        if (field.required && (value === undefined || value === "" || value === null)) return reply(`${field.name} is required.`);
        if (value !== undefined && value !== "" && value !== null && typeof value !== field.type.replace("text", "string")) return reply(`${field.name} has an invalid value.`);
      }
    }
  }
  // Prevent changing a definition's schema underneath existing entries.
  if (kind === "definitions" && request.method === "PATCH") {
    const [{ data: existing, error: existingError }, { count, error: countError }] = await Promise.all([table().select("data").eq("id", body.id).single(), table().select("id", { count: "exact", head: true }).eq("parent_id", body.id)]);
    if (existingError || countError) return reply("Definition usage could not be checked. Try again.", 503);
    if (count && JSON.stringify(existing?.data.fields) !== JSON.stringify((body.data as Record<string, unknown>).fields)) return reply("Remove existing entries before changing the field schema.", 409);
  }
  const record = { kind, title: (body.title as string).trim(), handle: body.handle, status: body.status, parent_id: parentId, data: body.data, updated_at: new Date().toISOString() };
  const result = request.method === "POST" ? await table().insert(record).select("*").single() : await table().update(record).eq("id", body.id).eq("kind", kind).select("*").single();
  if (result.error) return reply(result.error.code === "23505" ? "That handle or redirect source is already in use." : "Content could not be saved. Refresh and try again.", 409);
  return Response.json({ record: result.data }, { status: request.method === "POST" ? 201 : 200 });
}
export const GET = run;
export const POST = run;
export const PATCH = run;
export const DELETE = run;
