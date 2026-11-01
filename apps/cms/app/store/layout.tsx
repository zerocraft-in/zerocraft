import type { ReactNode } from "react";

/**
 * Canonical Commerce workspace boundary for /store/*.
 * CmsFrame provides the Shopify-style CommerceShell; this boundary labels the
 * workspace without adding a second navigation shell.
 */
export default function StoreWorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <section data-workspace="store" data-workspace-kind="commerce">
      {children}
    </section>
  );
}
