import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/store/Breadcrumbs";
import ProductCard from "@/components/store/ProductCard";
import { getCategories, getProducts } from "@/lib/commerce/catalog";
import { IconArrowLeft } from "@/components/store/StoreIcon";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((item) => item.slug === slug);
  if (!category) return { title: "Category not found | Zerocraft Store" };
  return {
    title: `${category.name} | Zerocraft Store`,
    description: category.description || `Browse ${category.name} products from Zerocraft Store.`,
    openGraph: { title: `${category.name} | Zerocraft Store`, description: category.description || undefined, images: category.image ? [category.image] : undefined },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ subcategory?: string }>;
}) {
  const { slug } = await params;
  const { subcategory: subcategorySlug } = await searchParams;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    notFound();
  }

  const selectedSubcategory = category.subcategories.find((item) => item.slug === subcategorySlug);
  const { products: categoryProducts } = await getProducts({ categorySlug: slug, subcategorySlug: selectedSubcategory?.slug, page: 1, pageSize: 48 });

  return (
    <div className="py-8 min-h-screen">
      <div className="container-site">
        <Breadcrumbs
          items={[
            { label: "Shop", href: "/store/shop" },
            { label: category.name, href: `/store/category/${category.slug}` },
            ...(selectedSubcategory ? [{ label: selectedSubcategory.name }] : []),
          ]}
        />

        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden my-8 p-8 md:p-14 bg-neutral-900 text-white min-h-[300px] flex flex-col justify-end">
          <Image
            src={category.image}
            alt={category.name}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono bg-lime-400 text-black font-semibold uppercase mb-3">
              {categoryProducts.length} Items Available
            </span>
            <h1 className="text-3xl md:text-6xl font-bold tracking-tight text-white mb-3">
              {selectedSubcategory?.name || category.name}
            </h1>
            <p className="text-sm md:text-base text-neutral-300 font-light leading-relaxed">
              {category.description}
            </p>
          </div>
        </div>

        {/* Back & Filters Row */}
        <div className="flex items-center justify-between my-8 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <Link
            href="/store/shop"
            className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <IconArrowLeft size={16} /> Back to All Categories
          </Link>

          <span className="text-xs font-mono text-neutral-400">
            Showing all items in {category.name}
          </span>
        </div>

        {/* Products Grid */}
        {categoryProducts.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <p className="text-base font-semibold mb-2">No products in this category yet.</p>
            <Link
              href="/store/shop"
              className="text-xs font-mono text-lime-600 dark:text-lime-400 underline"
            >
              Explore all products →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
