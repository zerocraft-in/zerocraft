import CatalogHome from "@/components/store/catalog-home";
import StoreInstagramFeed from "@/components/store/StoreInstagramFeed";
import { getCategories, getCollections, getProducts } from "@/lib/commerce/catalog";

export default async function HomePage() {
  const [{ products }, categories, collections] = await Promise.all([
    getProducts({ page: 1, pageSize: 8, sort: "newest" }),
    getCategories(),
    getCollections().catch(() => []),
  ]);
  return <><CatalogHome products={products} categories={categories} collections={collections} /><StoreInstagramFeed products={products} /></>;
}
