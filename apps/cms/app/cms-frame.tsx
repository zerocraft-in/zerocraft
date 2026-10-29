"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import StudioShell from "./studio-shell";

export function CmsFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const [profileRole, setProfileRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setProfileRole(null);
      return () => { active = false; };
    }
    void fetch("/api/studio/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active) setProfileRole(payload?.role || null); })
      .catch(() => { if (active) setProfileRole(null); });
    void fetch("/api/studio/sessions", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          await createClient().auth.signOut();
          if (active) window.location.assign("/login");
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [user?.id]);

  if (pathname === "/login") return children;
  const isCategoryEditor = pathname === "/store/categories/new" || (pathname === "/store/categories" && (searchParams.has("id") || searchParams.has("categoryid")));
  const isProductEditor = pathname === "/products/new" || /^\/products\/[^/]+$/.test(pathname) || pathname === "/store/products/new" || /^\/store\/products\/[^/]+$/.test(pathname);
  if (isCategoryEditor || isProductEditor) return children;

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
        role: profileRole || user?.user_metadata?.role || "operator",
      }}
    >
      {children}
    </StudioShell>
  );
}
