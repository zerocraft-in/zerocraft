"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";
import BadgeButton from "@/components/ui/BadgeButton";

const projects = [
  {
    id: 1,
    number: "01",
    title: "Aura Skincare",
    category: "E-Commerce / Branding",
    image:
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=2000",
  },
  {
    id: 2,
    number: "02",
    title: "Nova Fintech",
    category: "Web App / UI/UX",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000",
  },
  {
    id: 3,
    number: "03",
    title: "Lumina Architecture",
    category: "Portfolio / Motion",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=2000",
  },
];

export default function Works() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-5%", "10%"]);

  return (
    <section className="section works" id="works" ref={containerRef}>
      <Container>
        <div className="works__header">
          <Reveal>
            <span className="works__label text-label">Selected Works</span>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="works__heading">
              Digital experiences that drive growth.
            </h2>
          </Reveal>
        </div>

        <div className="works__grid">
          {projects.map((project, index) => (
            <div key={project.id} className="works__item group">
              <Reveal delay={0.1 * index} variant="slide-up">
                <div className="works__item-image-wrapper">
                  <motion.div
                    style={{ y }}
                    className="works__item-parallax"
                  >
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      className="works__item-image"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </motion.div>

                  {/* Top Badge Number */}
                  <div className="works__item-number-badge">
                    {project.number}
                  </div>

                  {/* Hover Overlay */}
                  <div className="works__item-overlay" />

                  {/* View Project Button */}
                  <div className="works__item-btn-wrapper">
                    <span className="works__item-btn">
                      VIEW PROJECT
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 14 14"
                        fill="currentColor"
                        className="ml-1.5"
                      >
                        <path d="M0 6H9.5V8H0V6ZM8 2H10V4H8V2ZM10 4H12V6H10V4ZM12 6H14V8H12V6ZM10 8H12V10H10V8ZM8 10H10V12H8V10Z" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="works__item-meta">
                  <div className="works__item-meta-top">
                    <h3 className="works__item-title">{project.title}</h3>
                    <span className="works__item-category">
                      {project.category}
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>
          ))}
        </div>

        <div className="works__footer">
          <Reveal>
            <BadgeButton href="/works" text="VIEW ALL PROJECTS" />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
