"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BadgeButton from "@/components/ui/BadgeButton";
import {
  IconPalette,
  IconVector,
  IconBook,
  IconEye,
  IconTarget,
  IconCode,
  IconBrandNextjs,
  IconBrandReact,
  IconFileTypeTs,
  IconServer,
  IconLayout,
  IconSearch,
  IconTemplate,
  IconClick,
  IconComponents,
  IconTrendingUp,
  IconSeo,
  IconShare,
  IconBulb,
  IconChartBar,
  IconVideo,
  IconMovie,
  IconCamera,
  IconDeviceTv,
  IconWand,
  IconBox,
  IconPackage,
  IconBook2,
  IconPencil,
  IconBuildingStore,
  IconArrowRight,
} from "@tabler/icons-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const services = [
  {
    id: "brand-identity",
    number: "01",
    title: "Brand Identity",
    tagline: "Distinction & Guidelines",
    icon: IconPalette,
    description:
      "We craft distinctive brand identities that capture your vision and resonate with your audience. From logos to comprehensive brand systems, every element is thoughtfully designed.",
    capabilitiesText: "Logo Design, Brand Guidelines, Visual Identity, Brand Strategy",
    tags: [
      { name: "Logo Design", icon: IconVector },
      { name: "Guidelines", icon: IconBook },
      { name: "Visual ID", icon: IconEye },
      { name: "Strategy", icon: IconTarget },
    ],
    badgeColor: "#8B5CF6",
    waveVariant: "services__wave-card--mid",
  },
  {
    id: "web-dev",
    number: "02",
    title: "Web Development",
    tagline: "High-Performance Full-Stack",
    icon: IconCode,
    description:
      "We build performant, accessible, and beautifully crafted websites and web applications using modern technologies. Every pixel is intentional, every interaction is smooth.",
    capabilitiesText: "Next.js, React, TypeScript, Full-Stack Architecture",
    tags: [
      { name: "Next.js", icon: IconBrandNextjs },
      { name: "React", icon: IconBrandReact },
      { name: "TypeScript", icon: IconFileTypeTs },
      { name: "Full-Stack", icon: IconServer },
    ],
    badgeColor: "#3B82F6",
    waveVariant: "services__wave-card--low",
  },
  {
    id: "ui-ux",
    number: "03",
    title: "UI/UX Design",
    tagline: "User-Centered Interfaces",
    icon: IconLayout,
    description:
      "We design intuitive user experiences and stunning interfaces that delight users and drive engagement. Research-driven design that puts users at the center.",
    capabilitiesText: "User Research, Wireframes, Prototyping, Design System",
    tags: [
      { name: "Research", icon: IconSearch },
      { name: "Wireframes", icon: IconTemplate },
      { name: "Prototyping", icon: IconClick },
      { name: "Design System", icon: IconComponents },
    ],
    badgeColor: "#10B981",
    waveVariant: "services__wave-card--high",
  },
  {
    id: "digital-marketing",
    number: "04",
    title: "Digital Marketing",
    tagline: "Data-Driven Scalability",
    icon: IconTrendingUp,
    description:
      "We develop data-driven marketing strategies that amplify your brand presence and drive measurable growth across all digital channels.",
    capabilitiesText: "Search Engine Optimization, Social Media, Content Strategy, Analytics",
    tags: [
      { name: "SEO", icon: IconSeo },
      { name: "Social Media", icon: IconShare },
      { name: "Content", icon: IconBulb },
      { name: "Analytics", icon: IconChartBar },
    ],
    badgeColor: "#F59E0B",
    waveVariant: "services__wave-card--low",
  },
  {
    id: "video-production",
    number: "05",
    title: "Video Production",
    tagline: "Cinematic Motion Graphics",
    icon: IconVideo,
    description:
      "We produce compelling video content that tells your story with cinematic quality. From concept to final edit, we handle every aspect of production.",
    capabilitiesText: "Motion Graphics, Brand Films, Social Video Content, 3D Animation",
    tags: [
      { name: "Motion", icon: IconMovie },
      { name: "Brand Films", icon: IconCamera },
      { name: "Social Content", icon: IconDeviceTv },
      { name: "Animation", icon: IconWand },
    ],
    badgeColor: "#F43F5E",
    waveVariant: "services__wave-card--high",
  },
  {
    id: "print-packaging",
    number: "06",
    title: "Print & Packaging",
    tagline: "Tangible Tactile Experiences",
    icon: IconBox,
    description:
      "We design premium print materials and packaging that make a lasting physical impression. Tangible brand touchpoints crafted with care.",
    capabilitiesText: "Packaging Design, Editorial & Books, Corporate Stationery, Signage Systems",
    tags: [
      { name: "Packaging", icon: IconPackage },
      { name: "Editorial", icon: IconBook2 },
      { name: "Stationery", icon: IconPencil },
      { name: "Signage", icon: IconBuildingStore },
    ],
    badgeColor: "#6366F1",
    waveVariant: "services__wave-card--low",
  },
];

