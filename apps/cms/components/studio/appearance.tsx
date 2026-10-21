"use client";

import { useEffect } from "react";
import { IconSun } from "@tabler/icons-react";

function applyLightTheme() {
  const root = document.getElementById("zerocraft-cms");
  document.documentElement.classList.remove("dark");
  document.documentElement.dataset.theme = "light";
  if (root) {
    root.classList.remove("dark");
    root.dataset.appearance = "light";
    root.dataset.theme = "light";
    root.dataset.font = "inter";
  }
}

export function StudioAppearance({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyLightTheme();
    try {
      localStorage.setItem(
        "zerocraft-cms-appearance-v2",
        JSON.stringify({ mode: "light" }),
      );
    } catch {
      // The light theme still applies when storage is unavailable.
    }
  }, []);
  return children;
}

export function AppearanceSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 rounded-xl border bg-card p-5 text-card-foreground">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <IconSun className="size-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold">Light workspace</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            ZeroCraft CMS uses a calm, high-contrast light theme across navigation,
            forms, data tables, dialogs, and reports.
          </p>
        </div>
      </div>
    </div>
  );
}
