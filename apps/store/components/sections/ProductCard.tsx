"use client";
import Link from "next/link";
import Art from "./Art";
import type { Product } from "@/data/products";
import { LG, R, defaultSize, offPercent } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function ProductCard({ p }: { p: Product }) {
  const { add, openCart, openQuick } = useStore();
  const hasVariants = Boolean(p.z?.length);
  const onSale = p.o > p.pr;
  return (
    <article className="product-card reveal-on-scroll">
      <button
        type="button"
        className="product-card__image"
        aria-label={`Quick view ${p.n}`}
        aria-haspopup="dialog"
        onClick={() => openQuick(p.id)}
      >
        <Art p={p} />
        {p.bd && <span className="product-card__badge storefront-mono">{p.bd}</span>}
        {onSale && (
          <span className="product-card__discount storefront-mono">−{offPercent(p)}%</span>
        )}
        {p.l && <span className="product-card__language storefront-mono">{LG[p.l]}</span>}
      </button>
      <div className="product-card__details">
        <small className="storefront-mono">{p.sub}</small>
        <h3>
          <Link href={`/product/${p.slug}`}>{p.n}</Link>
        </h3>
        <div className="product-card__footer">
          <div className="product-price">
            <b>{R(p.pr)}</b>
            {onSale && <s>{R(p.o)}</s>}
          </div>
          <button
            type="button"
            className="product-card__add"
            onClick={() => {
              if (hasVariants) {
                openQuick(p.id);
                return;
              }
              add(p.id, defaultSize(p));
              openCart();
            }}
          >
            {hasVariants ? "View options" : "Add to bag"}
          </button>
        </div>
        {p.bd === "Limited" && (
          <div className="product-card__stock">Only {3 + (p.id % 5)} left</div>
        )}
      </div>
    </article>
  );
}
