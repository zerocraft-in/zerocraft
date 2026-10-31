"use client";

import { useCallback, useEffect, useState } from "react";
import {
  supabase,
  type StudioNotification,
  fetchNotificationsFromSupabase,
  markAllNotificationsAsReadInSupabase,
  markNotificationAsReadInSupabase,
  clearReadNotificationsInSupabase,
} from "@/lib/supabase-client";

export function useStudioNotifications(onNavigate: (href: string) => void) {
  const [notices, setNotices] = useState<StudioNotification[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [notificationsRealtime, setNotificationsRealtime] = useState<"connecting" | "connected" | "offline">("connecting");
  const loadNotifications = useCallback(async () => {
    setNoticesLoading(true);
    try { setNotices(await fetchNotificationsFromSupabase()); }
    catch (error) { console.error("Could not load notifications", error); }
    finally { setNoticesLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    const refreshTimer = window.setInterval(() => void loadNotifications(), 60_000);
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      channel = supabase.channel(`studio-notices:${data.user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${data.user.id}` }, () => void loadNotifications()).subscribe((status) => {
        if (!active) return;
        setNotificationsRealtime(status === "SUBSCRIBED" ? "connected" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "offline" : "connecting");
      });
    });
    return () => { active = false; window.clearTimeout(initialLoad); window.clearInterval(refreshTimer); if (channel) void supabase.removeChannel(channel); };
  }, [loadNotifications]);
  const readNotice = useCallback(async (item: StudioNotification) => {
    try { await markNotificationAsReadInSupabase(item.id); setNotices((current) => current.map((notice) => notice.id === item.id ? { ...notice, read: true } : notice)); if (item.link?.startsWith("/")) onNavigate(item.link); }
    catch (error) { console.error("Could not mark notification as read", error); }
  }, [onNavigate]);
  const markAllNoticesRead = useCallback(async () => { try { await markAllNotificationsAsReadInSupabase(); setNotices((items) => items.map((item) => ({ ...item, read: true }))); } catch (error) { console.error("Could not mark all notifications as read", error); } }, []);
  const clearReadNotices = useCallback(async () => { const cleared = await clearReadNotificationsInSupabase(); if (cleared) setNotices((items) => items.filter((item) => !item.read)); }, []);
  return { notices, noticesLoading, notificationsRealtime, loadNotifications, readNotice, markAllNoticesRead, clearReadNotices };
}
