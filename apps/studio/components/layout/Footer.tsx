"use client";

import Link from "next/link";
import type Lenis from "lenis";
import { studio, studioSocials } from "@/lib/studio-config";
import Container from "@/components/ui/Container";
import ArrowIcon from "@/components/ui/ArrowIcon";

const navigation = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Work", href: "/works" },
  { label: "Contact", href: "/contact" },
];

const legalNavigation = [
  { label: "Privacy policy", href: "/policies/privacy" },
  { label: "Terms of service", href: "/policies/terms" },
];

export default function Footer() {
  const backToTop = () => {
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (lenis) lenis.scrollTo(0, { immediate: reducedMotion });
    else
      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? "instant" : "smooth",
      });
  };

  return (
    <footer className="footer" id="footer">
      <Container>
        <div className="footer__intro">
          <span className="studio-eyebrow studio-eyebrow--section">
            The next chapter starts here
          </span>
          <Link href="/contact" className="footer__invitation">
            Let’s make something <span>matter.</span>
            <ArrowIcon direction="up-right" size={34} />
          </Link>
        </div>
        <div className="footer__top">
          <div className="footer__brand">
            <Link
              href="/"
              className="footer__logo"
              aria-label="Zerocraft Studio home"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width={40}
                height={40}
                className="footer__logo-icon"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z"
                />
              </svg>
              <span>
                ZEROCRAFT
                <br />
                STUDIO
              </span>
            </Link>
            <p className="footer__brand-text">
              Design. Code. Story.
              <br />
              Crafted with purpose.
            </p>
            <p className="footer__location">Tenkasi, Tamil Nadu, India</p>
          </div>
          <nav className="footer__links" aria-label="Footer navigation">
            <div className="footer__links-col">
              <span className="footer__links-title">Explore</span>
              <ul className="footer__links-list">
                {navigation.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            {studioSocials.length > 0 && (
              <div className="footer__links-col">
                <span className="footer__links-title">Connect</span>
                <ul className="footer__links-list">
                  {studioSocials.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.label}{" "}
                        <ArrowIcon direction="up-right" size={12} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="footer__links-col">
              <span className="footer__links-title">Say hello</span>
              <ul className="footer__links-list">
                <li>
                  <a href={`mailto:${studio.email}`}>{studio.email}</a>
                </li>
                <li>
                  <Link href="/contact">
                    Start a project <ArrowIcon direction="up-right" size={12} />
                  </Link>
                </li>
              </ul>
            </div>
            <div className="footer__links-col">
              <span className="footer__links-title">Legal</span>
              <ul className="footer__links-list">
                {legalNavigation.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
        <div className="footer__wordmark" aria-label="Zerocraft Studio">
          ZEROCRAFT<span aria-hidden="true">®</span>
        </div>
        <div className="footer__bottom">
          <span className="footer__copyright">
            © {new Date().getFullYear()} Zerocraft Studio. All rights reserved.
          </span>
          <span>CREATIVE &amp; DIGITAL STUDIO · TENKASI, INDIA</span>
          <button
            type="button"
            onClick={backToTop}
            className="footer__back-to-top"
            aria-label="Back to top"
            title="Back to top"
          >
            <ArrowIcon direction="up-right" size={16} />
          </button>
        </div>
      </Container>
    </footer>
  );
}
