import { NextResponse } from "next/server";
import { apiError, audit, requireStudioAccess } from "@/lib/studio-api";

export async function POST(_request: Request, context: { params: Promise<{ id: string; version: string }> }) {
  const access = await requireStudioAccess("content.manage");
  if ("response" in access) return access.response;
  const { id, version } = await context.params;
  const { data: revision, error: revisionError } = await access.supabase.from("content_versions").select("snapshot").eq("page_id", id).eq("version", Number(version)).maybeSingle();
  if (revisionError) return apiError(revisionError, 503);
  if (!revision) return NextResponse.json({ error: "Version not found." }, { status: 404 });
  const snapshot = revision.snapshot as Record<string, unknown>;
  const { data, error } = await access.supabase.from("pages").update({ title: snapshot.title, slug: snapshot.slug, excerpt: snapshot.excerpt, content: snapshot.content, content_type: snapshot.content_type ?? "page", content_metadata: snapshot.content_metadata ?? {}, seo_title: snapshot.seo_title, seo_description: snapshot.seo_description, featured_image_url: snapshot.featured_image_url, status: "draft", published_at: null, scheduled_at: null, workflow_status: "draft", updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) return apiError(error, 400);
  await access.supabase.from("content_workflow_events").insert({ page_id: id, from_status: "restored", to_status: "draft", note: `Restored version ${version}.`, actor_id: access.user.id });
  await audit(access.supabase, access.user.id, "content.version_restored", "page", id, { version: Number(version) });
  return NextResponse.json({ page: data });
}
