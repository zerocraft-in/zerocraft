import DevicesPageClient from "./devices-client";

export default async function PosDevicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DevicesPageClient slug={slug} />;
}

