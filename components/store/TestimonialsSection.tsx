"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { IconStarFilled, IconCertificate } from "@tabler/icons-react";
import { REVIEWS } from "@/lib/data/storeData";

export default function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/30">
      <div className="container-site">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-label text-amber-600 dark:text-amber-400 mb-2 block">
            Verified Reviews
          </span>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-4">
            Loved by 10,000+ Creators & Homes
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm md:text-base">
            Read real feedback from verified collectors, architects, artists, and gift seekers.
          </p>
        </div>

        {/* Grid of 10 Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REVIEWS.map((rev, idx) => (
            <motion.div
              key={rev.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (idx % 3) * 0.1 }}
              className="flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs"
            >
              <div>
                {/* Rating & Verified */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(rev.rating)].map((_, i) => (
                      <IconStarFilled key={i} size={15} className="text-amber-400" />
                    ))}
                  </div>
                  {rev.verified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <IconCertificate size={14} /> Verified Buyer
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white text-base mb-2">
                  &ldquo;{rev.title}&rdquo;
                </h3>
                <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
                  {rev.content}
                </p>
              </div>

              {/* Author Row */}
              <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-neutral-200 dark:border-neutral-700">
                  <Image
                    src={rev.avatar}
                    alt={rev.author}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-white">
                    {rev.author}
                  </h4>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Purchased {rev.productName}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
