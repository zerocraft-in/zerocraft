import type { CatalogProduct } from "./catalog";
import type { Product } from "@/data/products";

const categoryMap: Record<string, Product["c"]> = {
  tees: "Tees", hoodies: "Hoodies", posters: "Posters", frames: "Frames", digital: "Digital", accessories: "Accessories",
};

function hash(value: string) {
  return [...value].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7);
}

export function catalogProductToStoreProduct(product: CatalogProduct, id = hash(product.slug) % 100000): Product {
  const category = categoryMap[product.categorySlug] ?? "Accessories";
  const type: Product["ty"] = category === "Tees" ? "tee" : category === "Hoodies" ? "hoodie" : category === "Posters" ? "poster" : category === "Frames" ? "frame" : category === "Digital" ? "digi" : "stick";
  const title = product.title.replace(/\s+/g, " ").trim();
  return {
    id, backendId: product.id, slug: product.slug, n: title, c: category, pr: product.price, o: product.originalPrice || product.price,
    ty: type, v: hash(product.slug) % 6, pal: hash(product.slug) % 6, t: title.toUpperCase().split(" ").slice(0, 3).join("|"), s: "", sub: product.subcategory || product.category,
    bd: product.isNew ? "New" : product.isSale ? "Sale" : "", r: product.rating || 4.8, z: product.sizes.length ? product.sizes : undefined,
    l: undefined, bg: "#F2B705", col: "black",
  };
}

export function catalogProductsToStoreProducts(products: CatalogProduct[]) {
  return products.map((product, index) => catalogProductToStoreProduct(product, index));
}
