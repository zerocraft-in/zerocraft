"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

interface SmoothScrollProps {
  children: ReactNode;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      infinite: false,
      anchors: { offset: -88 },
    });

    lenisRef.current = lenis;
    if (typeof window !== "undefined") {
      (window as unknown as { lenis?: Lenis }).lenis = lenis;
    }

    // Synchronize Lenis scroll position with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    // GSAP ScrollTrigger config to prevent mobile viewport jump recalculations
    ScrollTrigger.config({ ignoreMobileResize: true });

    let cancelled = false;
    const refreshLayout = () => {
      if (cancelled) return;
      lenis.resize();
      ScrollTrigger.refresh();
    };
    // Lenis observes dimensions itself. Refreshing ScrollTrigger from a body
    // ResizeObserver can create a feedback loop as pinned layouts resize.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      refreshLayout();
      const hash = window.location.hash.slice(1);
      let target: HTMLElement | null = null;
      try { target = hash ? document.getElementById(decodeURIComponent(hash)) : null; } catch { /* Ignore malformed URL fragments. */ }
      if (target) lenis.scrollTo(target, { offset: -88, immediate: true });
    });
    window.addEventListener("load", refreshLayout, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", refreshLayout);
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      lenisRef.current = null;
      if (typeof window !== "undefined") {
        (window as unknown as { lenis?: Lenis }).lenis = undefined;
      }
    };
  }, [pathname, reducedMotion]);

  return <>{children}</>;
}
