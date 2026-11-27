"use client";

import type { ReactNode } from "react";

/** Shared composition boundary for the CMS shell. Feature-specific shell state remains in app/studio-shell.tsx during the migration. */
export function CmsShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
