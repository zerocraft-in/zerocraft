"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";

interface BadgeButtonProps {
  href: string;
  text: string;
  className?: string;
  target?: string;
}

export default function BadgeButton({
  href,
  text,
  className = "",
  target,
}: BadgeButtonProps) {
  const upperText = text.toUpperCase();
  const [displayText, setDisplayText] = useState(upperText);
  const animationFrameRef = useRef<number | null>(null);

  const scramble = useCallback(() => {
    let iteration = 0;
    const totalSteps = upperText.length * 3;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    let lastTime = performance.now();

    const update = (currentTime: number) => {
      if (currentTime - lastTime > 35) {
        lastTime = currentTime;
        setDisplayText(
          upperText
            .split("")
            .map((char, index) => {
              if (char === " ") return " ";
              if (index < iteration / 3) {
                return upperText[index];
              }
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join("")
        );
        iteration++;
      }

      if (iteration <= totalSteps) {
        animationFrameRef.current = requestAnimationFrame(update);
      } else {
        setDisplayText(upperText);
      }
    };

    animationFrameRef.current = requestAnimationFrame(update);
  }, [upperText]);

  const resetText = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setDisplayText(upperText);
  }, [upperText]);

  const isExternal = href.startsWith("http") || target === "_blank";
  const Component = isExternal ? "a" : Link;

  return (
    <Component
      href={href}
      target={target}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={`badge-btn ${className}`}
      onMouseEnter={scramble}
      onMouseLeave={resetText}
    >
      <span className="badge-btn__text">{displayText}</span>
      <span className="badge-btn__icon">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 6H9.5V8H0V6ZM8 2H10V4H8V2ZM10 4H12V6H10V4ZM12 6H14V8H12V6ZM10 8H12V10H10V8ZM8 10H10V12H8V10Z" />
        </svg>
      </span>
    </Component>
  );
}
