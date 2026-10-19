"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { CatalogCollection } from "@/lib/commerce/catalog";
import { IconArrowRight } from "@/components/store/StoreIcon";

export default function CollectionsMarquee({ collections }: { collections: CatalogCollection[] }) {
  return (
    <section className="py-20 bg-neutral-900 text-white overflow-hidden">
      <div className="container-site mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-label text-lime-400 mb-2 block">
              Curated Edit
            </span>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">
              Signature Collections
            </h2>
          </div>
          <p className="text-neutral-400 max-w-md text-sm md:text-base">
            Discover themed product sets designed to transform workspaces, living rooms, and gifting moments.
          </p>
        </div>
      </div>

      {/* Infinite Scroll / Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4 md:px-12">
        {collections.slice(0, 4).map((col, idx) => (
          <motion.div
            key={col.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="group relative h-96 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950"
          >
            <Image
              src={col.image}
              alt={col.name}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              className="object-cover object-center opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
              <span className="inline-self-start font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-lime-300 border border-white/10">
                {col.tagline}
              </span>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{col.name}</h3>
                <p className="text-xs text-neutral-300 line-clamp-2 mb-4 font-light">
                  {col.description}
                </p>
                <Link
                  href={`/store/shop?collection=${col.slug}`}
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-lime-400 font-semibold group-hover:translate-x-1 transition-transform"
                >
                  Explore Collection <IconArrowRight size={14} />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
