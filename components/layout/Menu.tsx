"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

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

  const handleLinkClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="menu-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          key="menu-overlay"
        >
          <motion.nav
            className="menu-overlay__nav"
            variants={navVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            role="navigation"
            aria-label="Full screen navigation"
          >
            {menuLinks.map((link) => (
              <motion.div key={link.href} variants={linkVariants}>
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
            variants={footerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <span className="menu-overlay__footer-text">
              © {new Date().getFullYear()} Zerocraft Studio
            </span>
            <span className="menu-overlay__footer-text">
              Creative Development Agency
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
