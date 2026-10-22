import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./apps/cms/app/**/*.{ts,tsx}",
    "./apps/cms/components/**/*.{ts,tsx}",
    "./apps/cms/src/**/*.{ts,tsx}",
    "./packages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "20px",
        sm: "20px",
        md: "32px",
        lg: "48px",
        xl: "48px",
        "2xl": "48px",
      },
      screens: {
        "2xl": "1600px",
      },
    },
    extend: {
      fontFamily: {
        primary: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        /* Zerocraft design tokens */
        zc: {
          bg: "var(--zc-bg)",
          text: "var(--zc-text)",
          muted: "var(--zc-text-muted)",
          border: "var(--zc-border)",
          accent: "var(--zc-accent)",
          surface: "var(--zc-surface)",
          "surface-hover": "var(--zc-surface-hover)",
        },
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      fontSize: {
        "display-xl": [
          "clamp(3.5rem, 8vw + 1rem, 9rem)",
          { lineHeight: "0.95", letterSpacing: "-0.03em", fontWeight: "700" },
        ],
        "display-lg": [
          "clamp(2.5rem, 5vw + 1rem, 6rem)",
          { lineHeight: "1", letterSpacing: "-0.025em", fontWeight: "600" },
        ],
        "display-md": [
          "clamp(2rem, 4vw + 0.5rem, 4rem)",
          { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        "display-sm": [
          "clamp(1.5rem, 3vw + 0.25rem, 2.5rem)",
          { lineHeight: "1.15", letterSpacing: "-0.015em", fontWeight: "500" },
        ],
        label: [
          "0.6875rem",
          { lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "500" },
        ],
      },
      spacing: {
        "section-y": "clamp(6rem, 10vw, 10rem)",
        "section-y-sm": "clamp(4rem, 6vw, 6rem)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-circ": "cubic-bezier(0, 0.55, 0.45, 1)",
        "in-out-smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        "400": "400ms",
        "500": "500ms",
        "800": "800ms",
        "1200": "1200ms",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "marquee": "marquee 30s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
