"use client";

import { useEffect } from "react";
import { IconMoon } from "@tabler/icons-react";

function applyDarkTheme() {
  const root = document.getElementById("zerocraft-cms");
  document.documentElement.classList.add("dark");
  document.documentElement.dataset.theme = "dark";
  if (root) {
    root.classList.add("dark");
    root.dataset.appearance = "dark";
    root.dataset.theme = "dark";
    root.dataset.font = "inter";
  }
}

export function StudioAppearance({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyDarkTheme();
    try {
      localStorage.setItem(
        "zerocraft-cms-appearance-v2",
        JSON.stringify({ mode: "dark" }),
      );
    } catch {
      // The dark theme still applies when storage is unavailable.
    }
  }, []);
  return children;
}

export function AppearanceSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 rounded-xl border bg-card p-5 text-card-foreground">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <IconMoon className="size-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold">Dark workspace</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            ZeroCraft CMS uses a consistent dark theme across navigation,
            forms, data tables, dialogs, and reports.
          </p>
        </div>
      </div>
    </div>
  );
}
