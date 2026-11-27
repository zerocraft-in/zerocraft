"use client";

import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";

/**
 * GSAP stagger-in for children marked with `data-reveal`.
 * - Runs before paint (no flash), cleans up on unmount.
 * - Skipped when the user prefers reduced motion.
 * - Animates only opacity/transform, so it can never cause layout overflow.
 * Use GSAP for this kind of sequenced entrance; use framer-motion for state changes.
 */
export function useReveal(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-reveal]", {
        opacity: 0,
        y: 10,
        duration: 0.5,
        ease: "power3.out",
        stagger: 0.07,
        clearProps: "opacity,transform",
      });
    }, root);

    return () => ctx.revert();
  }, [ref]);
}
