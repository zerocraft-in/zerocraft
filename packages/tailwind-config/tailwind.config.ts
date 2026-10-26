import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Anton", "Impact", "sans-serif"],
        sans: ["Archivo", "Arial", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      spacing: {
        "section-y": "clamp(3.5rem, 8vw, 7rem)",
        "store-content": "var(--store-content-width)",
      },
      transitionTimingFunction: {
        "crt": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        "crt-fast": "180ms",
        "crt-slow": "700ms",
      },
      keyframes: {
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      },
      animation: {
        marquee: "marquee 28s linear infinite",
      },
    },
  },
};
export default config;
