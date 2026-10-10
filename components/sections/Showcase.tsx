"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const showcaseItems = [
  {
    id: "innovative-design",
    number: "01",
    title: "Innovative",
    titleAccent: "design",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=2000",
    bgTextTop: "COMMERCE / MARKETING / DEVELOPMENT / BRANDING /",
    bgTextBottom: "MENT / BRANDING / COMMERCE / MARKETING /",
    leftTags: ["UI/UX", "WEB DESIGN", "APPLICATIONS", "PRINT DESIGN"],
    rightTags: ["PACKAGING", "LOGO DESIGN", "MOTION", "3D MODELS"],
    link: "/#services",
  },
  {
    id: "creative-development",
    number: "02",
    title: "Creative",
    titleAccent: "development",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000",
    bgTextTop: "FRONTEND / INTERACTIONS / BACKEND / E-COMMERCE /",
    bgTextBottom: "MOBILE APPS / MAINTENANCE / UPDATES / SUPPORT /",
    leftTags: ["FRONTEND", "INTERACTIONS", "BACKEND", "E-COMMERCE"],
    rightTags: ["MOBILE APPS", "MAINTENANCE", "UPDATES", "SUPPORT"],
    link: "/#services",
  },
  {
    id: "brand-identity",
    number: "03",
    title: "Brand",
    titleAccent: "Identity",
    image:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2000",
    bgTextTop: "BRAND STRATEGY / LOGO DESIGN / GUIDELINES /",
    bgTextBottom: "VISUAL IDENTITY / REBRANDING / SUPPORT /",
    leftTags: ["BRAND STRATEGY", "LOGO DESIGN", "GUIDELINES"],
    rightTags: ["VISUAL IDENTITY", "REBRANDING", "SUPPORT"],
    link: "/#services",
  },
  {
    id: "marketing-solutions",
    number: "04",
    title: "Marketing",
    titleAccent: "solutions",
    image:
      "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&q=80&w=2000",
    bgTextTop: "STRATEGY / SOCIAL MEDIA / SEO / CAMPAIGNS /",
    bgTextBottom: "OPTIMIZATION / EMAIL / CONTENT / ANALYTICS /",
    leftTags: ["STRATEGY", "SOCIAL MEDIA", "SEO"],
    rightTags: ["OPTIMIZATION", "EMAIL", "CAMPAIGNS"],
    link: "/#services",
  },
];

/* ── Matrix / Cyberpunk Text Scramble Component for Side Tags ── */
function ScrambleTextTag({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  const scramble = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const chars = "!@#$%^&*ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let iteration = 0;

    intervalRef.current = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " " || char === "/") return char;
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join(""),
      );

      if (iteration >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      iteration += 1 / 2;
    }, 25);
  };

  return (
    <span className="azuris-showcase-tag" onMouseEnter={scramble}>
      {displayText}
    </span>
  );
}

