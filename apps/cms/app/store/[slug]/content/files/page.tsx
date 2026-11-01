import { FilesMediaManager } from "@/components/commerce/files-media-manager";
import { storePage } from "@/lib/platform/page-access";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store } = await storePage(slug);
  return <FilesMediaManager storeId={store.id} />;
}
