"use client";

import { motion } from "framer-motion";
import type React from "react";
import IvdLink from "@/components/ui/link";
const CTA: React.FC = () => {
  return (
    <section className="cta-section">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="cta-container"
      >
        <h2 className="cta-title">Ready to Transform Your Digital Presence?</h2>

        <p className="cta-description">
          Let's talk about your vision. We'll show you how strategy and
          creativity can drive real business impact.
        </p>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="cta-button-wrapper"
        >
          <IvdLink className="cta-button" href="/project" title="Start Your Project" />
        </motion.div>

        <p className="cta-email">
          Or send us an email at{" "}
          <a href="mailto:hello@zerocraft.studio">hello.zerocraft@gmail.com</a>
        </p>
      </motion.div>
    </section>
  );
};

export default CTA;
