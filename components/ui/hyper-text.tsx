"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

interface HyperTextProps extends HTMLMotionProps<"span"> {
  className?: string;
  children: string; // Enforce plain text for scramble
  speed?: number;
  step?: number;
}

export const HyperText: React.FC<HyperTextProps> = ({
  children,
  className,
  speed = 10,
  step = 1,
  ...props
}) => {
  const [output, setOutput] = useState<string>("");
  const [frame, setFrame] = useState<number>(0);

  useEffect(() => {
    let isActive = true;
    const totalFrames = Math.ceil(children.length / step);
    let interval: NodeJS.Timeout;

    const scramble = () => {
      if (!isActive) return;

      let revealedCount = frame * step;
      let scrambled = children
        .split("")
        .map((char, i) => {
          if (i < revealedCount) return char;
          return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        })
        .join("");

      setOutput(scrambled);
      setFrame((prev) => prev + 1);

      if (revealedCount >= children.length) clearInterval(interval);
    };

    interval = setInterval(scramble, speed);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [children, speed, step]);

  return (
    <motion.span
      whileHover={{ color: "#00ffae", scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={cn("font-semibold tracking-wide text-white", className)}
      {...props}
    >
      {output}
    </motion.span>
  );
};
