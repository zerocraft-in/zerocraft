"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";

const projects = [
  {
    id: 1,
    title: "Aura Skincare",
    category: "E-Commerce / Branding",
    image:
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=2000",
  },
  {
    id: 2,
    title: "Nova Fintech",
    category: "Web App / UI/UX",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000",
  },
  {
    id: 3,
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

  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "20%"]);

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
                    style={{ y, scale: 1.1 }}
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

                  {/* Hover Overlay */}
                  <div className="works__item-overlay" />

                  {/* View Project Button */}
                  <div className="works__item-btn-wrapper">
                    <span className="works__item-btn">View Project</span>
                  </div>
                </div>

                <div className="works__item-meta">
                  <h3 className="works__item-title">{project.title}</h3>
                  <span className="works__item-category">
                    {project.category}
                  </span>
                </div>
              </Reveal>
            </div>
          ))}
        </div>

        <div className="works__footer">
          <Reveal>
            <a href="/works" className="btn btn--outline">
              View All Projects
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </a>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
