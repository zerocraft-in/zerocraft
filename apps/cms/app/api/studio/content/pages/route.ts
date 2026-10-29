import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses = ["draft", "published", "archived"] as const;
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);

function cleanPage(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : title);
  const status = typeof body.status === "string" && statuses.includes(body.status as (typeof statuses)[number]) ? body.status : "draft";
  return { title, slug, excerpt: typeof body.excerpt === "string" ? body.excerpt.trim() : "", content: typeof body.content === "string" ? body.content : "", status, seo_title: typeof body.seo_title === "string" ? body.seo_title.trim() : "", seo_description: typeof body.seo_description === "string" ? body.seo_description.trim() : "", featured_image_url: typeof body.featured_image_url === "string" ? body.featured_image_url.trim() : "", published_at: status === "published" ? new Date().toISOString() : null };
}

export async function GET() {
  const access = await requireStudioPermission("content.read");
  if (!access.ok) return access.response;
  const { data, error } = await access.supabase.from("cms_pages").select("*").order("updated_at", { ascending: false }).limit(250);
  if (error) return Response.json({ error: "Pages are unavailable. Apply the CMS platform migration first." }, { status: 503 });
  return Response.json({ pages: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const access = await requireStudioPermission("content.manage");
  if (!access.ok) return access.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const page = cleanPage(body);
  if (!page.title || !page.slug) return Response.json({ error: "A title and valid slug are required." }, { status: 400 });
  const { data, error } = await access.supabase.from("cms_pages").insert({ ...page, author_id: access.user.id }).select("*").single();
  if (error) return Response.json({ error: error.code === "23505" ? "That slug is already in use." : "Page could not be created." }, { status: 503 });
  return Response.json({ page: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await requireStudioPermission("content.manage");
  if (!access.ok) return access.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "Page id is required." }, { status: 400 });
  const page = cleanPage(body);
  if (!page.title || !page.slug) return Response.json({ error: "A title and valid slug are required." }, { status: 400 });
  const { data, error } = await access.supabase.from("cms_pages").update({ ...page, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) return Response.json({ error: error.code === "23505" ? "That slug is already in use." : "Page could not be updated." }, { status: 503 });
  return Response.json({ page: data });
}

export async function DELETE(request: Request) {
  const access = await requireStudioPermission("content.manage");
  if (!access.ok) return access.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Page id is required." }, { status: 400 });
  const { error } = await access.supabase.from("cms_pages").delete().eq("id", id);
  if (error) return Response.json({ error: "Page could not be deleted." }, { status: 503 });
  return Response.json({ ok: true });
}
