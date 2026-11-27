import { NextResponse } from "next/server";
import { audit, requireStudioAccess } from "@/lib/studio-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses = ["draft", "published", "archived"] as const;
type PageStatus = (typeof statuses)[number];
const contentTypes = ["page", "blog", "testimonial", "case_study", "announcement"] as const;

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

function cleanPage(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : title);
  const status = typeof body.status === "string" && statuses.includes(body.status as PageStatus) ? body.status as PageStatus : "draft";
  return {
    title,
    slug,
    excerpt: typeof body.excerpt === "string" ? body.excerpt.trim() : "",
    content: typeof body.content === "string" ? body.content : "",
    status,
    content_type: typeof body.content_type === "string" && contentTypes.includes(body.content_type as (typeof contentTypes)[number]) ? body.content_type : "page",
    content_metadata: body.content_metadata && typeof body.content_metadata === "object" ? body.content_metadata : {},
    seo_title: typeof body.seo_title === "string" ? body.seo_title.trim() : "",
    seo_description: typeof body.seo_description === "string" ? body.seo_description.trim() : "",
    featured_image_url: typeof body.featured_image_url === "string" ? body.featured_image_url.trim() : "",
    published_at: status === "published" ? new Date().toISOString() : null,
    scheduled_at: typeof body.scheduled_at === "string" && body.scheduled_at ? body.scheduled_at : null,
    workflow_status: typeof body.workflow_status === "string" && ["draft", "pending_review", "approved", "rejected", "scheduled"].includes(body.workflow_status) ? body.workflow_status : "draft",
    workflow_note: typeof body.workflow_note === "string" ? body.workflow_note.trim().slice(0, 2000) : "",
  };
}

const columns = "id,title,slug,excerpt,content,content_type,content_metadata,status,seo_title,seo_description,featured_image_url,author_id,published_at,scheduled_at,workflow_status,workflow_note,approved_by,approved_at,created_at,updated_at";
const legacyColumns = "id,title,slug,excerpt,content,status,seo_title,seo_description,featured_image_url,author_id,published_at,created_at,updated_at";
function contentSchemaUnavailable(error: { code?: string; message?: string }) {
  return error.code === "42703" || error.code === "PGRST204" || /schema cache|column .* does not exist/i.test(error.message ?? "");
}

function normalizeLegacyPage(page: Record<string, unknown>) {
  return {
    ...page,
    content_type: "page",
    content_metadata: {},
    scheduled_at: null,
    workflow_status: page.status === "published" ? "approved" : "draft",
    workflow_note: "",
    approved_by: null,
    approved_at: null,
  };
}

async function snapshot(supabase: Awaited<ReturnType<typeof import("@/lib/studio-supabase-server").createStudioSupabaseServerClient>>, userId: string, page: Record<string, unknown>) {
  const { data: latest } = await supabase.from("content_versions").select("version").eq("page_id", page.id).order("version", { ascending: false }).limit(1).maybeSingle();
  await supabase.from("content_versions").insert({ page_id: page.id, version: (latest?.version ?? 0) + 1, created_by: userId, snapshot: { title: page.title, slug: page.slug, excerpt: page.excerpt, content: page.content, content_type: page.content_type, content_metadata: page.content_metadata, status: page.status, seo_title: page.seo_title, seo_description: page.seo_description, featured_image_url: page.featured_image_url, scheduled_at: page.scheduled_at, workflow_status: page.workflow_status } });
}

