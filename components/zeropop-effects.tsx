"use client";

import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

export default function ZeroPopEffects() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const cleanups: Array<() => void> = [];
    const context = gsap.context(() => {
      document.querySelectorAll<HTMLAnchorElement>('.zeropop-native-storefront a[href^="#"]').forEach((link) => {
        const onClick = (event: MouseEvent) => {
          const target = document.querySelector(link.getAttribute("href") || "");
          if (!target) return;
          event.preventDefault();
          gsap.to(window, { duration: 0.8, ease: "power2.out", scrollTo: { y: target, offsetY: 82 } });
        };
        link.addEventListener("click", onClick);
        cleanups.push(() => link.removeEventListener("click", onClick));
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      context.revert();
    };
  }, [reducedMotion]);

  return null;
}
