"use client";

import type { ReactNode } from "react";

export function CmsHeader({ children }: { children?: ReactNode }) {
  return <header className="flex min-h-12 items-center gap-2">{children}</header>;
}
