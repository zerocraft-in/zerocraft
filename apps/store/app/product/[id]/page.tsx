import Link from "next/link";
import Image from "next/image";
import { getProductById } from "@/lib/commerce/catalog";
import ZeroPopStorePage from "@/components/zeropop-store-page";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return <ZeroPopStorePage eyebrow="Product" title="Scene not" accent="found."><div className="zeropop-page-panel"><p>This design is no longer in the current edit.</p><Link href="/store/shop" className="zeropop-page-link">Return to shop →</Link></div></ZeroPopStorePage>;
  return <ZeroPopStorePage eyebrow={`${product.category} / ${product.sku}`} title={product.title} description={product.description}><div className="zeropop-product-detail"><figure className="zeropop-product-detail__media"><Image src={product.images[0]} alt={product.title} fill sizes="(max-width: 760px) 100vw, 50vw" unoptimized priority /></figure><div className="zeropop-page-panel"><h2>{product.currency} {product.price}</h2><p>Original ZEROPOP artwork · {product.shippingBadge}. Product detail and checkout actions are available from the catalogue.</p><Link href={`/store/shop?query=${encodeURIComponent(product.title)}`} className="zeropop-page-link">Continue shopping →</Link></div></div></ZeroPopStorePage>;
}
