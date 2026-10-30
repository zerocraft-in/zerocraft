import type { ReactNode } from "react";

/**
 * Canonical Studio workspace boundary.
 * The authenticated CMS shell is provided by the root layout; this nested
 * layout gives Studio routes a stable semantic and styling boundary.
 */
export default function StudioWorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <section data-workspace="studio" data-workspace-kind="service-business">
      {children}
    </section>
  );
}
