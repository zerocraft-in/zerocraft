"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, ArrowUp, Sparkles, Mail, Copy, Check } from "lucide-react";
import React, { useState } from "react";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("hello@zerocraft.in");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="footer-minimal">
      {/* Top Ambient Glow Line */}
      <div className="footer-top-border-glow" />

      <div className="footer-container">
        {/* Call-to-action Banner */}
        <div className="footer-hero-banner">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="footer-hero-content"
          >
            <span className="footer-kicker">
              <Sparkles size={14} /> HAVE A PROJECT IN MIND?
            </span>
            <h2 className="footer-hero-heading">
              Let’s craft something <span className="text-accent">extraordinary.</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Link href="/create-project" className="footer-hero-cta">
              <span>Start Your Project</span>
              <div className="cta-arrow-circle">
                <ArrowUpRight size={18} />
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="footer-divider" />

        {/* Main Minimal Grid */}
        <div className="footer-minimal-grid">
          {/* Brand & Direct Email */}
          <div className="footer-brand-block">
            <Link href="/" className="footer-minimal-logo">
              <div className="logo-box">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="logo-icon"
                >
                  <path d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z" />
                </svg>
              </div>
              <span className="logo-text">ZEROCRAFT</span>
            </Link>

            <p className="footer-tagline">
              Creative digital agency engineering high-converting web apps, UI/UX systems, and bespoke digital experiences.
            </p>

            {/* Email Copy Pill */}
            <div className="footer-email-box">
              <span className="email-label">DIRECT CONTACT</span>
              <div className="email-pill">
                <Mail size={16} className="email-icon" />
                <a href="mailto:hello@zerocraft.in" className="email-address">
                  hello@zerocraft.in
                </a>
                <button
                  onClick={handleCopyEmail}
                  className="copy-btn"
                  title="Copy email"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Links Column */}
          <div className="footer-col">
            <span className="col-title">INDEX</span>
            <ul className="col-links">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/services">Services</Link>
              </li>
              <li>
                <Link href="/works">Works & Case Studies</Link>
              </li>
              <li>
                <Link href="/careers">Careers</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
              <li>
                <Link href="/portal">Portal</Link>
              </li>
            </ul>
          </div>

          {/* Services Column */}
          <div className="footer-col">
            <span className="col-title">CAPABILITIES</span>
            <ul className="col-links">
              <li>
                <Link href="/services">UI/UX Design</Link>
              </li>
              <li>
                <Link href="/services">Web & Mobile Apps</Link>
              </li>
              <li>
                <Link href="/services">Brand Systems</Link>
              </li>
              <li>
                <Link href="/services">Digital Strategy</Link>
              </li>
              <li>
                <Link href="/create-project">Start Project</Link>
              </li>
            </ul>
          </div>

          {/* Socials / Office */}
          <div className="footer-col">
            <span className="col-title">STUDIO</span>
            <div className="office-info">
              <p>Zerocraft Studio</p>
              <p className="office-location">India • Global Remote</p>
            </div>
            <div className="status-badge">
              <span className="status-dot-pulse" />
              <span>Available for Q3/Q4 Projects</span>
            </div>
          </div>
        </div>

        {/* Big Watermark Typography */}
        <div className="footer-watermark">ZEROCRAFT</div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p className="footer-copy">
            &copy; {currentYear} Zerocraft Studio. Crafted with precision.
          </p>

          <button onClick={scrollToTop} className="scroll-top-btn">
            <span>Back to top</span>
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
