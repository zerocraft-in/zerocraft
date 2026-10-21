"use client";

import { useCallback, useEffect, useState } from "react";

export type StudioTable = {
  name: string;
  label: string;
  href: string;
  count: number | null;
  lastActivity: string | null;
  available: boolean;
  reason: string | null;
};
export type StudioOverview = {
  tables: StudioTable[];
  pendingOrders: number | null;
  pendingAppointments: number | null;
  commerce: {
    available: boolean;
    totalOrders: number | null;
    pendingOrders: number | null;
    fulfilledOrders: number | null;
    paidByCurrency: Record<string, number>;
  };
  featuredWork: {
    id: string;
    title: string;
    category: string;
    image_url: string;
    featured: boolean;
    created_at: string;
  } | null;
  featuredProjects: number | null;
  publishedBlogs: number | null;
  totalBlogs: number | null;
  recent: {
    id: string;
    title: string;
    detail: string;
    href: string;
    date: string;
  }[];
  checkedAt: string;
  workspaceProfile: { id: string; email: string; full_name: string; avatar_url: string | null; role: string } | null;
  lowStock: number | null;
  unreadNotifications: number | null;
  notifications: { id: string; title: string; message: string; type: string; category: string; read: boolean; link: string | null; created_at: string }[];
};

export function useStudioOverview() {
  const [data, setData] = useState<StudioOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/studio/overview", {
        cache: "no-store",
        signal,
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Studio data is unavailable.");
      if (signal?.aborted) return;
      setData(payload as StudioOverview);
      setError(null);
    } catch (cause) {
      if (signal?.aborted) return;
      setError(
        cause instanceof Error ? cause.message : "Studio data is unavailable.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    // Initial data loading is an external fetch subscription for this hook.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);
  return { data, loading, error, refresh };
}
