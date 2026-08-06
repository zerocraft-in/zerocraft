"use client";

import Link from "next/link";
import Image from "next/image";
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
              <Link href="/" className="footer__logo" aria-label="Zerocraft Studio Home">
                <Image
                  src="/icon.svg"
                  alt="Zerocraft Studio"
                  width={40}
                  height={40}
                  className="footer__logo-icon"
                />
              </Link>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="footer__brand-text">
                Building digital experiences that<br />
                define the future of brands.
              </p>
            </Reveal>
          </div>

          <div className="footer__links">
            <Reveal delay={0.2} className="footer__links-col">
              <span className="footer__links-title">Menu</span>
              <ul className="footer__links-list">
                <li><Link href="/">Home</Link></li>
                <li><Link href="/about">About</Link></li>
                <li><Link href="/services">Services</Link></li>
                <li><Link href="/works">Works</Link></li>
              </ul>
            </Reveal>

            <Reveal delay={0.3} className="footer__links-col">
              <span className="footer__links-title">Socials</span>
              <ul className="footer__links-list">
                <li><a href="#" target="_blank" rel="noopener noreferrer">Instagram</a></li>
                <li><a href="#" target="_blank" rel="noopener noreferrer">Twitter / X</a></li>
                <li><a href="#" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
                <li><a href="#" target="_blank" rel="noopener noreferrer">Behance</a></li>
              </ul>
            </Reveal>
            
            <Reveal delay={0.4} className="footer__links-col">
              <span className="footer__links-title">Contact</span>
              <ul className="footer__links-list">
                <li><a href="mailto:hello@zerocraft.in">hello@zerocraft.in</a></li>
                <li><Link href="/contact">Start a Project</Link></li>
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
