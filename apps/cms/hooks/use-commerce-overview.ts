"use client";

import { useCallback, useEffect, useState } from "react";

export type CommerceTable = {
  name: string;
  label: string;
  href: string;
  count: number | null;
  lastActivity: string | null;
  available: boolean;
  reason: string | null;
};
export type CommerceOverview = {
  tables: CommerceTable[];
  pendingOrders: number | null;
  commerce: {
    available: boolean;
    totalOrders: number | null;
    pendingOrders: number | null;
    fulfilledOrders: number | null;
    paidByCurrency: Record<string, number>;
  };
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

export function useCommerceOverview() {
  const [data, setData] = useState<CommerceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/overview", {
        cache: "no-store",
        signal,
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Commerce data is unavailable.");
      if (signal?.aborted) return;
      setData(payload as CommerceOverview);
      setError(null);
    } catch (cause) {
      if (signal?.aborted) return;
      setError(
        cause instanceof Error && cause.message !== "Failed to fetch"
          ? cause.message
          : "Commerce data could not be loaded. Check your connection and try again.",
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


