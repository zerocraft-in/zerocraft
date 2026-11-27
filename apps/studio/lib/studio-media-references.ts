import "server-only";

import type { createStudioSupabaseServerClient } from "./studio-supabase-server";
import { publicUrl } from "./studio-r2-server";

export type MediaReference = {
  /** Stable row identifier, e.g. "settings:workspace" or `pages:<id>`. */
  id: string;
  /** Human source of the reference. */
  source: string;
  /** Short label for the referencing screen. */
  label: string;
  /** Extra context, e.g. which record uses the asset. */
  detail: string;
  /** Where to fix or inspect the reference. */
  href: string;
};

type StudioSupabase = Awaited<ReturnType<typeof createStudioSupabaseServerClient>>;

/**
 * Assets live in R2, but they are rendered by workspace branding, CMS pages,
 * and portfolio works. Guard deletes by checking every surface that can link
 * an R2 object so in-use files refuse to disappear.
 */
export async function findMediaReferences(
  supabase: StudioSupabase,
  key: string,
): Promise<MediaReference[]> {
  const baseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  const needles = Array.from(new Set([key, publicUrl(key, baseUrl)].filter(Boolean) as string[]));
  if (!needles.length) return [];

  const usedIn = (value: unknown) =>
    typeof value === "string" && needles.some((needle) => value.includes(needle));

  const references: MediaReference[] = [];

  // Workspace branding (logo and favicon are plain URL columns, so check in
  // application code instead of another likeness query).
  try {
    const { data: settings } = await supabase
      .from("workspace_settings")
      .select("id,brand_name,logo_url,favicon_url")
      .eq("id", 1)
      .maybeSingle();
    if (settings) {
      const used: string[] = [];
      if (usedIn(settings.logo_url)) used.push("workspace logo");
      if (usedIn(settings.favicon_url)) used.push("workspace favicon");
      if (used.length) {
        references.push({
          id: "workspace_settings:1",
          source: "Workspace branding",
          label: "Workspace branding",
          detail: `Used as the ${used.join(" and ")}.`,
          href: "/studio/settings",
        });
      }
    }
  } catch (error) {
    console.warn("Media reference check skipped for workspace_settings", error);
  }

  // CMS pages: cover images and any markdown/HTML body references.
  const seenPages = new Set<string>();
  for (const needle of needles) {
    const pattern = `%${needle}%`;
    if (pattern.includes(",")) continue; // PostgREST "or" list would split the pattern.
    try {
      const { data } = await supabase
        .from("pages")
        .select("id,title,slug")
        .or(`featured_image_url.ilike.${pattern},content.ilike.${pattern}`);
      for (const row of data ?? []) {
        if (seenPages.has(row.id)) continue;
        seenPages.add(row.id);
        references.push({
          id: `pages:${row.id}`,
          source: "Content page",
          label: "Content page",
          detail: row.title || row.slug || "Untitled page",
          href: "/studio/content",
        });
      }
    } catch (error) {
      console.warn("Media reference check skipped for pages", error);
    }
  }

  // Portfolio works table (public site home).
  const seenWorks = new Set<string>();
  for (const needle of needles) {
    try {
      const { data } = await supabase
        .from("works")
        .select("id,title,image_url")
        .ilike("image_url", `%${needle}%`);
      for (const row of data ?? []) {
        if (seenWorks.has(row.id)) continue;
        seenWorks.add(row.id);
        references.push({
          id: `works:${row.id}`,
          source: "Portfolio work",
          label: "Portfolio work",
          detail: row.title || "Untitled work",
          href: "/",
        });
      }
    } catch (error) {
      console.warn("Media reference check skipped for works", error);
    }
  }

  return references;
}
