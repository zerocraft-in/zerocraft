import type { Product } from "@/data/products";
import { productArt } from "@/lib/art";

/** Procedural placeholder art. Replace with <Image src=... /> when you have real photos. */
export default function Art({ p, k = "" }: { p: Product; k?: string }) {
  return (
    <div
      className="product-art"
      role="img"
      aria-label={p.n}
      dangerouslySetInnerHTML={{ __html: productArt(p, k) }}
    />
  );
}
