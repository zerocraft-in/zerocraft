"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface HeadingProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "div";
  split?: "words" | "chars";
  delay?: number;
  stagger?: number;
  duration?: number;
  once?: boolean;
  animate?: boolean;
}

export default function Heading({
  text,
  className = "",
  as: Tag = "h2",
  split = "words",
  delay = 0,
  stagger = 0.04,
  duration = 0.8,
  once = true,
  animate = true,
}: HeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(ref, { once, amount: 0.3 });

  if (!animate) {
    return <Tag className={className}>{text}</Tag>;
  }

  const items = split === "chars" ? text.split("") : text.split(" ");

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const itemVariants = {
    hidden: {
      y: "100%",
      opacity: 0,
    },
    visible: {
      y: "0%",
      opacity: 1,
      transition: {
        duration,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number], // easeOutExpo
      },
    },
  };

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      <motion.span
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        style={{
          display: "inline-flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: split === "chars" ? "0" : "0.25em",
        }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            style={{ display: "inline-block", overflow: "hidden" }}
          >
            <motion.span
              variants={itemVariants}
              style={{ display: "inline-block" }}
            >
              {item}
              {split === "chars" && item === " " ? "\u00A0" : ""}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
