"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import Heading from "@/components/ui/Heading";
import Reveal from "@/components/ui/Reveal";

export default function Hero() {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isBottomInView = useInView(bottomRef, { once: true, amount: 0.5 });

  return (
    <section className="hero" aria-label="Hero section">
      {/* Main content */}
      <div className="hero__content">
        {/* Line 1: Bold */}
        <Heading
          text="Unlock"
          as="h1"
          className="hero__heading hero__heading--bold"
          split="chars"
          delay={0.3}
          stagger={0.03}
          duration={0.8}
        />

        {/* Line 2: Light / Muted */}
        <Heading
          text="your brand's personality"
          as="h1"
          className="hero__heading hero__heading--light"
          split="words"
          delay={0.6}
          stagger={0.06}
          duration={0.8}
        />
      </div>

      {/* Bottom bar */}
      <div className="hero__bottom" ref={bottomRef}>
        {/* Left: Social */}
        <motion.div
          className="hero__bottom-item"
          initial={{ opacity: 0, y: 10 }}
          animate={isBottomInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
        >
          @ZEROCRAFTSTUDIO
        </motion.div>

        {/* Center: Tagline */}
        <motion.div
          className="hero__bottom-center"
          initial={{ opacity: 0, y: 10 }}
          animate={isBottomInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.15, ease: [0.16, 1, 0.3, 1] }}
        >
          Creative Development Agency
        </motion.div>

        {/* Right: Scroll indicator */}
        <motion.div
          className="hero__bottom-item hero__scroll"
          initial={{ opacity: 0, y: 10 }}
          animate={isBottomInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <span>SCROLL TO EXPLORE</span>


          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18" width={16}
            height={16}
            className="hero__scroll-arrow"><path fill="currentColor" d="M18,10.8h-3.6v-3.6h3.6v3.6ZM7.2,14.4v3.6h3.6v-3.6h3.6v-3.6h-3.6V0h-3.6v10.8h-3.6v3.6s3.6,0,3.6,0ZM3.6,10.8v-3.6H0v3.6h3.6Z"></path></svg>
        </motion.div>
      </div>
    </section>
  );
}
