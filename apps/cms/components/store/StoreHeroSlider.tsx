"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { IconArrowLeft, IconArrowRight } from "@/components/store/StoreIcon";
import type { CatalogProduct } from "@/lib/commerce/catalog";

const fallbackImage = "/hero-designer.png";

export default function StoreHeroSlider({
  products,
}: {
  products: CatalogProduct[];
}) {
  const slides = products.slice(0, 3);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const product = slides[active] ?? slides[0];
  const image = product?.images?.[0] || fallbackImage;

  return (
    <section className="store-hero-slider relative isolate -mt-20 min-h-[620px] overflow-hidden bg-[#211b16] text-white sm:min-h-[680px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={product?.id ?? "fallback"}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <Image
            src={image}
            alt={product?.title || "Zerocraft original artwork"}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-55"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 -z-0 bg-[linear-gradient(90deg,rgba(21,19,17,.94)_0%,rgba(21,19,17,.72)_38%,rgba(21,19,17,.14)_100%)]" />
      <div
        className="store-hero-slider__grain absolute inset-0 -z-0 opacity-35"
        aria-hidden="true"
      />
      <div
        className="store-hero-slider__grid absolute inset-0 -z-0 opacity-60"
        aria-hidden="true"
      />
      <div
        className="store-hero-slider__sticker absolute right-6 top-28 z-10 hidden rotate-6 sm:block"
        aria-hidden="true"
      >
        <span>NEW</span>
        <strong>
          DROP
          <br />
          001
        </strong>
        <small>made in tn</small>
      </div>
      <div
        className="store-hero-slider__crosshair absolute right-[18%] top-1/2 z-10 hidden h-16 w-16 -translate-y-1/2 md:block"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex min-h-[620px] max-w-7xl items-end px-5 pb-28 pt-32 sm:min-h-[680px] sm:px-8 sm:pb-32 lg:px-14">
        <div className="max-w-2xl">
          <motion.p
            key={`label-${active}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-black uppercase tracking-[.28em] text-[#f5b544]"
          >
            Art for real people / Zerocraft Store
          </motion.p>
          <motion.h1
            key={`title-${active}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mt-5 max-w-xl text-6xl font-black leading-[.84] tracking-[-.075em] sm:text-8xl"
          >
            Find your <span className="text-[#e34d2e]">scene.</span>
          </motion.h1>
          <p className="mt-6 max-w-md text-sm leading-6 text-white/75 sm:text-base">
            Original prints, frames and everyday objects for people who live
            close to stories.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/store/shop"
              className="rounded-[5px] bg-white px-6 py-3 text-xs font-black uppercase tracking-wider text-[#151311] transition hover:bg-[#f5b544]"
            >
              Shop now <span className="ml-2">→</span>
            </Link>
            <Link
              href="/store/shop?category=photo-frames"
              className="rounded-[5px] border border-white/45 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:border-white hover:bg-white/10"
            >
              Explore frames <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/15 bg-[#151311]/55 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8 lg:px-14">
          <div className="grid flex-1 grid-cols-2 gap-3 text-[9px] font-bold uppercase tracking-[.12em] text-white/65 sm:grid-cols-4">
            <span>Original designs</span>
            <span className="hidden sm:inline">Studio reviewed</span>
            <span>Made to order</span>
            <span className="hidden sm:inline">Tenkasi, India</span>
          </div>
          {slides.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setActive((active - 1 + slides.length) % slides.length)
                }
                aria-label="Previous banner"
                className="grid h-8 w-8 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white hover:text-[#151311]"
              >
                <IconArrowLeft size={14} />
              </button>
              <div className="flex gap-1.5">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => setActive(index)}
                    aria-label={`Show banner ${index + 1}`}
                    className={`h-1.5 rounded-full transition-all ${active === index ? "w-7 bg-[#e34d2e]" : "w-1.5 bg-white/45"}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setActive((active + 1) % slides.length)}
                aria-label="Next banner"
                className="grid h-8 w-8 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white hover:text-[#151311]"
              >
                <IconArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
