"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import CommerceShell from "@/components/layout/commerce-shell";
import { unscopedPath } from "@/lib/platform/scope";

export function CmsFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [platformUser, setPlatformUser] = useState<{ id: string; email: string | null; displayName: string | null } | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (pathname?.startsWith('/accounts') || pathname?.startsWith('/stores') || pathname?.startsWith('/owner')) {
      setPlatformUser(null);
      setProfileRole(null);
      return () => { active = false; };
    }
    void fetch("/api/admin/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active) return;
        setPlatformUser(payload?.user || null);
        setProfileRole(payload?.role || null);
        if (payload?.user?.id) {
          void fetch("/api/admin/sessions", { cache: "no-store" })
            .then((sessions) => {
              if (sessions.status === 401 && active) window.location.assign("/login");
            })
            .catch(() => undefined);
        }
      })
      .catch(() => { if (active) { setPlatformUser(null); setProfileRole(null); } });
    return () => { active = false; };
  }, [pathname]);

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
    platformUser?.displayName ||
    platformUser?.email?.split("@")[0] ||
    "Signed-in user";

  return (
    <CommerceShell
      user={{
        name: displayName,
        email: platformUser?.email || "Signed-in account",
        role: profileRole || "operator",
      }}
    >
      {children}
    </CommerceShell>
  );
}
