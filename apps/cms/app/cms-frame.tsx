"use client";

import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import StudioShell from "./studio-shell";

export function CmsFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  if (pathname === "/login") return children;

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Studio";

  return (
    <StudioShell
      user={{
        name: displayName,
        email: user?.email || "Studio workspace",
        role: user?.user_metadata?.role || "operator",
      }}
    >
      {children}
    </StudioShell>
  );
}
