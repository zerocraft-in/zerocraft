"use client";

import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" id="footer">
      <Container>
        <div className="footer__top">
          <div className="footer__brand">
            <Reveal>
              <Link
                href="/"
                className="footer__logo"
                aria-label="Zerocraft Studio Home"
              >
                <svg
                  id="Layer_1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width={40}
                  height={40}
                  className="footer__logo-icon"
                >
                  <path
                    fill="currentColor"
                    d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z"
                  />
                </svg>
              </Link>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="footer__brand-text">
                Building digital experiences that
                <br />
                define the future of brands.
              </p>
            </Reveal>
          </div>

          <div className="footer__links">
            <Reveal delay={0.2} className="footer__links-col">
              <span className="footer__links-title">Menu</span>
              <ul className="footer__links-list">
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href="/about">About</Link>
                </li>
                <li>
                  <Link href="/services">Services</Link>
                </li>
                <li>
                  <Link href="/works">Works</Link>
                </li>
              </ul>
            </Reveal>

            <Reveal delay={0.3} className="footer__links-col">
              <span className="footer__links-title">Socials</span>
              <ul className="footer__links-list">
                <li>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    Twitter / X
                  </a>
                </li>
                <li>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    Behance
                  </a>
                </li>
              </ul>
            </Reveal>

            <Reveal delay={0.4} className="footer__links-col">
              <span className="footer__links-title">Contact</span>
              <ul className="footer__links-list">
                <li>
                  <a href="mailto:hello@zerocraft.in">hello@zerocraft.in</a>
                </li>
                <li>
                  <Link href="/contact">Start a Project</Link>
                </li>
              </ul>
            </Reveal>
          </div>
        </div>

        <div className="footer__bottom">
          <Reveal delay={0.5}>
            <span className="footer__copyright">
              © {currentYear} Zerocraft Studio. All rights reserved.
            </span>
          </Reveal>

          <Reveal delay={0.6}>
            <div className="footer__legal">
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
            </div>
          </Reveal>
        </div>
      </Container>
    </footer>
  );
}
