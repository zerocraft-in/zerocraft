import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SettingsRouteFrame } from "./_components/settings-route-frame";

export const metadata: Metadata = {
  title: {
    default: "Settings",
    template: "%s · Settings | Zerocraft Commerce",
  },
  description: "Manage store settings, users, payments, shipping, and permissions.",
  robots: { index: false, follow: false },
};

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