/* ── Central Iris Dial SVG Background with 120 Radial Ticks ── */
function IrisDialBackground({
  ticksGroupRef,
}: {
  ticksGroupRef: React.RefObject<SVGGElement | null>;
}) {
  const ticks = Array.from({ length: 120 }, (_, i) => i);

  return (
    <svg
      className="services__iris-dial"
      viewBox="0 0 1200 1200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer Dashed Orbital Rings */}
      <circle
        cx="600"
        cy="600"
        r="540"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 8"
        opacity="0.22"
      />
      <circle cx="600" cy="600" r="510" stroke="currentColor" strokeWidth="1" opacity="0.32" />

      {/* Radial Ticks Group (Rotated on GSAP Page Scroll) */}
      <g ref={ticksGroupRef}>
        {ticks.map((i) => {
          const angle = i * 3;
          const isMajor = i % 5 === 0;
          return (
            <line
              key={i}
              x1="600"
              y1={isMajor ? "110" : "120"}
              x2="600"
              y2="135"
              stroke="currentColor"
              strokeWidth={isMajor ? "2" : "1"}
              transform={`rotate(${angle} 600 600)`}
              opacity={isMajor ? 0.45 : 0.25}
            />
          );
        })}
      </g>

      {/* Inner Accent Pulsing Rings */}
      <circle
        cx="600"
        cy="600"
        r="280"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="6 6"
        opacity="0.2"
      />
      <circle
        cx="600"
        cy="600"
        r="180"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="12 12"
        opacity="0.25"
      />
    </svg>
  );
}

