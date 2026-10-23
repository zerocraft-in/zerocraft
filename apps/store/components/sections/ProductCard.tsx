"use client";
import Link from "next/link";
import Art from "./Art";
import type { Product } from "@/data/products";
import { LG, R, defaultSize, offPercent } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function ProductCard({ p }: { p: Product }) {
  const { wish, toggleWish, add, openQuick } = useStore();
  const saved = wish.includes(p.id);
  return (
    <article className="product-card reveal-on-scroll">
      <div
        className="product-card__image"
        role="button"
        tabIndex={0}
        aria-label={`Quick view ${p.n}`}
        onClick={() => openQuick(p.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openQuick(p.id);
          }
        }}
      >
        <Art p={p} />
        {p.bd && <span className="product-card__badge storefront-mono">{p.bd}</span>}
        <span className="product-card__discount storefront-mono">−{offPercent(p)}%</span>
        {p.l && <span className="product-card__language storefront-mono">{LG[p.l]}</span>}
        <button
          className={"product-card__wishlist" + (saved ? " is-active" : "")}
          aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(e) => {
            e.stopPropagation();
            toggleWish(p.id);
          }}
        >
          {saved ? "♥" : "♡"}
        </button>
      </div>
      <div className="product-card__details">
        <small className="storefront-mono">{p.sub}</small>
        <h3>
          <Link href={`/product/${p.slug}`}>{p.n}</Link>
        </h3>
        <div className="product-card__footer">
          <div className="product-price">
            <b>{R(p.pr)}</b>
            <s>{R(p.o)}</s>
          </div>
          <button className="product-card__add" onClick={() => add(p.id, defaultSize(p))}>
            + Add
          </button>
        </div>
        {p.bd === "Limited" && (
          <div className="product-card__stock">Only {3 + (p.id % 5)} left</div>
        )}
      </div>
    </article>
  );
}
