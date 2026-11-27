"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";
import BadgeButton from "@/components/ui/BadgeButton";
import RotatingWords from "@/components/ui/RotatingWords";

const stats = [
  { number: "Design", label: "Identity & digital experiences" },
  { number: "Code", label: "Websites & applications" },
  { number: "Story", label: "Photography, Film & Motion" },
  { number: "Tenkasi", label: "Rooted Locally. Creating Beyond Borders." },
];

export default function About({ showLink = true }: { showLink?: boolean }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section className="section about" id="about" aria-label="About us">
      <Container>
        {/* Label */}
        <Reveal delay={0}>
          <span className="studio-eyebrow studio-eyebrow--section">About the studio</span>
        </Reveal>

        {/* Main editorial layout */}
        <div className="about__grid" ref={ref}>
          {/* Left: Large statement */}
          <Reveal delay={0.1} className="about__statement">
            <h2 className="section-heading" aria-label="Bold in thinking. Intentional in design.">
              Bold in thinking.
              <br />
              <RotatingWords words={["Intentional in design.", "Curious by nature.", "Built to connect."]} className="studio-accent" />
            </h2>
          </Reveal>

          {/* Right: Description */}
          <div className="about__content">
            <Reveal delay={0.2}>
              <p className="section-desc">
                Zerocraft is a creative and digital studio based in
                Tenkasi, Tamil Nadu, India. We work at the intersection of
                design, technology, and storytelling to create distinctive
                brands and engaging digital experiences.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="section-desc">
                From building a visual identity to designing digital products
                and crafting cinematic content, we approach every project with
                curiosity, creativity, and attention to detail.
              </p>
            </Reveal>
            <Reveal delay={0.34}>
              <p className="section-desc">
                Founded and led by Manimaran, Zerocraft brings a founder-led
                point of view to every brief — personal enough to care deeply,
                considered enough to build work that lasts.
              </p>
            </Reveal>
            <Reveal delay={0.35}>
              <p className="section-desc">
                We believe meaningful creative work is not just about how
                something looks, but how it feels, functions, and connects with
                people.
              </p>
            </Reveal>
            {showLink && (
              <Reveal delay={0.4}>
                <div className="about__btn-wrapper">
                  <BadgeButton href="/about" text="MEET THE STUDIO" />
                </div>
              </Reveal>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="about__stats">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="about__stat"
              initial={reducedMotion ? false : { opacity: 0, y: 30 }}
              animate={reducedMotion || isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: reducedMotion ? 0 : 0.8,
                delay: reducedMotion ? 0 : 0.5 + i * 0.1,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
            >
              <span className="about__stat-number">{stat.number}</span>
              <span className="about__stat-label">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
