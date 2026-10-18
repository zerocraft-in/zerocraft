import Link from "next/link";
import ZeroPopStorePage from "@/components/zeropop-store-page";

export default async function CustomizePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ZeroPopStorePage eyebrow={`Custom / ${slug}`} title="Make it" accent="yours."><div className="zeropop-page-panel"><h2>Custom scene studio.</h2><p>Personalisation options for this design will appear here. Choose a base piece from the catalogue to begin.</p><Link href="/store/shop" className="zeropop-page-link">Choose a design →</Link></div></ZeroPopStorePage>;
}
