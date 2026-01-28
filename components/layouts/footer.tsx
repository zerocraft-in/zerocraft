"use client";

import { motion } from "framer-motion";
import type React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      {/* Animated background glow */}
      <motion.div
        animate={{
          opacity: [0.15, 0.25, 0.15],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="footer-glow"
      />

      <div className="footer-container">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="footer-bottom"
        >
          <div className="footer-copy">
            <p>
              &copy; {new Date().getFullYear()} zerocraft.studio. All rights
              reserved.
            </p>
          </div>

          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="footer-status"
          >
            <span className="status-dot" />
            We're available for projects
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
