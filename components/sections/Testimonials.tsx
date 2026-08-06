"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import Container from "@/components/ui/Container";

const testimonials = [
  {
    id: 1,
    quote:
      "Zerocraft Studio transformed our brand identity completely. Their attention to detail and strategic approach delivered results beyond our expectations.",
    author: "Sarah Jenkins",
    role: "CEO, Aura Skincare",
  },
  {
    id: 2,
    quote:
      "Working with this team was seamless. They understood our vision immediately and executed a flawless digital platform that our users love.",
    author: "David Chen",
    role: "Founder, Nova Fintech",
  },
  {
    id: 3,
    quote:
      "The motion design and web development work provided by Zerocraft elevated our portfolio to an award-winning standard.",
    author: "Elena Rodriguez",
    role: "Creative Director, Lumina",
  },
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="section testimonials" id="testimonials">
      <Container>
        <div className="testimonials__wrapper">
          <Reveal delay={0}>
            <span className="testimonials__label text-label">Testimonials</span>
          </Reveal>

          <div className="testimonials__slider">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                className="testimonials__content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                }}
              >
                <p className="testimonials__quote">
                  "{testimonials[currentIndex].quote}"
                </p>
                <div className="testimonials__author-info">
                  <span className="testimonials__author">
                    {testimonials[currentIndex].author}
                  </span>
                  <span className="testimonials__role">
                    {testimonials[currentIndex].role}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <Reveal delay={0.2} className="testimonials__controls">
            <button onClick={prev} className="testimonials__btn" aria-label="Previous testimonial">
              <span aria-hidden="true">←</span>
            </button>
            <div className="testimonials__dots">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  className={`testimonials__dot ${i === currentIndex ? "testimonials__dot--active" : ""}`}
                  onClick={() => setCurrentIndex(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button onClick={next} className="testimonials__btn" aria-label="Next testimonial">
              <span aria-hidden="true">→</span>
            </button>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
