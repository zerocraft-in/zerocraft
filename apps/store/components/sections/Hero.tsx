"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { slides } from "@/data/store";
import { PL, posterInner } from "@/lib/art";
import { LG, R } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function Hero() {
  const { openQuick, catalog: products } = useStore();
  const [si, setSi] = useState(0);
  const hover = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const fallbackDescriptions = [
    "Original designs for your everyday first-day-first-show feeling.",
    "Find a favorite for your wall, your wardrobe, or your next gift.",
    "A little cinema-inspired character for the everyday.",
    "Made for fans, collectors, and the stories that stay with us.",
    "Discover the latest from the Zerocraft catalog.",
  ];
  const featuredSlides = slides.filter(([id]) => Boolean(products[id]));
  const heroSlides = featuredSlides.length > 1
    ? featuredSlides
    : products.slice(0, 5).map((product, index) => [
        product.id,
        fallbackDescriptions[index % fallbackDescriptions.length],
      ] as [number, string]);
  const N = heroSlides.length;
  useEffect(() => {
    if (N < 2) return;
    const t = setInterval(() => {
      if (!hover.current) setSi((i) => (i + 1) % N);
    }, 5500);
    return () => clearInterval(t);
  }, [N]);

  if (!N) return null;

  return (
    <div
      className="storefront-hero"
      ref={ref}
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
      onMouseMove={(e) => {
        const x = (e.clientX / innerWidth - 0.5) * 16,
          y = (e.clientY / innerHeight - 0.5) * 10;
        ref.current
          ?.querySelectorAll<HTMLElement>(".hero-posters")
          .forEach((p) => (p.style.transform = `translate(${x}px,${y}px)`));
      }}
    >
      <div className="hero-overlay is-tinted" />
      {heroSlides.map(([id], i) => (
        <div
          key={id}
          className={"storefront-hero__background" + (i === si ? " is-active" : "")}
          style={{
            background: `radial-gradient(circle at 72% 48%,${PL[products[id].pal][1]}66,transparent 55%),radial-gradient(circle at 5% 100%,#B3121B55,transparent 45%)`,
          }}
        />
      ))}
      {heroSlides.map(([id, d], i) => {
        const p = products[id],
          o = products[heroSlides[(i + 1) % N][0]];
        return (
          <div
            key={id}
            className={"storefront-hero__slide" + (i === si ? " is-active" : "")}
            aria-hidden={i !== si}
          >
            <div>
              <span className="hero-kicker storefront-mono">
                Now showing · {p.l ? LG[p.l] : "Tamil + Malayalam"}
              </span>
              <h1 className="storefront-display">
                {p.t.replace(/\|/g, " ")}
                <small className="hero-subtitle">{p.s || "தமிழ் · മലയാളം"}</small>
              </h1>
              <p>{d}</p>
              <div className="hero-actions">
                <button className="storefront-button" onClick={() => openQuick(id)}>
                  View poster · {R(p.pr)}
                </button>
                <Link href="/shop?cat=Tees" className="storefront-button storefront-button--outline">
                  Shop tees
                </Link>
              </div>
            </div>
            <div className="hero-posters">
              <svg
                className="hero-poster hero-poster--back"
                viewBox="0 0 300 400"
                dangerouslySetInnerHTML={{ __html: posterInner(o, `h${i}b`) }}
              />
              <svg
                className="hero-poster hero-poster--front"
                viewBox="0 0 300 400"
                dangerouslySetInnerHTML={{ __html: posterInner(p, `h${i}a`) }}
              />
              <span className="hero-language">{p.l ? LG[p.l] : "Tamil + Malayalam"}</span>
            </div>
          </div>
        );
      })}
      <div className="hero-disclaimer">
        Fictional film-inspired art · original Padam Club designs · not
        affiliated with any film or studio
      </div>
      <div className="hero-scroll-indicator" />
    </div>
  );
}
