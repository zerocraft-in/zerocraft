"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getAdminNavigationForFeatures,
  getAdminNavigationForRole,
  getAdminRouteFeature,
  getAdminRoutePermission,
} from "@/lib/admin-navigation";
import { STUDIO_FEATURES, type StudioFeatureKey } from "@/lib/studio-features";

export function useStudioAccess(role: string) {
  const pathname = usePathname();
  const router = useRouter();
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [features, setFeatures] = useState<Record<StudioFeatureKey, boolean>>(
    () => Object.fromEntries(STUDIO_FEATURES.map((feature) => [feature.key, feature.enabled])) as Record<StudioFeatureKey, boolean>,
  );

  const navigation = useMemo(() => getAdminNavigationForFeatures(
    getAdminNavigationForRole(role, permissions),
    new Set(Object.entries(features).filter(([, enabled]) => enabled).map(([key]) => key as StudioFeatureKey)),
  ), [role, permissions, features]);

  useEffect(() => {
    let active = true;
    const onFeatureChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; enabled?: boolean }>).detail;
      if (!detail?.key || typeof detail.enabled !== "boolean") return;
      setFeatures((value) => ({ ...value, [detail.key as StudioFeatureKey]: detail.enabled }));
    };
    window.addEventListener("studio-feature-change", onFeatureChange);
    void fetch("/api/studio/me", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json();
      if (active && Array.isArray(payload.permissions)) setPermissions(payload.permissions);
    }).catch(() => undefined);
    void fetch("/api/studio/features", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as { features?: Array<{ feature_key: StudioFeatureKey; enabled: boolean }> };
      if (active && Array.isArray(payload.features)) setFeatures((value) => ({ ...value, ...Object.fromEntries(payload.features!.map((feature) => [feature.feature_key, feature.enabled])) }));
    }).catch(() => undefined);
    return () => { active = false; window.removeEventListener("studio-feature-change", onFeatureChange); };
  }, []);

  useEffect(() => {
    if (!permissions) return;
    const required = getAdminRoutePermission(pathname);
    if (required && !permissions.includes(required)) router.replace("/");
    const feature = getAdminRouteFeature(pathname);
    if (feature && features[feature] === false) router.replace("/");
  }, [pathname, permissions, features, router]);

  return { features, navigation };
}
