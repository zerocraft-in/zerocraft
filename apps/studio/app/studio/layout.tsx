import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { StudioRail } from "./studio-rail";
import "./tailwind.css";

export const metadata: Metadata = {
  title: "ZeroCraft Studio — Overview",
  description: "ZeroCraft agency operations workspace.",
};
const themeStyle = {
  "--background": "#0a0a0b",
  "--foreground": "#f4f4f5",
  "--card": "rgba(255,255,255,.06)",
  "--card-foreground": "#f4f4f5",
  "--popover": "#202024",
  "--popover-foreground": "#f4f4f5",
  "--primary": "#ffffff",
  "--primary-foreground": "#0a0a0b",
  "--secondary": "rgba(255,255,255,.08)",
  "--secondary-foreground": "#f4f4f5",
  "--muted": "rgba(255,255,255,.07)",
  "--muted-foreground": "#a8a8b0",
  "--accent": "rgba(255,255,255,.08)",
  "--accent-foreground": "#ffffff",
  "--destructive": "#ff6a2b",
  "--border": "rgba(255,255,255,.1)",
  "--input": "rgba(255,255,255,.14)",
  "--ring": "#ffb089",
} as CSSProperties;
export default function StudioRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        style={themeStyle}
        className="min-h-screen bg-transparent text-foreground antialiased selection:bg-orange-300 selection:text-black"
      >
        <div className="relative flex min-h-screen overflow-hidden bg-[#080809]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-40 size-[680px] rounded-full bg-[radial-gradient(circle_at_40%_40%,#ff6a2b,#b3261e_55%,transparent_72%)] opacity-40 blur-[80px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-20 bg-[url('/noise.svg')] opacity-[.035] mix-blend-screen"
          />
          <StudioRail />
          <main className="relative z-10  min-h-screen min-w-0 flex-1 px-8 max-md:px-4">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
