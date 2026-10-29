"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Route transition boundary for the CMS. The key makes each navigation a
 * fresh route instance while preserving the global shell in app/layout.tsx.
 */
export default function CmsTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} data-cms-template="true" className="contents">
      {children}
    </div>
  );
}
