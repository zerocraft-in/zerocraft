"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type RotatingWordsProps = {
  words: readonly string[];
  className?: string;
  paused?: boolean;
};

export default function RotatingWords({ words, className = "", paused = false }: RotatingWordsProps) {
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (paused || reducedMotion || words.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % words.length), 3200);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, words.length]);

  return (
    <span className={`crt-words ${className}`} aria-hidden="true">
      {words.map((word) => <span key={word} className="crt-words__sizer">{word}</span>)}
      <AnimatePresence initial={false}>
        <motion.span
          key={words[index]}
          className="crt-words__item"
          initial={reducedMotion ? false : { opacity: 0, y: "18%", filter: "blur(2px)" }}
          animate={{ opacity: 1, y: "0%", filter: "blur(0px)" }}
          exit={reducedMotion ? undefined : { opacity: 0, y: "-18%", filter: "blur(2px)" }}
          transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
