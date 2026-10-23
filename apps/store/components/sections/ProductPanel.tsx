"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/data/products";
import { LG, R, defaultSize } from "@/lib/format";
import { useStore } from "@/lib/store";

const GUIDE = [
  ["S", 38, 27],
  ["M", 40, 28],
  ["L", 42, 29],
  ["XL", 44, 30],
  ["XXL", 46, 31],
];

export default function ProductPanel({
  p,
  onDone,
  showLink,
  h1,
}: {
  p: Product;
  onDone?: () => void;
  showLink?: boolean;
  h1?: boolean;
}) {
  const { add, openCart } = useStore();
  const router = useRouter();
  const [size, setSize] = useState(defaultSize(p));
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const apparel = p.c === "Tees" || p.c === "Hoodies";
  const H = (h1 ? "h1" : "h3") as "h1";
  return (
    <>
      <div className="storefront-kicker storefront-mono">
        {p.sub}
        {p.l ? " · " + LG[p.l] : ""}
      </div>
      <H className="storefront-display product-title">{p.n}</H>
      <div className="storefront-mono">
        ★ {p.r} · {Math.round(p.r * 23)} reviews
      </div>
      <div className="product-price" style={{ margin: "14px 0" }}>
        <b style={{ fontSize: 44 }}>{R(p.pr)}</b>
        <s>{R(p.o)}</s>
        <span className="storefront-mono" style={{ color: "var(--red)" }}>
          Save {R(p.o - p.pr)}
        </span>
      </div>
      <p className="product-description">
        {p.ty === "digi"
          ? "High-res digital download, delivered instantly after payment. For personal use."
          : "Original Padam Club design, studio printed on premium stock. Not an official film product."}
      </p>
      {p.z && (
        <>
          <div className="product-option-label storefront-mono">
            {apparel ? "Size" : "Format"}
          </div>
          <div className="product-options">
            {p.z.map((z) => (
              <button
                key={z}
                className={z === size ? "is-active" : ""}
                onClick={() => setSize(z)}
              >
                {z}
              </button>
            ))}
          </div>
        </>
      )}
      {apparel && (
        <details className="product-size-guide">
          <summary>Size guide</summary>
          <table>
            <thead>
              <tr>
                <th>Size</th>
                <th>Chest (in)</th>
                <th>Length (in)</th>
              </tr>
            </thead>
            <tbody>
              {GUIDE.map(([s, c, l]) => (
                <tr key={s}>
                  <td>{s}</td>
                  <td>{c}</td>
                  <td>{l}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      <div className="product-actions">
        <button
          className="storefront-button storefront-button--primary"
          onClick={() => {
            add(p.id, size);
            onDone?.();
            openCart();
          }}
        >
          Add to cart
        </button>
        <button
          className="storefront-button storefront-button--secondary"
          onClick={() => {
            add(p.id, size, false, true);
            onDone?.();
            router.push("/checkout");
          }}
        >
          Buy now
        </button>
      </div>
      {p.ty !== "digi" && (
        <>
          <div className="product-note">
            <input
              value={pin}
              inputMode="numeric"
              maxLength={6}
              placeholder="Delivery PIN code"
              aria-label="Delivery PIN code"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
            <button
              onClick={() =>
                setMsg(
                  /^\d{6}$/.test(pin)
                    ? `✓ Delivery in 3–5 days to ${pin}`
                    : "Please enter a valid 6-digit PIN",
                )
              }
            >
              Check
            </button>
          </div>
          <div id="product-panel-message">{msg}</div>
        </>
      )}
      <ul className="product-perks">
        <li>Free shipping above ₹999</li>
        <li>
          {p.ty === "digi"
            ? "Instant download after payment"
            : "Dispatch in 2–4 working days"}
        </li>
        <li>7-day easy returns</li>
      </ul>
      {showLink && (
        <p style={{ marginTop: 16 }}>
          <Link
            href={`/product/${p.slug}`}
            onClick={onDone}
            className="storefront-link storefront-mono"
          >
            View full details →
          </Link>
        </p>
      )}
    </>
  );
}
