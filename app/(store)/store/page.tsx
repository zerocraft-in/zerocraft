"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { IconArrowRight, IconSparkles } from "@tabler/icons-react";
import { PRODUCTS } from "@/lib/data/storeData";
import ProductCard from "@/components/store/ProductCard";
import CategoryGrid from "@/components/store/CategoryGrid";
import CollectionsMarquee from "@/components/store/CollectionsMarquee";

export default function HomePage() {
  const featuredProducts = PRODUCTS.slice(0, 8);

  return (
    <div className="flex flex-col min-h-screen">
      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

        <div className="container-site relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 flex flex-col items-start"
          >
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-500/10 dark:bg-lime-400/10 border border-lime-500/20 text-lime-700 dark:text-lime-300 text-xs font-mono font-medium mb-6">
              <IconSparkles size={15} />
              <span>ZEROCRAFT / STORE CONCEPT</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.05] mb-6">
              Create Your Space with <span className="text-lime-600 dark:text-lime-400">Beautiful Custom Products</span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl font-light leading-relaxed mb-8">
              Explore a preview of posters, frames, personalized gifts, notebooks, and accessories. Product details and availability require studio confirmation.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <Link
                href="/store/shop"
                className="px-8 py-4 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                Shop Now <IconArrowRight size={16} />
              </Link>
              <Link
                href="/store/shop#collections"
                className="px-8 py-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              >
                Explore Collections
              </Link>
            </div>

            <p className="border-l-2 border-lime-400 pl-4 text-sm text-neutral-500 dark:text-neutral-400">Catalog preview · Orders are requests until the studio confirms them · No online payment</p>
          </motion.div>

          {/* Right Floating Product Visuals */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-4/5 w-full rounded-3xl overflow-hidden shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 group">
              <Image
                src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop"
                alt="ZeroCraft Minimal Poster Hero"
                fill
                priority
                sizes="(max-width: 1200px) 100vw, 40vw"
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Floating Product Badge Overlay Card */}
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-lime-600 dark:text-lime-400 font-semibold">
                    Catalog Preview
                  </span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Minimal Mountain Poster
                  </h4>
                </div>
                <Link
                  href="/store/product/prod-1"
                  className="px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold uppercase tracking-wider"
                >
                  View
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* FEATURED CATEGORIES */}
      <CategoryGrid />

      {/* FEATURED PRODUCTS SECTION */}
      <section className="py-20 md:py-28 border-b border-neutral-200/60 dark:border-neutral-800/60">
        <div className="container-site">
          {/* Header & Filter Tabs */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <span className="text-label text-lime-600 dark:text-lime-400 mb-2 block">
                Catalog Preview
              </span>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                Featured Products
              </h2>
            </div>

          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/store/shop"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-semibold uppercase tracking-wider hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
            >
              Explore All 24 Products <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* COLLECTIONS SHOWCASE */}
      <CollectionsMarquee />

    </div>
  );
}
