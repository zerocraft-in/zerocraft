import type { ReactNode } from "react";

/**
 * Canonical Store workspace boundary.
 * The authenticated CMS shell is provided by the root layout; this nested
 * layout keeps Store routes isolated from Studio route composition.
 */
export default function StoreWorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <section data-workspace="store" data-workspace-kind="commerce">
      {children}
    </section>
  );
}
