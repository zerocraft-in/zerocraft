"use client";

import { IconSearch } from "@tabler/icons-react";

export function SettingsSearch() {
  return (
    <button
      type="button"
      className="flex min-h-9 w-full items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))}
      aria-label="Search Commerce pages"
    >
      <IconSearch size={14} aria-hidden="true" />
      <span>Search</span>
      <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
    </button>
  );
}
