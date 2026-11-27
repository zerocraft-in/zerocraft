import type { ReactNode } from "react";

/** Store switcher boundary, intentionally separate from the Commerce workspace. */
export default function StoresLayout({ children }: { children: ReactNode }) {
  return (
    <section data-workspace="store-switcher" data-workspace-kind="platform">
      {children}
    </section>
  );
}
