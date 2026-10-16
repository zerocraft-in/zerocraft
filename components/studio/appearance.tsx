"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";

type Preferences = {
  mode: "light" | "dark" | "system";
};
const defaults: Preferences = { mode: "light" };
const AppearanceContext = createContext({
  ...defaults,
  update: (_next: Partial<Preferences>) => {},
});
const key = "zerocraft-studio-appearance";

export function StudioAppearance({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(defaults);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    let current = defaults;
    const apply = () => {
      const root = document.getElementById("zerocraft-cms");
      if (!root) return;
      const dark =
        current.mode === "dark" || (current.mode === "system" && media.matches);
      root.dataset.appearance = dark ? "dark" : "light";
      root.dataset.theme = dark ? "dark" : "light";
      root.dataset.font = "inter";
      root.classList.toggle("dark", dark);
    };
    const read = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "{}");
        current = {
          mode: ["light", "dark", "system"].includes(saved.mode)
            ? saved.mode
            : "light",
        };
      } catch {
        current = defaults;
      }
      setPreferences(current);
      apply();
    };
    read();
    media.addEventListener("change", apply);
    window.addEventListener("storage", read);
    window.addEventListener("studio-appearance", read);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("storage", read);
      window.removeEventListener("studio-appearance", read);
    };
  }, []);
  function update(next: Partial<Preferences>) {
    const value = { ...preferences, ...next };
    setPreferences(value);
    // Preferences still apply for this visit when storage is unavailable.
    const root = document.getElementById("zerocraft-cms");
    if (root) {
      const dark =
        value.mode === "dark" ||
        (value.mode === "system" &&
          matchMedia("(prefers-color-scheme: dark)").matches);
      root.dataset.appearance = dark ? "dark" : "light";
      root.dataset.theme = dark ? "dark" : "light";
      root.dataset.font = "inter";
      root.classList.toggle("dark", dark);
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new Event("studio-appearance"));
    } catch {
      /* session-only preference */
    }
  }
  return (
    <AppearanceContext.Provider value={{ ...preferences, update }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function AppearanceSettings() {
  const { mode, update } = useContext(AppearanceContext);
  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Color mode</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              { value: "light", label: "Light", icon: IconSun },
              { value: "dark", label: "Dark", icon: IconMoon },
              { value: "system", label: "System", icon: IconDeviceDesktop },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className="group flex cursor-pointer flex-col gap-3 rounded-lg border bg-card p-3 text-card-foreground transition-colors hover:bg-accent has-[:checked]:border-ring has-[:checked]:ring-1 has-[:checked]:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="appearance"
                className="sr-only"
                checked={mode === value}
                onChange={() => update({ mode: value })}
              />
              <span className={`grid h-20 grid-cols-[24px_1fr] gap-2 rounded-md border bg-muted p-2 ${value === "dark" ? "bg-zinc-950" : ""}`}>
                <span className={`rounded-sm ${value === "dark" ? "bg-zinc-800" : "bg-background"}`} />
                <span className="space-y-2">
                  <span className={`block h-2 rounded-sm ${value === "dark" ? "bg-zinc-700" : "bg-zinc-300"}`} />
                  <span className={`block h-2 w-3/4 rounded-sm ${value === "dark" ? "bg-zinc-700" : "bg-zinc-300"}`} />
                  <span className={`block h-6 rounded-sm ${value === "dark" ? "bg-zinc-800" : "bg-background"}`} />
                </span>
              </span>
              <span className="flex items-center gap-2 text-sm font-medium">
                <Icon size={17} />
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="rounded-lg border bg-card p-4 text-card-foreground">
        <p className="text-xs text-muted-foreground">INTER · REGULAR 400 · MEDIUM 500 · SEMIBOLD 600</p>
        <h3 className="mt-2 text-base font-semibold tracking-tight">A clear, consistent reading rhythm.</h3>
        <p className="mt-1 text-sm text-muted-foreground">Inter is used throughout the site, from navigation and forms to headings and data tables.</p>
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        {mode === "system"
          ? "Following your device appearance."
          : `${mode === "dark" ? "Dark" : "Light"} appearance selected.`}{" "}
        Changes apply immediately.
      </p>
    </div>
  );
}
