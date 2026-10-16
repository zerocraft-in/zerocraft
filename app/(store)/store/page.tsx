import PosterizedHome from "@/components/store/posterized-home";
import { getProducts } from "@/lib/commerce/catalog";

export default async function HomePage() {
  const { products } = await getProducts({ page: 1, pageSize: 8, sort: "newest" });
  return <PosterizedHome products={products} />;
}
