import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudioRail } from "./studio-rail";
import "./tailwind.css";
import { DashboardLayout } from "./studio-layout";
import { createStudioSupabaseServerClient } from "@/lib/studio-supabase-server";

export const metadata: Metadata = {
  title: "Zerocraft Studio — Overview",
  description: "Zerocraft agency operations workspace.",
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
  return <StudioAuthGate>{children}</StudioAuthGate>;
}

async function StudioAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createStudioSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/studio");
  const { data: isMember, error: membershipError } = await supabase.rpc("is_member");
  if (membershipError || isMember !== true) {
    redirect("/sign-in?error=Studio%20access%20requires%20an%20active%20workspace%20membership.");
  }

  return (
    <html lang="en" className="dark">
      <body
        style={themeStyle}
        className="min-h-screen bg-transparent text-foreground antialiased selection:bg-orange-300 selection:text-black"
      >
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
