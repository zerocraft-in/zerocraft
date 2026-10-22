"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";

export type AppearanceMode = "light" | "dark" | "system";

const STORAGE_KEY = "zerocraft-cms-appearance-v2";
const CHANGE_EVENT = "zerocraft-cms-appearance-change";

function getSystemDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function getStoredAppearance(): AppearanceMode {
  if (typeof window === "undefined") return "system";
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return saved?.mode === "light" || saved?.mode === "dark" || saved?.mode === "system" ? saved.mode : "system";
  } catch {
    return "system";
  }
}

export function applyAppearance(mode: AppearanceMode) {
  const dark = mode === "dark" || (mode === "system" && getSystemDark());
  const root = document.getElementById("zerocraft-cms");
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  if (root) {
    root.classList.toggle("dark", dark);
    root.dataset.appearance = mode;
    root.dataset.theme = dark ? "dark" : "light";
    root.dataset.font = "inter";
  }
}

export function setAppearance(mode: AppearanceMode) {
  applyAppearance(mode);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode }));
  } catch {
    // Theme remains active for the current session if storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: mode }));
}

export function StudioAppearance({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyAppearance(getStoredAppearance());
    const onAppearanceChange = (event: Event) => {
      const mode = (event as CustomEvent<AppearanceMode>).detail;
      if (mode === "light" || mode === "dark" || mode === "system") applyAppearance(mode);
    };
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getStoredAppearance() === "system") applyAppearance("system");
    };
    window.addEventListener(CHANGE_EVENT, onAppearanceChange);
    media?.addEventListener?.("change", onSystemChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onAppearanceChange);
      media?.removeEventListener?.("change", onSystemChange);
    };
  }, []);

  return children;
}

const modes: Array<{ mode: AppearanceMode; label: string; description: string; icon: typeof IconSun }> = [
  { mode: "light", label: "Light", description: "Bright and focused", icon: IconSun },
  { mode: "dark", label: "Dark", description: "Low-light workspace", icon: IconMoon },
  { mode: "system", label: "System", description: "Follow your device", icon: IconDeviceDesktop },
];

export function AppearanceSettings() {
  const [mode, setMode] = useState<AppearanceMode>("system");

  useEffect(() => {
    setMode(getStoredAppearance());
  }, []);

  function choose(nextMode: AppearanceMode) {
    setMode(nextMode);
    setAppearance(nextMode);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Appearance mode">
      {modes.map(({ mode: itemMode, label, description, icon: Icon }) => {
        const selected = mode === itemMode;
        return (
          <button
            key={itemMode}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => choose(itemMode)}
            className={`group relative rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-foreground bg-muted shadow-sm" : "border-border bg-card hover:border-foreground/30 hover:bg-muted/50"}`}
          >
            <span className={`grid size-10 place-items-center rounded-xl ${selected ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
              <Icon className="size-5" />
            </span>
            <span className="mt-3 block text-sm font-semibold">{label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
            {selected && <IconCheck className="absolute right-3 top-3 size-4" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
