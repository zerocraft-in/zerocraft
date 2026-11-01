import { redirect } from "next/navigation";

export default async function CustomDataSettingsAlias({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/store/${slug}/settings/custom-data`);
}
