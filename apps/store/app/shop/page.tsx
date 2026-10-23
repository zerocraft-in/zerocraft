import type { Metadata } from "next";
import Shop from "@/components/sections/Shop";

export const metadata: Metadata = {
  title: "Shop all",
  description: "Tees, hoodies, posters, frames and digital art.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <section style={{ paddingTop: 50 }}>
      <div className="storefront-container">
        <div className="storefront-section-heading">
          <div>
            <div className="storefront-kicker storefront-mono">
              The full drop
            </div>
            <h1
              className="storefront-display"
              style={{ fontSize: "clamp(44px,7vw,100px)" }}
            >
              Shop{" "}
              <em style={{ fontStyle: "normal", color: "var(--red)" }}>all.</em>
            </h1>
          </div>
        </div>
        <Shop
          key={JSON.stringify(sp)}
          init={{ cat: sp.cat, lang: sp.lang, q: sp.q, focus: !!sp.focus }}
          step={12}
        />
      </div>
    </section>
  );
}
