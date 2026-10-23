"use client";
import Link from "next/link";
import { posterInner } from "@/lib/art";
import { LG } from "@/lib/format";
import { useStore } from "@/lib/store";

const PANELS = [
  { k: "ta", cls: "is-tinted", tag: "Kollywood vibes", nt: "தமிழ்", ids: [8, 10] },
  { k: "ml", cls: "is-light", tag: "Mollywood vibes", nt: "മലയാളം", ids: [11, 12] },
];

export default function LanguagePanels() {
  const { catalog: products } = useStore();
  return (
    <section style={{ paddingTop: 0 }}>
      <div className="storefront-container">
        <div className="storefront-section-heading">
          <div>
            <div className="storefront-kicker storefront-mono">
              02 / Choose your industry
            </div>
            <h2 className="storefront-display reveal-on-scroll">
              Tamil. <em>Malayalam.</em>
            </h2>
          </div>
        </div>
        <div className="language-grid">
          {PANELS.map((x) => (
            <Link
              key={x.k}
              href={`/shop?lang=${x.k}`}
              className={`language-card ${x.cls} reveal-on-scroll`}
            >
              <div className="language-card__posters">
                {x.ids.map((id, i) => (
                  <svg
                    key={id}
                    viewBox="0 0 300 400"
                    dangerouslySetInnerHTML={{
                      __html: posterInner(products[id], `l${x.k}${i}`),
                    }}
                  />
                ))}
              </div>
              <div className="storefront-mono">{x.tag}</div>
              <h3 className="storefront-display">{LG[x.k]}</h3>
              <span className="storefront-script">{x.nt}</span>
              <em className="storefront-mono">
                Shop {products.filter((p) => p.l === x.k).length} designs →
              </em>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
