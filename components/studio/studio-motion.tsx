"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function StudioMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced !== false) return;
    const wrapper = document.querySelector<HTMLElement>("[data-studio-scroll]");
    const content = wrapper?.querySelector<HTMLElement>("[data-studio-content]");
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      eventsTarget: wrapper,
      autoRaf: false,
      duration: 0.85,
      smoothWheel: true,
      anchors: { offset: -90 },
      prevent: (node) =>
        Boolean(
          node.closest(
      '[role="dialog"], [role="listbox"], [role="menu"], [data-slot="scroll-area"], .studio-assistant, textarea',
          ),
        ),
    });
    const updateScroll = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(updateScroll);
    ScrollTrigger.refresh();
    return () => {
        gsap.ticker.remove(updateScroll);
        lenis.destroy();
    };
  }, [reduced]);
  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col"
      key={pathname}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
