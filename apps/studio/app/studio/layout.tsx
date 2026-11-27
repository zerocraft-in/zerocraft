import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "./tailwind.css";
import { DashboardLayout } from "./studio-layout";
import { createStudioSupabaseServerClient } from "@/lib/studio-supabase-server";
import { getPublicAppearance } from "@/lib/public-appearance";
import {
  type PublicAppearance,
  GOOGLE_FONTS_URL,
  getFontFamilyStack,
  computeAppearanceTokens,
} from "@/lib/studio-appearance";
import { StudioAppearanceProvider } from "@/components/providers/studio-appearance-provider";

export const metadata: Metadata = {
  title: "Zerocraft Studio — Overview",
  description: "Zerocraft agency operations workspace.",
};

function themeStyle(appearance: PublicAppearance): CSSProperties {
  const dark = appearance.themeMode !== "light";
  const tokens = computeAppearanceTokens(appearance, dark);
  const styleObj: Record<string, string> = {
    fontFamily: getFontFamilyStack(appearance.fontFamily),
    colorScheme: dark ? "dark" : "light",
  };
  for (const [key, value] of Object.entries(tokens)) {
    if (key !== "font-family" && key !== "color-scheme") {
      styleObj[key] = value;
    }
  }
  return styleObj as CSSProperties;
}

export default function StudioRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudioAuthGate>{children}</StudioAuthGate>;
}

async function StudioAuthGate({ children }: { children: React.ReactNode }) {
  const supabase = await createStudioSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/studio");
  const { data: isMember, error: membershipError } =
    await supabase.rpc("is_member");
  if (membershipError || isMember !== true) {
    redirect(
      "/sign-in?error=Studio%20access%20requires%20an%20active%20workspace%20membership.",
    );
  }
  const appearance = await getPublicAppearance();
  const isDark = appearance.themeMode !== "light";

  return (
    <html
      lang="en"
      className={isDark ? "dark min-h-screen" : "min-h-screen"}
      data-studio-theme={appearance.themeMode === "light" ? "light" : "dark"}
      style={{
        backgroundColor: isDark ? "#0a0a0b" : "#f8fafc",
        colorScheme: isDark ? "dark" : "light",
      }}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      </head>
      <body
        style={themeStyle(appearance)}
        data-studio-root="true"
        data-workspace-name={appearance.name}
        className="min-h-screen bg-[var(--background)] text-foreground antialiased selection:bg-orange-300 selection:text-black"
      >
        <StudioAppearanceProvider initialAppearance={appearance}>
          <DashboardLayout>{children}</DashboardLayout>
        </StudioAppearanceProvider>
      </body>
    </html>
  );
}
