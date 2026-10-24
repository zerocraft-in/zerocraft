"use client";

import { useRef } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import { useStore } from "@/lib/store";

export default function TrendingProducts() {
  const { catalog } = useStore();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ pointerId: -1, startX: 0, scrollLeft: 0, moved: false });
  const products = catalog.slice(0, 8);

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  if (!products.length) return null;

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: track.scrollLeft,
      moved: false,
    };
    track.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!track || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) < 5) return;
    drag.moved = true;
    track.classList.add("is-dragging");
    track.scrollLeft = drag.scrollLeft - distance;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current.pointerId = -1;
    track.classList.remove("is-dragging");
  };

  const preventDraggedClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  };

  return (
    <section id="storefront-shop" className="trending-products">
      <div className="storefront-container">
        <div className="trending-products__heading">
          <div>
            <div className="storefront-kicker storefront-mono">
              03 / Now trending
            </div>
            <h2 className="storefront-display">
              First day. <em>First show.</em>
            </h2>
            <p>Fresh picks for your next favorite.</p>
          </div>
          <div className="trending-products__actions">
            <Link href="/shop" className="storefront-link storefront-mono">
              Shop all →
            </Link>
            <div className="trending-products__controls">
              <button
                type="button"
                aria-label="Show previous trending products"
                onClick={() => scroll(-1)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Show more trending products"
                onClick={() => scroll(1)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div
          className="trending-products__track"
          ref={trackRef}
          role="region"
          aria-label="Trending products carousel"
          tabIndex={0}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={preventDraggedClick}
        >
          {products.map((product) => (
            <div className="trending-products__slide" key={product.id}>
              <ProductCard p={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
