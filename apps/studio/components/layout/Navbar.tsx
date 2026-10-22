"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import Magnetic from "@/components/ui/Magnetic";
import Menu from "@/components/layout/Menu";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // Lock body scroll and pause Lenis smooth scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      if (typeof window !== "undefined") {
        const lenis = (window as unknown as { lenis?: { stop: () => void } })
          .lenis;
        if (lenis && typeof lenis.stop === "function") {
          lenis.stop();
        }
      }
    } else {
      document.body.style.overflow = "";
      if (typeof window !== "undefined") {
        const lenis = (window as unknown as { lenis?: { start: () => void } })
          .lenis;
        if (lenis && typeof lenis.start === "function") {
          lenis.start();
        }
      }
    }
    return () => {
      document.body.style.overflow = "";
      if (typeof window !== "undefined") {
        const lenis = (window as unknown as { lenis?: { start: () => void } })
          .lenis;
        if (lenis && typeof lenis.start === "function") {
          lenis.start();
        }
      }
    };
  }, [menuOpen]);

  return (
    <>
      <nav className={`navbar${scrolled ? " navbar--scrolled" : ""}`} role="navigation" aria-label="Main navigation">
        <div className="navbar__inner">
          {/* Logo */}
          <Link
            href="/"
            className="navbar__logo"
            aria-label="Zerocraft Studio Home"
          >
            <Magnetic strength={0.2}>
              <svg
                id="Layer_1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width={32}
                height={32}
                className="navbar__logo-icon"
              >
                <path
                  fill="currentColor"
                  d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z"
                />
              </svg>
            </Magnetic>
            <span className="navbar__logo-text">
              Zerocraft
              <br />
              Studio
            </span>
          </Link>

          {/* Right actions */}
          <div className="navbar__actions">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Menu Button */}
            <Magnetic strength={0.2}>
              <button
                className={`navbar__hamburger ${menuOpen ? "navbar__hamburger--open" : ""}`}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
              >
                <span className="navbar__hamburger-line" />
                <span className="navbar__hamburger-line" />
              </button>
            </Magnetic>
          </div>
        </div>
      </nav>

      {/* Fullscreen Menu */}
      <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
