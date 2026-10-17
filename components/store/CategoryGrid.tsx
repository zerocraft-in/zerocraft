"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { IconArrowUpRight } from "@/components/store/StoreIcon";
import type { CatalogCategory } from "@/lib/commerce/catalog";

export default function CategoryGrid({ categories }: { categories: CatalogCategory[] }) {
  return (
    <section className="py-16 md:py-24 border-b border-neutral-200/60 dark:border-neutral-800/60">
      <div className="container-site">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-label text-lime-600 dark:text-lime-400 mb-2 block">
              Curated Categories
            </span>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              Crafted for Every Space
            </h2>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-md text-sm md:text-base">
            Browse product ideas by category. Details and availability are confirmed before an order is fulfilled.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
            >
              <Link
                href={`/store/category/${cat.slug}`}
                className="group relative block h-80 rounded-2xl overflow-hidden shadow-sm border border-neutral-200/60 dark:border-neutral-800/60"
              >
                {/* Background Image */}
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-110"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-300 group-hover:from-black/90 group-hover:via-black/40" />

                {/* Top Badge: Item Count */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-medium bg-white/20 backdrop-blur-md text-white border border-white/20">
                    {cat.itemCount} ideas
                  </span>
                </div>

                {/* Top Right Arrow */}
                <div className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 group-hover:bg-white group-hover:text-black transition-all duration-300">
                  <IconArrowUpRight size={20} />
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-0 inset-x-0 p-6 z-10 flex flex-col justify-end text-white">
                  <h3 className="text-xl font-bold mb-1 group-hover:translate-x-1 transition-transform duration-300">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-neutral-300 line-clamp-2 font-light opacity-90">
                    Explore {cat.name.toLowerCase()} ideas from the preview catalog.
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
