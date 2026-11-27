import { redirect } from "next/navigation";
import { storePage } from "@/lib/platform/page-access";
import { StoreOverview } from "@/components/platform/store-overview";
export default async function StoreHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { store } = await storePage(slug);
  if (!store.setup_completed_at) redirect(`/store/${store.slug}/setup`);
  return (
    <StoreOverview
      name={store.name}
      slug={store.slug}
      setupCompleted={store.setup_completed_at}
    />
  );
}
