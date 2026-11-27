"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { StudioRail } from "./studio-rail";
import { useStudioAppearance } from "@/components/providers/studio-appearance-provider";
import { Toaster } from "@zerocraft/ui/components/toast";

const pageGradients = {
  overview: [[75, 0, 36], [20, 100, 18]],
  projects: [[82, 4, 38], [30, 100, 16]],
  inquiries: [[48, 32, 34], [90, 100, 16]],
  media: [[88, 84, 36], [26, 0, 18]],
  content: [[34, 0, 34], [92, 72, 18]],
  analytics: [[28, 0, 38], [88, 100, 18]],
  settings: [[20, 96, 30], [82, 0, 18]],
} as const;

const pageTitles = {
  overview: "Overview",
  projects: "Projects",
  inquiries: "Pipeline",
  media: "Media",
  content: "Content",
  analytics: "Analytics",
  settings: "Settings",
} as const;

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const { appearance } = useStudioAppearance();

  const showDotPattern =
    pathname.startsWith("/studio/inquiries") ||
    pathname.startsWith("/studio/projects");
  const pageKey = pathname.startsWith("/studio/projects")
    ? "projects"
    : pathname.startsWith("/studio/inquiries")
      ? "inquiries"
      : pathname.startsWith("/studio/media")
        ? "media"
        : pathname.startsWith("/studio/content")
          ? "content"
          : pathname.startsWith("/studio/analytics")
            ? "analytics"
            : pathname.startsWith("/studio/settings")
              ? "settings"
              : "overview";
  const pageGradient = pathname.startsWith("/studio/projects")
    ? pageGradients.projects
    : pathname.startsWith("/studio/inquiries")
      ? pageGradients.inquiries
      : pathname.startsWith("/studio/media")
        ? pageGradients.media
        : pathname.startsWith("/studio/content")
          ? pageGradients.content
          : pathname.startsWith("/studio/analytics")
            ? pageGradients.analytics
            : pathname.startsWith("/studio/settings")
              ? pageGradients.settings
      : pageGradients.overview;
  const backgroundImage = `radial-gradient(circle at ${pageGradient[0][0]}% ${pageGradient[0][1]}%, color-mix(in srgb, var(--brand-accent) ${pageGradient[0][2]}%, transparent), transparent 40%), radial-gradient(circle at ${pageGradient[1][0]}% ${pageGradient[1][1]}%, color-mix(in srgb, var(--brand-accent) ${pageGradient[1][2]}%, transparent), transparent 46%)`;

  useEffect(() => {
    const titlePrefix = appearance.name || "Zerocraft Studio";
    document.title = `${titlePrefix} — ${pageTitles[pageKey]}`;
  }, [pageKey, appearance.name]);

  return (
    <Toaster >
      <div className="relative flex min-h-screen overflow-x-clip bg-[var(--background)] text-foreground transition-colors duration-200">
      {/* Viewport-fixed background gradient layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-no-repeat transition-all duration-300"
        style={{ backgroundImage }}
      />
      {showDotPattern && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-70"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(0,0,0,.45)_100%)] opacity-50 dark:opacity-80"
          />
        </>
      )}
      {/* Top-right ambient accent glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-32 -top-40 size-[720px] rounded-full bg-[radial-gradient(circle_at_40%_40%,var(--brand-accent),transparent_72%)] opacity-25 blur-[100px] transition-all duration-300"
      />
      {/* Bottom ambient accent glow spanning the full width eliminating any bottom void */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 -bottom-24 h-[440px] bg-[radial-gradient(ellipse_100%_75%_at_50%_100%,color-mix(in_srgb,var(--brand-accent)_18%,transparent),transparent_75%)] opacity-70 blur-3xl transition-all duration-500"
      />
      {/* Bottom-left ambient accent glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-32 -bottom-40 size-[620px] rounded-full bg-[radial-gradient(circle_at_50%_50%,var(--brand-accent),transparent_72%)] opacity-20 blur-[100px] transition-all duration-300"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20 bg-[url('/noise.svg')] opacity-15 mix-blend-overlay"
      />
      <StudioRail />
      <main className="relative z-10 min-h-screen min-w-0 flex-1 px-8 pb-16 max-md:px-4 max-md:pb-12">
        {children}
      </main>
      </div>
    </Toaster>
  );
}
