import PointOfSalesDashboard from "./point-of-sales-dashboard";

export default async function PointOfSalesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PointOfSalesDashboard slug={slug} />;
}
