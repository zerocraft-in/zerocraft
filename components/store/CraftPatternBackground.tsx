import type { ReactNode } from "react";

export default function CraftPatternBackground({ children }: { children: ReactNode }) {
  return <div className="craft-pattern-background">{children}</div>;
}
