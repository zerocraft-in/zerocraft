import PointOfSalesDashboard from "../point-of-sales/point-of-sales-dashboard";

export default async function PointOfSaleChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PointOfSalesDashboard slug={slug} />;
}
