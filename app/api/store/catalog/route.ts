import { getCategories, getCollections, getProductById, getProductBySlug, getProducts } from "@/lib/commerce/catalog";

export const runtime = "nodejs";

const listingHeaders = { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" };
const detailHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || 1);
  const pageSize = Number(url.searchParams.get("pageSize") || 24);
  const query = url.searchParams.get("query") || undefined;
  const categorySlug = url.searchParams.get("category") || undefined;
  const collectionSlug = url.searchParams.get("collection") || undefined;
  const sort = (url.searchParams.get("sort") || "newest") as "newest" | "price-asc" | "price-desc" | "title";
  const slug = url.searchParams.get("slug");
  const id = url.searchParams.get("id");

  try {
    if (slug) {
      const product = await getProductBySlug(slug);
      return product
        ? Response.json({ product }, { headers: detailHeaders })
        : Response.json({ error: "Product not found." }, { status: 404, headers: detailHeaders });
    }
    if (id) {
      const product = await getProductById(id);
      return product
        ? Response.json({ product }, { headers: detailHeaders })
        : Response.json({ error: "Product not found." }, { status: 404, headers: detailHeaders });
    }
    const [products, categories, collections] = await Promise.all([
      getProducts({ page, pageSize, query, categorySlug, collectionSlug, sort }),
      getCategories(),
      getCollections().catch((error) => {
        console.warn("Collections are unavailable until the commerce foundation migration is applied", error);
        return [];
      }),
    ]);
    return Response.json({ products, categories, collections }, {
      headers: listingHeaders,
    });
  } catch (error) {
    console.error("Store catalog request failed", error);
    return Response.json({ error: "The catalog is temporarily unavailable." }, { status: 503 });
  }
}
