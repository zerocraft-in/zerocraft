"use client";
import Link from "next/link";
import Art from "./Art";
import { useStore } from "@/lib/store";

export default function Categories() {
  const { catalog: products } = useStore();
  const categories = [...new Set(products.map((product) => product.c))];
  return (
    <section><div className="storefront-container">
      <div className="storefront-section-heading"><div><div className="storefront-kicker storefront-mono">01 / Pick your seat</div><h2 className="storefront-display reveal-on-scroll">Shop the <em>screen.</em></h2></div><Link href="/shop" className="storefront-link storefront-mono">Shop all →</Link></div>
      <div className="category-grid reveal-on-scroll">
        {categories.map((c) => { const p = products.find((x) => x.c === c)!; return (
          <Link key={c} href={`/shop?cat=${c}`} className="category-card">
            <div className="category-card__image"><Art p={p} k="c" /></div>
            <div className="category-card__name storefront-display">{c}<small>{products.filter((x) => x.c === c).length} items</small></div>
          </Link>); })}
      </div>
    </div></section>
  );
}
