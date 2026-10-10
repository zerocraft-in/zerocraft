"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import StudioGlyph from "@/components/ui/StudioGlyph";

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuLinks = [
  { label: "Home", href: "/", number: "01" },
  { label: "Work", href: "/works", number: "02" },
  { label: "Services", href: "/services", number: "03" },
  { label: "About", href: "/about", number: "04" },
  { label: "Contact", href: "/contact", number: "05" },
];

const overlayVariants = {
  hidden: {
    opacity: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
      when: "afterChildren" as const,
    },
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
      when: "beforeChildren" as const,
    },
  },
};

const navVariants = {
  hidden: {
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
};

const linkVariants = {
  hidden: {
    y: 60,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

const footerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: 0.5,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export default function Menu({ isOpen, onClose }: MenuProps) {
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const background = [...document.querySelectorAll<HTMLElement>(".site-main, .footer, .navbar")];
    const previousInert = background.map((element) => element.inert);
    background.forEach((element) => { element.inert = true; });
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>("button")?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const items = panel.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      background.forEach((element, index) => { element.inert = previousInert[index]; });
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  const handleLinkClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          ref={panel}
          id="studio-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Studio navigation"
          data-lenis-prevent
          className="menu-overlay"
          variants={reducedMotion ? undefined : overlayVariants}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : 0.15 } }}
          key="menu-overlay"
        >
          <div className="menu-overlay__topbar">
            <Link href="/" className="menu-overlay__brand" onClick={handleLinkClick} aria-label="Zerocraft Studio home">
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="currentColor" d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z" /></svg>
              <span>ZEROCRAFT<br />STUDIO</span>
            </Link>
            <button type="button" className="menu-overlay__close" onClick={onClose} aria-label="Close menu"><span className="menu-overlay__close-label">CLOSE</span><span className="menu-overlay__close-icon" aria-hidden="true"><StudioGlyph variant="close" size={15} /></span></button>
          </div>
          <motion.nav
            className="menu-overlay__nav"
            variants={reducedMotion ? undefined : navVariants}
            initial="hidden"
            animate="visible"
            role="navigation"
            aria-label="Full screen navigation"
          >
            {menuLinks.map((link) => (
              <motion.div key={link.href} variants={reducedMotion ? undefined : linkVariants}>
                <Link
                  href={link.href}
                  className={`menu-overlay__link ${
                    pathname === link.href ? "opacity-50" : ""
                  }`}
                  onClick={handleLinkClick}
                  aria-current={pathname === link.href ? "page" : undefined}
                >
                  <span>{link.label}</span>
                  <span className="menu-overlay__link-number">
                    {link.number}
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.nav>

          <motion.div
            className="menu-overlay__footer"
            variants={reducedMotion ? undefined : footerVariants}
            initial="hidden"
            animate="visible"
          >
            <span className="menu-overlay__footer-text">
              © {new Date().getFullYear()} Zerocraft Studio
            </span>
            <span className="menu-overlay__footer-text">
              Creative &amp; Digital Studio · Tenkasi, India
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
