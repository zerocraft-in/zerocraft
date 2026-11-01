"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import CommerceShell from "@/components/layout/commerce-shell";
import { unscopedPath } from "@/lib/platform/scope";

export function CmsFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const [profileRole, setProfileRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user || pathname?.startsWith('/accounts') || pathname?.startsWith('/stores') || pathname?.startsWith('/owner')) {
      setProfileRole(null);
      return () => { active = false; };
    }
    void fetch("/api/admin/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active) setProfileRole(payload?.role || null); })
      .catch(() => { if (active) setProfileRole(null); });
    void fetch("/api/admin/sessions", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          await createClient().auth.signOut();
          if (active) window.location.assign("/login");
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [user?.id, pathname]);

  // Keep the authenticated shell mounted during the first client pass. A
  // transient null pathname must not make the store dashboard render as a
  // standalone page and then lose the global Shopify-style navigation.
  const resolvedPathname = pathname || "/store";
  if (resolvedPathname.startsWith('/accounts') || resolvedPathname.startsWith('/stores') || resolvedPathname.startsWith('/owner')) return children;
  if (resolvedPathname === "/" || resolvedPathname === "/login") return children;
  const routePath = unscopedPath(resolvedPathname);
  const isCategoryEditor = routePath === "/store/categories/new" || (routePath === "/store/categories" && (searchParams.has("id") || searchParams.has("categoryid")));
  const isProductEditor = routePath === "/products/new" || /^\/products\/[^/]+$/.test(routePath) || routePath === "/store/products/new" || /^\/store\/products\/[^/]+$/.test(routePath);
  if (isCategoryEditor || isProductEditor) return children;

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Commerce";

  return (
    <CommerceShell
      user={{
        name: displayName,
        email: user?.email || "Commerce workspace",
        role: profileRole || user?.user_metadata?.role || "operator",
      }}
    >
      {children}
    </CommerceShell>
  );
}
