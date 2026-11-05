"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { StudioRail } from "./studio-rail";

const pageGradients = {
  overview:
    "bg-[radial-gradient(circle_at_75%_0%,rgba(255,106,43,.36),transparent_38%),radial-gradient(circle_at_20%_100%,rgba(120,35,25,.18),transparent_42%)]",
  projects:
    "bg-[radial-gradient(circle_at_82%_4%,rgba(255,106,43,.38),transparent_38%),radial-gradient(circle_at_30%_100%,rgba(120,35,25,.16),transparent_45%)]",
  inquiries:
    "bg-[radial-gradient(circle_at_48%_32%,rgba(255,106,43,.34),transparent_36%),radial-gradient(circle_at_90%_100%,rgba(120,35,25,.16),transparent_45%)]",
  media:
    "bg-[radial-gradient(circle_at_88%_84%,rgba(255,106,43,.36),transparent_38%),radial-gradient(circle_at_26%_0%,rgba(120,35,25,.18),transparent_42%)]",
  content:
    "bg-[radial-gradient(circle_at_34%_0%,rgba(255,106,43,.34),transparent_38%),radial-gradient(circle_at_92%_72%,rgba(120,35,25,.18),transparent_44%)]",
  analytics:
    "bg-[radial-gradient(circle_at_28%_0%,rgba(255,106,43,.38),transparent_38%),radial-gradient(circle_at_88%_100%,rgba(120,35,25,.18),transparent_46%)]",
  settings:
    "bg-[radial-gradient(circle_at_20%_96%,rgba(255,106,43,.3),transparent_40%),radial-gradient(circle_at_82%_0%,rgba(120,35,25,.18),transparent_44%)]",
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

  useEffect(() => {
    document.title = `Zerocraft Studio — ${pageTitles[pageKey]}`;
  }, [pageKey]);

  return (
    <div
      className={`relative flex min-h-screen overflow-x-clip bg-[#080809] bg-cover bg-no-repeat ${pageGradient}`}
    >
      {showDotPattern && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(rgba(255,255,255,.2)_1px,transparent_1px)] bg-[size:24px_24px] opacity-70"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(5,5,6,.78)_100%)]"
          />
        </>
      )}
      {/* Background gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 size-[680px] rounded-full bg-[radial-gradient(circle_at_40%_40%,#ff6a2b,#b3261e_55%,transparent_72%)] opacity-40 blur-[80px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20 bg-[url('/noise.svg')] opacity-20 mix-blend-screen"
      />
      <StudioRail />
      <main className="relative z-10  min-h-screen min-w-0 flex-1 px-8 max-md:px-4">
        {children}
      </main>
    </div>
  );
}
