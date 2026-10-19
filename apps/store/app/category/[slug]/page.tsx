import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getProducts } from "@/lib/commerce/catalog";
import ZeroPopStorePage from "@/components/zeropop-store-page";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = (await getCategories()).find((item) => item.slug === slug);
  if (!category) notFound();
  const result = await getProducts({ categorySlug: slug, pageSize: 48 });
  return <ZeroPopStorePage eyebrow={`Category / ${category.name}`} title="Shop the" accent={category.name + "."} description={category.description}><div className="zeropop-page-panel"><h2>{result.total} pieces in this frame.</h2><p>Browse the full {category.name.toLowerCase()} edit in the catalogue.</p><Link href={`/store/shop?category=${slug}`} className="zeropop-page-link">Open the collection →</Link></div></ZeroPopStorePage>;
}
