"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { IconArrowRight, IconSparkles, IconShieldCheck, IconTruck, IconRefresh, IconStarFilled } from "@tabler/icons-react";
import { PRODUCTS, Product } from "@/lib/data/storeData";
import ProductCard from "@/components/store/ProductCard";
import CategoryGrid from "@/components/store/CategoryGrid";
import CollectionsMarquee from "@/components/store/CollectionsMarquee";
import TestimonialsSection from "@/components/store/TestimonialsSection";
import InstagramSection from "@/components/store/InstagramSection";
import NewsletterSection from "@/components/store/NewsletterSection";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"all" | "bestsellers" | "new" | "sale">("all");

  const getFilteredProducts = (): Product[] => {
    switch (activeTab) {
      case "bestsellers":
        return PRODUCTS.filter((p) => p.rating >= 4.9).slice(0, 8);
      case "new":
        return PRODUCTS.filter((p) => p.isNew).slice(0, 8);
      case "sale":
        return PRODUCTS.filter((p) => p.isSale).slice(0, 8);
      default:
        return PRODUCTS.slice(0, 8);
    }
  };

  const featuredProducts = getFilteredProducts();

  return (
    <div className="flex flex-col min-h-screen">
      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-16 md:py-24">
        {/* Animated Gradient Glow Backdrops */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-amber-500/15 via-rose-500/15 to-violet-500/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-amber-400/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="container-site relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 flex flex-col items-start"
          >
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-mono font-medium mb-6">
              <IconSparkles size={15} />
              <span>Crafted with Passion. Delivered with Care.</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.05] mb-6">
              Create Your Space with <span className="bg-gradient-to-r from-amber-600 via-rose-600 to-violet-600 bg-clip-text text-transparent">Beautiful Custom Products</span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl font-light leading-relaxed mb-8">
              Discover handcrafted posters, premium photo frames, personalized gifts, notebooks and accessories designed for every occasion.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <Link
                href="/shop"
                className="px-8 py-4 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                Shop Now <IconArrowRight size={16} />
              </Link>
              <Link
                href="/shop#collections"
                className="px-8 py-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              >
                Explore Collections
              </Link>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-neutral-200/80 dark:border-neutral-800/80 w-full max-w-md text-neutral-800 dark:text-neutral-200">
              <div>
                <span className="text-2xl font-bold font-mono">10K+</span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono uppercase">Happy Homes</p>
              </div>
              <div>
                <span className="text-2xl font-bold font-mono">100%</span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono uppercase">Handcrafted</p>
              </div>
              <div>
                <span className="text-2xl font-bold font-mono">4.9 ★</span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono uppercase">Avg Rating</p>
              </div>
            </div>
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
                  <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 font-semibold">
                    Featured Bestseller
                  </span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Minimal Mountain Poster
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-amber-500">
                    <IconStarFilled size={12} />
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">4.9</span>
                    <span className="text-neutral-400 font-mono">(128)</span>
                  </div>
                </div>
                <Link
                  href="/product/prod-1"
                  className="px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold uppercase tracking-wider"
                >
                  View
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* VALUE PROPOSITION BADGES */}
      <section className="py-8 bg-neutral-100/70 dark:bg-neutral-900/50 border-y border-neutral-200/60 dark:border-neutral-800/60">
        <div className="container-site grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IconTruck size={24} />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold uppercase text-neutral-900 dark:text-white">Free Express Delivery</h4>
              <p className="text-xs text-neutral-500 font-light">On orders over $100 worldwide</p>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IconShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold uppercase text-neutral-900 dark:text-white">Archival Guarantee</h4>
              <p className="text-xs text-neutral-500 font-light">Museum-grade cotton paper</p>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IconSparkles size={24} />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold uppercase text-neutral-900 dark:text-white">Bespoke Engraving</h4>
              <p className="text-xs text-neutral-500 font-light">Custom initial monogram option</p>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IconRefresh size={24} />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold uppercase text-neutral-900 dark:text-white">30-Day Free Returns</h4>
              <p className="text-xs text-neutral-500 font-light">No questions asked policy</p>
            </div>
          </div>
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
              <span className="text-label text-amber-600 dark:text-amber-400 mb-2 block">
                Trending Highlights
              </span>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                Featured Products
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-neutral-200/60 dark:bg-neutral-800/60 font-mono text-xs overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === "all"
                    ? "bg-white text-black dark:bg-neutral-900 dark:text-white font-semibold shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                All Products
              </button>
              <button
                onClick={() => setActiveTab("bestsellers")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === "bestsellers"
                    ? "bg-white text-black dark:bg-neutral-900 dark:text-white font-semibold shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                Bestsellers
              </button>
              <button
                onClick={() => setActiveTab("new")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === "new"
                    ? "bg-white text-black dark:bg-neutral-900 dark:text-white font-semibold shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                New Arrivals
              </button>
              <button
                onClick={() => setActiveTab("sale")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === "sale"
                    ? "bg-white text-black dark:bg-neutral-900 dark:text-white font-semibold shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                On Sale
              </button>
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
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 text-xs font-mono font-semibold uppercase tracking-wider hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
            >
              Explore All 24 Products <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* COLLECTIONS SHOWCASE */}
      <CollectionsMarquee />

      {/* TESTIMONIALS */}
      <TestimonialsSection />

      {/* INSTAGRAM LIFESTYLE GALLERY */}
      <InstagramSection />

      {/* NEWSLETTER CTA */}
      <NewsletterSection />
    </div>
  );
}
