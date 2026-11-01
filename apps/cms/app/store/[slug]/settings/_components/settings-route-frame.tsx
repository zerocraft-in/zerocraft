import type { ReactNode } from "react";

export function SettingsRouteFrame({ children }: { children: ReactNode }) {
  return <section data-settings-route="true">{children}</section>;
}
