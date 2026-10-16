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
};

export function useStudioOverview() {
  const [data, setData] = useState<StudioOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/studio/overview", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Studio data is unavailable.");
      setData(payload as StudioOverview);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Studio data is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);
  return { data, loading, error, refresh };
}
