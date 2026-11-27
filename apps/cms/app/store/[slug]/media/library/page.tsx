import { redirect } from "next/navigation";

export default async function MediaLibraryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/store/${encodeURIComponent(slug)}/content/files`);
}
