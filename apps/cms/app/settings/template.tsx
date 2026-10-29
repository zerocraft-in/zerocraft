"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function SettingsTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} data-settings-template="true" className="contents">
      {children}
    </div>
  );
}