export default function Showcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const bgWrapperRef = useRef<HTMLDivElement>(null);
  const bgTextTopRef = useRef<HTMLDivElement>(null);
  const bgTextBottomRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const leftListRef = useRef<HTMLDivElement>(null);
  const rightListRef = useRef<HTMLDivElement>(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [isHoveredTitle, setIsHoveredTitle] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const handleTitleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sectionRef.current || !frameRef.current) return;

      // Master GSAP ScrollTrigger timeline pinned across 160% scroll distance
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=160%",
          scrub: 1.0,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (self.progress > 0.22) {
              const adjustedProgress = (self.progress - 0.22) / 0.78;
              const idx = Math.min(
                showcaseItems.length - 1,
                Math.floor(adjustedProgress * showcaseItems.length),
              );
              setActiveIdx(idx);
            } else {
              setActiveIdx(0);
            }
          },
        },
      });

      // ── STAGE 1: Parallax horizontal slide on background typography ──
      if (bgTextTopRef.current && bgTextBottomRef.current) {
        tl.to(bgTextTopRef.current, { xPercent: -25, ease: "none" }, 0);
        tl.to(bgTextBottomRef.current, { xPercent: 25, ease: "none" }, 0);
      }

      // ── STAGE 2: Scale centered thumbnail (280px) to FULLSCREEN ──
      tl.fromTo(
        frameRef.current,
        {
          width: "280px",
          height: "340px",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
          force3D: true,
        },
        {
          width: "100vw",
          height: "100vh",
          borderRadius: "0px",
          boxShadow: "0 0 0 rgba(0,0,0,0)",
          ease: "power2.inOut",
          duration: 0.25,
          force3D: true,
        },
        0,
      );

      // Fade out background repeating text as frame scales to fullscreen
      if (bgWrapperRef.current) {
        tl.to(bgWrapperRef.current, { opacity: 0, ease: "power2.in" }, 0.2);
      }

      // ── STAGE 3: Reveal Content ON FULLSCREEN ONLY ──
      // Dark overlay fade
      if (overlayRef.current) {
        tl.fromTo(
          overlayRef.current,
          { opacity: 0 },
          { opacity: 1, ease: "power2.out", duration: 0.1 },
          0.22,
        );
      }

      // Center Headline ("Innovative design") reveal
      if (titleRef.current) {
        tl.fromTo(
          titleRef.current,
          { opacity: 0, y: 35 },
          { opacity: 1, y: 0, ease: "power3.out", duration: 0.12 },
          0.24,
        );
      }

      // Left side center tags reveal
      if (leftListRef.current) {
        tl.fromTo(
          leftListRef.current,
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, ease: "power3.out", duration: 0.12 },
          0.24,
        );
      }

      // Right side center tags reveal
      if (rightListRef.current) {
        tl.fromTo(
          rightListRef.current,
          { opacity: 0, x: 30 },
          { opacity: 1, x: 0, ease: "power3.out", duration: 0.12 },
          0.24,
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const activeItem = showcaseItems[activeIdx];

  return (
    <section ref={sectionRef} className="azuris-showcase-section" id="showcase">
      <div className="azuris-showcase-viewport">
        {/* ── STAGE 1: Oversized Repeating Background Typography Track ── */}
        <div ref={bgWrapperRef} className="azuris-showcase-bg-typography">
          <div
            ref={bgTextTopRef}
            className="azuris-showcase-bg-track azuris-showcase-bg-track--top"
          >
            <span className="azuris-showcase-bg-text">
              {activeItem.bgTextTop}
            </span>
            <span className="azuris-showcase-bg-text" aria-hidden="true">
              {activeItem.bgTextTop}
            </span>
          </div>

          <div
            ref={bgTextBottomRef}
            className="azuris-showcase-bg-track azuris-showcase-bg-track--bottom"
          >
            <span className="azuris-showcase-bg-text">
              {activeItem.bgTextBottom}
            </span>
            <span className="azuris-showcase-bg-text" aria-hidden="true">
              {activeItem.bgTextBottom}
            </span>
          </div>
        </div>

        {/* ── STAGE 2: Centered Image Frame Scaling from Thumbnail to Fullscreen ── */}
        <div ref={frameRef} className="azuris-showcase-frame">
          {showcaseItems.map((item, idx) => (
            <div
              key={item.id}
              className={`azuris-showcase-media ${
                activeIdx === idx ? "azuris-showcase-media--active" : ""
              }`}
            >
              <Image
                src={item.image}
                alt={`${item.title} ${item.titleAccent}`}
                fill
                priority={idx === 0}
                className="azuris-showcase-img"
                sizes="100vw"
              />
            </div>
          ))}

          {/* Dark Overlay over Fullscreen Image */}
          <div ref={overlayRef} className="azuris-showcase-overlay" />
        </div>

        {/* ── STAGE 3: Left Side ScrambleText Tags (On Hover) ── */}
        <div
          ref={leftListRef}
          className="azuris-showcase-side azuris-showcase-side--left"
        >
          {activeItem.leftTags.map((tag) => (
            <ScrambleTextTag key={tag} text={tag} />
          ))}
        </div>

        {/* ── STAGE 3: Right Side ScrambleText Tags (On Hover) ── */}
        <div
          ref={rightListRef}
          className="azuris-showcase-side azuris-showcase-side--right"
        >
          {activeItem.rightTags.map((tag) => (
            <ScrambleTextTag key={tag} text={tag} />
          ))}
        </div>

        {/* ── STAGE 3: Center Headline with Cursor Tracking "KNOW MORE" Circle ── */}
        <div ref={titleRef} className="azuris-showcase-title">
          <span
            className="text-label"
            style={{
              marginBottom: "1rem",
              display: "block",
              textAlign: "center",
            }}
          >
            Featured Project
          </span>
          <Link
            href={activeItem.link}
            className="azuris-showcase-title-link"
            onMouseEnter={() => setIsHoveredTitle(true)}
            onMouseLeave={() => setIsHoveredTitle(false)}
            onMouseMove={handleTitleMouseMove}
          >
            <h2 className="section-heading text-center" style={{ margin: 0 }}>
              {activeItem.title}
              <br />
              <span
                className="azuris-showcase-heading--accent"
                style={{ fontStyle: "italic", opacity: 0.8 }}
              >
                {activeItem.titleAccent}
              </span>
            </h2>

            {/* Cursor-Tracking "KNOW MORE" Floating Circle Badge */}
            <div
              className={`azuris-know-more-circle ${
                isHoveredTitle ? "azuris-know-more-circle--active" : ""
              }`}
              style={{
                left: `${cursorPos.x}px`,
                top: `${cursorPos.y}px`,
              }}
            >
              <span>KNOW</span>
              <span>MORE</span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
