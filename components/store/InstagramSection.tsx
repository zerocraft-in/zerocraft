"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { IconBrandInstagram, IconHeart, IconMessageCircle } from "@tabler/icons-react";
import { INSTAGRAM_IMAGES } from "@/lib/data/storeData";

export default function InstagramSection() {
  return (
    <section className="py-20 border-b border-neutral-200/60 dark:border-neutral-800/60">
      <div className="container-site mb-12 text-center">
        <span className="text-label text-amber-600 dark:text-amber-400 mb-2 block">
          #ZeroCraftHome
        </span>
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-3">
          Follow Our Journey on Instagram
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm md:text-base">
          Tag <span className="font-mono text-neutral-900 dark:text-white font-medium">@zerocraft.store</span> in your story to be featured in our studio gallery.
        </p>
      </div>

      {/* 8 Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 px-2">
        {INSTAGRAM_IMAGES.map((item, idx) => (
          <motion.a
            key={item.id}
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800 block"
          >
            <Image
              src={item.image}
              alt="ZeroCraft Lifestyle Instagram Post"
              fill
              sizes="(max-width: 768px) 50vw, 12vw"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {/* Hover Dark Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white gap-2">
              <IconBrandInstagram size={24} />
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1">
                  <IconHeart size={14} className="fill-current text-rose-500" />
                  {item.likes}
                </span>
                <span className="flex items-center gap-1">
                  <IconMessageCircle size={14} />
                  {item.comments}
                </span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
