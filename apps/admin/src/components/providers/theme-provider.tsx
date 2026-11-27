"use client";

import * as React from "react";
import { useEffect, useState, useCallback, createContext, useContext } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: "class" | "data-attribute";
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  const resolvedTheme = React.useMemo(() => {
    if (theme !== "system") {
      return theme;
    }
    if (enableSystem && typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }, [theme, enableSystem]);

  useEffect(() => {
    if (attribute !== "class") {
      return;
    }
    const html = document.documentElement;
    html.classList.toggle("dark", resolvedTheme === "dark");
    html.classList.toggle("light", resolvedTheme === "light");
  }, [resolvedTheme, attribute]);

  const setThemeValue = useCallback(
    (next: Theme) => {
      setTheme(next);
      if (typeof window !== "undefined" && attribute === "class") {
        const html = document.documentElement;
        if (next === "system") {
          const isDark = window.matchMedia("(prefers-color-scheme: dark)")
            .matches;
          html.classList.toggle("dark", isDark);
          html.classList.toggle("light", !isDark);
        } else {
          html.classList.toggle("dark", next === "dark");
          html.classList.toggle("light", next === "light");
        }
      }
    },
    [attribute],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeValue }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
