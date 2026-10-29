import type { ReactNode } from "react";
import { SettingsRouteFrame } from "./_components/settings-route-frame";

export default function SettingsLayout({
  children,
  overlay,
}: {
  children: ReactNode;
  overlay: ReactNode;
}) {
  return (
    <SettingsRouteFrame>
      {children}
      {overlay}
    </SettingsRouteFrame>
  );
}
