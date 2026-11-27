"use client";

import Link from "next/link";
import {
  BarChart3,
  FileImage,
  FolderKanban,
  LayoutDashboard,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@zerocraft/ui/cn";
import { usePathname } from "next/navigation";
import { useStudioAppearance } from "@/components/providers/studio-appearance-provider";

const rail = [
  { href: "/studio", label: "Overview", icon: LayoutDashboard },
  { href: "/studio/projects", label: "Projects", icon: FolderKanban },
  { href: "/studio/inquiries", label: "Pipeline", icon: Users },
  { href: "/studio/media", label: "Media", icon: FileImage },
  { href: "/studio/content", label: "Content", icon: Megaphone },
  { href: "/studio/analytics", label: "Analytics", icon: BarChart3 },
];

const iconButton =
  "grid size-11 place-items-center rounded-2xl text-zinc-400 transition-colors hover:bg-white/[.08] hover:text-white";

export function StudioRail() {
  const pathname = usePathname();
  const { appearance } = useStudioAppearance();

  return (
    <nav
      className="fixed inset-y-0 left-0 z-30 flex h-screen w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-transparent px-0 py-5"
      aria-label="Studio sections"
    >
      <Link
        href="/studio"
        aria-label={`${appearance.name || "ZeroCraft Studio"} overview`}
        className="mb-3 grid size-11 place-items-center overflow-hidden rounded-2xl bg-white text-sm font-bold text-black shadow-sm transition-transform active:scale-95"
      >
        {appearance.logoUrl ? (
          <img
            src={appearance.logoUrl}
            alt=""
            className="size-full object-contain p-1"
          />
        ) : (
          <svg
            id="Layer_1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="size-8 fill-current"
          >
            <path
              d="M5.16.43c4.97,7.25,9.93,8.51,14.9,3.78,1.09,1.24,1.94,2.48,2.53,3.71-2.41,3.97-7.69,4.08-11.59,6.41,4.15-.64,8.18-.19,12.08,1.37-.44,1.21-1.13,2.42-2.07,3.63-5.6-5.34-11.2-3.92-16.8,4.26-1.48-1.89-2.57-3.78-3.3-5.67,2.87-6.36,8.78-7.1,12.63-8.59-3.92-.16-7.97-1.26-12.14-3.32.88-1.86,2.13-3.72,3.76-5.58h0Z"
            />
          </svg>
        )}
      </Link>
      {rail.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/studio"
            ? pathname === "/studio"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              iconButton,
              active && "bg-white text-black hover:bg-white hover:text-black",
            )}
          >
            <Icon size={21} strokeWidth={1.5} />
          </Link>
        );
      })}
      <div className="flex-1" />
      <Link
        href="/studio/settings"
        aria-label="Settings"
        aria-current={
          pathname.startsWith("/studio/settings") ? "page" : undefined
        }
        className={cn(
          iconButton,
          pathname.startsWith("/studio/settings") &&
            "bg-white text-black hover:bg-white hover:text-black",
        )}
      >
        <Settings size={21} strokeWidth={1.5} />
      </Link>
    </nav>
  );
}
