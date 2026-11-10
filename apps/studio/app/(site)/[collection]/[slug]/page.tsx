import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContentBody, { safeImageUrl } from "@/components/content/ContentBody";
import { createStudioSupabaseServerClient } from "@/lib/studio-supabase-server";

export const dynamic = "force-dynamic";

const collectionTypes = {
  pages: "page",
  blogs: "blog",
  testimonials: "testimonial",
  "case-studies": "case_study",
  announcements: "announcement",
} as const;
type Collection = keyof typeof collectionTypes;

type PublishedContent = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  content_type: string | null;
  content_metadata: Record<string, unknown> | null;
  seo_title: string | null;
  seo_description: string | null;
  featured_image_url: string | null;
};

type ContentBlock = { id: string; title: string; body: string; done: boolean };

function isCollection(value: string): value is Collection {
  return Object.hasOwn(collectionTypes, value);
}

function isContentSchemaUnavailable(error: { code?: string; message?: string }) {
  return error.code === "42703" || error.code === "PGRST204" || /schema cache|column .* does not exist/i.test(error.message ?? "");
}

async function getPublishedContent(collection: Collection, slug: string): Promise<PublishedContent | null> {
  const supabase = await createStudioSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .select("title,slug,excerpt,content,content_type,content_metadata,seo_title,seo_description,featured_image_url")
    .eq("slug", slug)
    .eq("content_type", collectionTypes[collection])
    .eq("status", "published")
    .maybeSingle();

  if (!error) return data as PublishedContent | null;

  if (isContentSchemaUnavailable(error) && collection === "pages") {
    const legacy = await supabase
      .from("pages")
      .select("title,slug,excerpt,content,seo_title,seo_description,featured_image_url")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (!legacy.error) return legacy.data ? { ...legacy.data, content_type: "page", content_metadata: {} } as PublishedContent : null;
    console.error("Legacy published content could not be loaded", { slug, error: legacy.error.message });
    throw new Error("Published content could not be loaded.");
  }

  console.error("Published content could not be loaded", { slug, error: error.message });
  throw new Error("Published content could not be loaded.");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>;
}): Promise<Metadata> {
  const { collection, slug } = await params;
  if (!isCollection(collection)) return {};
  const content = await getPublishedContent(collection, slug);
  if (!content) return {};

  return {
    title: content.seo_title || content.title,
    description: content.seo_description || content.excerpt || undefined,
  };
}

function blocksFrom(content: PublishedContent): ContentBlock[] {
  const blocks = content.content_metadata?.blocks;
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((block, index) => {
    if (!block || typeof block !== "object" || Array.isArray(block)) return [];
    const item = block as Record<string, unknown>;
    return [{
      id: typeof item.id === "string" ? item.id : String(index),
      title: typeof item.title === "string" ? item.title : "",
      body: typeof item.body === "string" ? item.body : "",
      done: item.done === true,
    }];
  });
}

export default async function PublishedContentPage({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>;
}) {
  const { collection, slug } = await params;
  if (!isCollection(collection)) notFound();
  const content = await getPublishedContent(collection, slug);
  if (!content) notFound();

  const coverUrl = safeImageUrl(content.featured_image_url ?? "");
  const metadata = content.content_metadata ?? {};
  const blocks = blocksFrom(content);
  const testimonial = content.content_type === "testimonial";
  const structured = content.content_type === "case_study" || content.content_type === "announcement";
  const rating = Number(metadata.rating);
  const validRating = testimonial && Number.isInteger(rating) && rating >= 1 && rating <= 5;

  return (
    <main className="site-main">
      <article className="mx-auto w-full max-w-4xl px-6 py-20">
        {coverUrl && <img src={coverUrl} alt="" className="mb-10 max-h-[34rem] w-full rounded-3xl object-cover" />}
        <p className="text-sm uppercase tracking-[.18em] text-orange-300">{content.content_type?.replaceAll("_", " ") || "Page"}</p>
        <h1 className="mt-4 text-4xl font-light tracking-tight sm:text-6xl">{content.title}</h1>
        {content.excerpt && <p className="mt-6 max-w-3xl text-lg leading-relaxed text-zinc-400">{content.excerpt}</p>}
        <div className="prose prose-invert mt-10 max-w-none">
          {testimonial ? (
            <blockquote className="whitespace-pre-wrap">
              {content.content}
              <footer className="mt-4 text-base not-italic text-zinc-400">
                — {typeof metadata.person === "string" ? metadata.person : ""}
                {typeof metadata.role === "string" && metadata.role ? `, ${metadata.role}` : ""}
                {validRating && <span className="ml-3 text-pink-200" aria-label={`${rating} out of 5 stars`}>{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>}
              </footer>
            </blockquote>
          ) : structured ? (
            blocks.map((block) => (
              <section key={block.id} className="my-8">
                {block.title && <h2>{block.title}</h2>}
                {block.body && <p className="whitespace-pre-wrap">{block.body}</p>}
                {content.content_type === "announcement" && <p>{block.done ? "Complete" : "Not complete"}</p>}
              </section>
            ))
          ) : <ContentBody content={content.content ?? ""} />}
        </div>
      </article>
    </main>
  );
}
