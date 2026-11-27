import type { CSSProperties } from "react";
import type { Metadata } from "next";
import "../studio/tailwind.css";

export const metadata: Metadata = {
  title: "ZeroCraft Studio — Sign in",
  description: "Sign in to the private ZeroCraft Studio workspace.",
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

export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body style={themeStyle} className="min-h-screen bg-[#0a0a0b] text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