export default function Services() {
  const [selectedService, setSelectedService] = useState<typeof services[0] | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const ticksGroupRef = useRef<SVGGElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);
  const logoPathRef = useRef<SVGPathElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // GSAP Canvas Particle Background Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Project-related tech elements/symbols
    const symbols = ["</>", "◇", "✦", "{ }", "01", "●", "▲", "[ ]", "λ", "⚡", "✧"];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      symbol: string;
      rotation: number;
      vRot: number;
    }

    const particles: Particle[] = Array.from({ length: 35 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: 11 + Math.random() * 12,
      opacity: 0.12 + Math.random() * 0.25,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.008,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#FFFFFF" : "#111111";

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        if (p.x < -40) p.x = width + 40;
        if (p.x > width + 40) p.x = -40;
        if (p.y < -40) p.y = height + 40;
        if (p.y > height + 40) p.y = -40;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.font = `${p.size}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.symbol, 0, 0);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // GSAP ScrollTrigger Pinned Animation + Page Scroll Circle Rotation + Static Logo Reveal
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sectionRef.current || !heroTextRef.current || !trackRef.current) return;

      const track = trackRef.current;
      const heroText = heroTextRef.current;
      const totalScrollWidth = track.scrollWidth;

      // Static Center Logo SVG Stroke & Scale Image Sequence Reveal Effect
      if (logoPathRef.current && logoRef.current) {
        const pathLength = logoPathRef.current.getTotalLength();

        gsap.set(logoPathRef.current, {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
        });

        gsap.to(logoPathRef.current, {
          strokeDashoffset: 0,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
          },
        });

        gsap.fromTo(
          logoRef.current,
          { scale: 0.5, opacity: 0 },
          {
            scale: 1,
            opacity: 0.35,
            duration: 1.2,
            ease: "back.out(1.7)",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 70%",
            },
          }
        );
      }

      // Master Pinned ScrollTrigger Timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=280%",
          scrub: 1.0,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // ── ROTATION ON GSAP PAGE SCROLL: Circle tick marks rotate in sync with scroll ──
      if (ticksGroupRef.current) {
        tl.to(
          ticksGroupRef.current,
          {
            rotation: 240,
            svgOrigin: "600 600",
            ease: "none",
          },
          0
        );
      }

      // ── STAGE 1: Central Text ("Services Designed to Elevate Your Brand") moves Left & Fades Out FIRST ──
      tl.to(
        heroText,
        {
          xPercent: -130,
          opacity: 0,
          ease: "power1.in",
          duration: 0.35,
        },
        0
      );

      // ── STAGE 2: Horizontal Card Track starts OFF-SCREEN RIGHT and glides through center to right edge ──
      tl.fromTo(
        track,
        {
          x: () => window.innerWidth,
        },
        {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: "none",
          duration: 0.85,
        },
        0.12
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="services services--track"
      id="services"
      aria-label="Our services"
    >
      {/* Top Left Pinned Section Title (Where Yellow Arrow Points) */}
      <div className="services__top-pinned-title container-site">
        <span className="services__top-title-badge">SERVICES</span>
      </div>

      {/* HTML5 Canvas GSAP Background Particle Field */}
      <canvas ref={canvasRef} className="services__canvas-particles" />

      {/* Central Iris Dial Background (Tick marks rotate on page scroll) */}
      <IrisDialBackground ticksGroupRef={ticksGroupRef} />

      {/* Static Center Zerocraft Logo with GSAP SVG Reveal Effect */}
      <div className="services__center-logo-wrap">
        <svg
          ref={logoRef}
          className="services__center-logo-svg"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            ref={logoPathRef}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.5"
            d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z"
          />
        </svg>
      </div>

      {/* Central Initial Hero Text Block (Inside Dial Ring) */}
      <div ref={heroTextRef} className="services__hero-center">
        <span className="services__hero-label">Capabilities & Craft</span>
        <h2 className="services__hero-heading">
          Services designed to <br />
          elevate your brand.
        </h2>
        <p className="services__hero-sub">
          We craft distinctive brand identities, high-performance web applications, intuitive
          interfaces, and data-driven digital strategies that drive growth.
        </p>
      </div>

      {/* GSAP ScrollTrigger Pinned Horizontal Wave Track */}
      <div className="services__wave-wrapper">
        <div ref={trackRef} className="services__wave-track">
          {services.map((service) => {
            const ServiceIcon = service.icon;

            return (
              <motion.div
                key={service.id}
                className={`services__wave-card ${service.waveVariant}`}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setSelectedService(service)}
              >
                {/* Top Right Learn More CTA */}
                <div className="services__wave-card-top">
                  <span className="services__wave-card-learn">
                    Learn More <IconArrowRight size={14} stroke={2} />
                  </span>
                </div>

                {/* Center Icon Badge */}
                <div className="services__wave-card-center">
                  <div className="services__wave-card-icon">
                    <ServiceIcon size={28} stroke={1.5} />
                  </div>
                </div>

                {/* Bottom Title & Capability Subtext */}
                <div className="services__wave-card-bottom">
                  <h3 className="services__wave-card-title">{service.title}</h3>
                  <p className="services__wave-card-subtext">{service.capabilitiesText}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Modal Detail View */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            className="services__modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedService(null)}
          >
            <motion.div
              className="services__modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="services__modal-close"
                onClick={() => setSelectedService(null)}
                aria-label="Close detail modal"
              >
                ✕
              </button>

              <div className="services__modal-header">
                <div className="services__bento-icon-badge services__modal-icon">
                  {<selectedService.icon size={28} stroke={1.5} />}
                </div>
                <div>
                  <span className="services__bento-sub">{selectedService.number} / SERVICE</span>
                  <h3 className="services__modal-title">{selectedService.title}</h3>
                </div>
              </div>

              <p className="services__modal-desc">{selectedService.description}</p>

              <h4 className="services__modal-subheading">Capabilities Included:</h4>
              <div className="services__modal-tags">
                {selectedService.tags.map((tag) => {
                  const TagIcon = tag.icon;
                  return (
                    <div key={tag.name} className="services__item-tag-pill">
                      <div className="services__tag-icon-circle">
                        <TagIcon size={14} stroke={1.75} />
                      </div>
                      <span className="services__tag-label">{tag.name}</span>
                    </div>
                  );
                })}
              </div>

              <div className="services__modal-footer">
                <BadgeButton href="/contact" text="START A PROJECT" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