export async function GET() {
  const result = await requireStudioAccess("content.read");
  if ("response" in result) return result.response;
  const { data, error } = await result.supabase.from("pages").select(columns).order("updated_at", { ascending: false }).limit(250);
  if (!error) return NextResponse.json({ pages: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  const legacy = await result.supabase.from("pages").select(legacyColumns).order("updated_at", { ascending: false }).limit(250);
  if (legacy.error) return NextResponse.json({ error: "Content is unavailable. Apply the CMS pages migration first." }, { status: 503 });
  return NextResponse.json({ pages: (legacy.data ?? []).map((page) => normalizeLegacyPage(page as Record<string, unknown>)), migrationPending: true }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const result = await requireStudioAccess("content.manage");
  if ("response" in result) return result.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const page = cleanPage(body);
  if (!page.title || !page.slug) return NextResponse.json({ error: "A title and valid slug are required." }, { status: 400 });
  const { data, error } = await result.supabase.from("pages").insert({ ...page, author_id: result.user.id }).select(columns).single();
  if (error) {
    const schemaUnavailable = contentSchemaUnavailable(error);
    return NextResponse.json({
      error: error.code === "23505"
        ? "That slug is already in use."
        : schemaUnavailable
          ? "The CMS content migration is not applied. Apply the latest Supabase migrations to enable typed content, workflow, and version history."
          : "Page could not be created.",
    }, { status: error.code === "23505" ? 409 : 503 });
  }
  await snapshot(result.supabase, result.user.id, data);
  await audit(result.supabase, result.user.id, "content.created", "page", data.id, { slug: data.slug, status: data.status });
  return NextResponse.json({ page: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const result = await requireStudioAccess("content.manage");
  if ("response" in result) return result.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Page id is required." }, { status: 400 });
  const { data: existing, error: existingError } = await result.supabase.from("pages").select("scheduled_at,workflow_status,workflow_note").eq("id", id).maybeSingle();
  const legacyMode = Boolean(existingError);
  if (legacyMode) {
    const page = cleanPage(body);
    if (!page.title || !page.slug) return NextResponse.json({ error: "A title and valid slug are required." }, { status: 400 });
    const legacyPage = { title: page.title, slug: page.slug, excerpt: page.excerpt, content: page.content, status: page.status, seo_title: page.seo_title, seo_description: page.seo_description, featured_image_url: page.featured_image_url, updated_at: new Date().toISOString() };
    const legacyUpdate = await result.supabase.from("pages").update(legacyPage).eq("id", id).select(legacyColumns).single();
    if (legacyUpdate.error) return NextResponse.json({ error: legacyUpdate.error.code === "23505" ? "That slug is already in use." : "Page could not be updated." }, { status: legacyUpdate.error.code === "23505" ? 409 : 503 });
    await audit(result.supabase, result.user.id, "content.updated", "page", id, { slug: legacyUpdate.data.slug, status: legacyUpdate.data.status, legacy: true });
    return NextResponse.json({ page: normalizeLegacyPage(legacyUpdate.data as Record<string, unknown>), migrationPending: true });
  }
  if (!existing) return NextResponse.json({ error: "Content not found." }, { status: 404 });
  const page = cleanPage(body);
  if (!("scheduled_at" in body)) page.scheduled_at = existing.scheduled_at;
  if (!("workflow_status" in body)) page.workflow_status = existing.workflow_status;
  if (!("workflow_note" in body)) page.workflow_note = existing.workflow_note;
  if (!page.title || !page.slug) return NextResponse.json({ error: "A title and valid slug are required." }, { status: 400 });
  const { data, error } = await result.supabase.from("pages").update({ ...page, updated_at: new Date().toISOString() }).eq("id", id).select(columns).single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That slug is already in use." : "Page could not be updated." }, { status: error.code === "23505" ? 409 : 503 });
  await snapshot(result.supabase, result.user.id, data);
  await audit(result.supabase, result.user.id, "content.updated", "page", data.id, { slug: data.slug, status: data.status });
  return NextResponse.json({ page: data });
}

export async function DELETE(request: Request) {
  const result = await requireStudioAccess("content.manage");
  if ("response" in result) return result.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Page id is required." }, { status: 400 });
  const { error } = await result.supabase.from("pages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Page could not be deleted." }, { status: 503 });
  await audit(result.supabase, result.user.id, "content.deleted", "page", id);
  return NextResponse.json({ ok: true });
}
