"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import Container from "@/components/ui/Container";

export default function Showcase() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Track scroll progress over the 300vh container
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  /* ── STAGE 1 (0 to 0.4) ── */
  // The center image grows from a 300px square to full screen
  const imgWidth = useTransform(scrollYProgress, [0, 0.4], ["300px", "100vw"]);
  const imgHeight = useTransform(scrollYProgress, [0, 0.4], ["300px", "100vh"]);
  const imgBorderRadius = useTransform(scrollYProgress, [0, 0.4], ["8px", "0px"]);

  // The "Innovative design" text fades in as the image reaches full size
  const innovativeOpacity = useTransform(scrollYProgress, [0.3, 0.4, 0.5, 0.6], [0, 1, 1, 0]);
  const innovativeScale = useTransform(scrollYProgress, [0.3, 0.5], [0.8, 1.1]);

  // Stage 1 side text fades out
  const stage1TextOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // Massive background text parallax and fade
  const bgTextY = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const bgTextOpacity = useTransform(scrollYProgress, [0, 0.3], [0.1, 0]);

  /* ── STAGE 2 (0.5 to 1.0) ── */
  // The full-screen image fades out, revealing the dark texture
  const imgOpacity = useTransform(scrollYProgress, [0.5, 0.6], [1, 0]);

  // The phone mockup translates up from the bottom
  const phoneY = useTransform(scrollYProgress, [0.5, 0.7], ["100%", "0%"]);

  // "Creative development" text fades in
  const creativeOpacity = useTransform(scrollYProgress, [0.6, 0.7], [0, 1]);

  // Stage 2 side text fades in
  const stage2TextOpacity = useTransform(scrollYProgress, [0.6, 0.7], [0, 1]);

  return (
    <section ref={wrapperRef} className="showcase" id="showcase">
      <div className="showcase__sticky">

        {/* Background Dark Texture Layer */}
        <div className="showcase__dark-bg" />

        {/* Massive Background Text */}
        <motion.div
          className="showcase__bg-text-wrapper"
          style={{ y: bgTextY, opacity: bgTextOpacity }}
        >
          <div className="showcase__bg-text-line">COMMERCE / MARKET</div>
          <div className="showcase__bg-text-line">ENT / BRANDING /</div>
          <div className="showcase__bg-text-line">APPLICATIONS</div>
          <div className="showcase__bg-text-line">PRINT DESIGN</div>
          <div className="showcase__bg-text-line">MMERCE / MARKET</div>
          <div className="showcase__bg-text-line">ENT / BRANDING /</div>
        </motion.div>

        {/* Expanding Center Image */}
        <motion.div
          className="showcase__center-img-wrapper"
          style={{
            width: imgWidth,
            height: imgHeight,
            borderRadius: imgBorderRadius,
            opacity: imgOpacity,
          }}
        >
          <Image
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=2000" // Editorial fashion portrait (similar to screenshot)
            alt="Editorial design"
            fill
            className="showcase__img"
            sizes="100vw"
            priority
          />
          {/* Overlaid "Innovative design" text */}
          <motion.div
            className="showcase__center-text"
            style={{ opacity: innovativeOpacity, scale: innovativeScale }}
          >
            <h2>Innovative<br />design</h2>
          </motion.div>
        </motion.div>

        {/* Stage 1: Left/Right Texts */}
        <Container className="showcase__overlay-container">
          <motion.div className="showcase__side-list showcase__side-list--left" style={{ opacity: stage1TextOpacity }}>
            <span>UI/UX</span>
            <span>WEB DESIGN</span>
            <span>APPLICATIONS</span>
            <span>PRINT DESIGN</span>
          </motion.div>

          <motion.div className="showcase__side-list showcase__side-list--right" style={{ opacity: stage1TextOpacity }}>
            <span>PACKAGING</span>
            <span>LOGO DESIGN</span>
            <span>MOTION</span>
            <span>3D MODELS</span>
          </motion.div>
        </Container>

        {/* Stage 2: Phone Mockup & Texts */}
        <motion.div
          className="showcase__stage2"
          style={{ y: phoneY }}
        >
          {/* Using a tech/phone placeholder image */}
          <Image
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=2000"
            alt="Mobile development"
            width={800}
            height={800}
            className="showcase__phone-img"
          />

          <motion.div
            className="showcase__center-text showcase__center-text--stage2"
            style={{ opacity: creativeOpacity }}
          >
            <h2>Creative<br />development</h2>
          </motion.div>

          <Container className="showcase__overlay-container">
            <motion.div className="showcase__side-list showcase__side-list--left" style={{ opacity: stage2TextOpacity }}>
              <span>FRONTEND</span>
              <span>INTERACTIONS</span>
              <span>BACKEND</span>
              <span>E-COMMERCE</span>
            </motion.div>

            <motion.div className="showcase__side-list showcase__side-list--right" style={{ opacity: stage2TextOpacity }}>
              <span>MOBILE APPS</span>
              <span>MAINTENANCE</span>
              <span>UPDATES</span>
              <span>SUPPORT</span>
            </motion.div>
          </Container>
        </motion.div>

      </div>
    </section>
  );
}
