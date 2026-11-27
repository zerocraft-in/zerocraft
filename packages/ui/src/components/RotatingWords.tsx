"use client";

import { useEffect, useState } from "react";

export default function RotatingWords({ words, paused = false, className = "" }: { words: string[]; paused?: boolean; className?: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (paused || words.length < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % words.length), 2800);
    return () => window.clearInterval(timer);
  }, [paused, words.length]);
  return <span className={className}>{words[index] ?? ""}</span>;
}
