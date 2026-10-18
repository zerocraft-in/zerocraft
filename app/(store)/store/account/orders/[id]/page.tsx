import Link from "next/link";
import ZeroPopStorePage from "@/components/zeropop-store-page";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ZeroPopStorePage eyebrow={`Order / ${id}`} title="Order" accent="details."><div className="zeropop-page-panel"><h2>Tracking your scene.</h2><p>Order updates and delivery details for this reference will appear here.</p><Link href="/store/account/orders" className="zeropop-page-link">Back to orders →</Link></div></ZeroPopStorePage>;
}
