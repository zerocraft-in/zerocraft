import PosSettingsPageClient from "./settings-client";

export default async function PosSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PosSettingsPageClient slug={slug} />;
}

