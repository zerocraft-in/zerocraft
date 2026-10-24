"use client";
import Art from "./Art";
import { BUNDLE_DISCOUNT, bundles } from "@/data/store";
import { R, defaultSize } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";

type ApiBundle = {
  slug: string;
  name: string;
  description: string;
  discountPercent: number;
  items: { productSlug: string; quantity: number }[];
};

export default function Bundles() {
  const { add, openCart, notify, catalog: products } = useStore();
  const [remoteBundles, setRemoteBundles] = useState<ApiBundle[] | null>(null);
  useEffect(() => {
    fetch("/api/store/bundles")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.bundles?.length) setRemoteBundles(payload.bundles);
      })
      .catch(() => undefined);
  }, []);
  const displayBundles = (remoteBundles ?? bundles)
    .map((bundle) => {
      const expectedItemCount = bundle.items.length;
      const items =
        "items" in bundle && typeof bundle.items[0] === "number"
          ? (bundle.items as number[])
              .map((id) => products[id])
              .filter((product): product is (typeof products)[number] => Boolean(product))
              .map((product) => ({ product, quantity: 1 }))
          : (bundle as ApiBundle).items
              .map((item) => ({
                product: products.find(
                  (product) => product.slug === item.productSlug,
                ),
                quantity: item.quantity,
              }))
              .filter(
                (
                  item,
                ): item is {
                  product: (typeof products)[number];
                  quantity: number;
                } => Boolean(item.product),
              );
      return { ...bundle, items, isComplete: items.length === expectedItemCount };
    })
    .filter((bundle) => bundle.isComplete && bundle.items.length > 0);
  return (
    <section id="storefront-bundles">
      <div className="storefront-container">
        <div className="storefront-section-heading">
          <div>
            <div className="storefront-kicker storefront-mono">04 / Combo offers</div>
            <h2 className="storefront-display reveal-on-scroll">
              Fan packs. <em>Save {BUNDLE_DISCOUNT * 100}%.</em>
            </h2>
          </div>
        </div>
        <div className="bundle-grid reveal-on-scroll">
          {displayBundles.map((b) => {
            const discount =
              "discountPercent" in b
                ? b.discountPercent / 100
                : BUNDLE_DISCOUNT;
            const total = b.items.reduce(
              (a, x) => a + x.product.pr * x.quantity,
              0,
            );
            return (
              <div className="bundle-card" key={b.name}>
                <div className="bundle-card__art">
                  {b.items.flatMap((x, i) => [
                    i ? <i key={`p${x.product.id}`}>+</i> : null,
                    <div key={x.product.id}>
                      <Art p={x.product} k="b" />
                    </div>,
                  ])}
                </div>
                <div className="bundle-card__info">
                  <div className="storefront-kicker storefront-mono">Save {discount * 100}%</div>
                  <h3 className="storefront-display">{b.name}</h3>
                  <p>{b.items.map((x) => x.product.n).join(" + ")}</p>
                  <div className="product-price">
                    <b>{R(Math.round(total * (1 - discount)))}</b>
                    <s>{R(total)}</s>
                  </div>
                  <button
                    className="storefront-button storefront-button--primary"
                    onClick={() => {
                      b.items.forEach((x) => {
                        for (let i = 0; i < x.quantity; i += 1)
                          add(x.product.id, defaultSize(x.product), true, true);
                      });
                      notify(`Bundle added · ${discount * 100}% off applied`);
                      openCart();
                    }}
                  >
                    Add bundle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
