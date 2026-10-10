"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
          <button type="button" className="menu-overlay__close" onClick={onClose} aria-label="Close menu">CLOSE <span aria-hidden="true">×</span></button>
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
              Independent Creative &amp; Digital Studio
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
