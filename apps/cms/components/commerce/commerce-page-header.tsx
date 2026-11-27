import type { ReactNode } from "react";

import { cn } from "@zerocraft/lib/cn";

type CommercePageHeaderProps = {
  left: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Shared sticky header for Commerce workspace pages. */
export function CommercePageHeader({
  left,
  actions,
  className,
}: CommercePageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex min-h-14 items-center justify-between gap-4 border-b border-border/70 bg-background/95 px-4 py-2 max-md:flex-col max-md:items-start",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
        {left}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1.5 max-md:flex-wrap">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
