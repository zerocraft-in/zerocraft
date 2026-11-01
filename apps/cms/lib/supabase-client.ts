import { createClient } from "@zerocraft/supabase/client";

export const isSupabaseConfigured = true;

// Supabase client instance connected to live backend
export const supabase = createClient();

// Role Based Access Control Types
export type UserRole = "admin" | "manager" | "staff" | "client";

export interface CommerceUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

// --- PROFILES & USER MANAGEMENT (RBAC) ---
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  phone?: string;
  created_at: string;
  updated_at?: string;
}

export async function fetchProfilesFromSupabase(): Promise<Profile[]> {
  try {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as Profile[];
  } catch {
    return [];
  }
}

export async function updateProfileRoleInSupabase(id: string, role: UserRole) {
  const { data, error } = await supabase
    .from("accounts")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function ensureUserProfile(user: {
  id: string;
  email?: string;
  user_metadata?: any;
}) {
  if (!user || !user.id || !user.email) return null;

  const defaultRole: UserRole = "client";
  const defaultName = user.user_metadata?.full_name || user.email.split("@")[0];

  const payload = {
    id: user.id,
    email: user.email,
    full_name: defaultName,
    role: defaultRole,
    avatar_url: user.user_metadata?.avatar_url || null,
  };

  try {
    const { data: existing } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (existing) return existing;
    const { data } = await supabase
      .from("accounts")
      .insert(payload)
      .select()
      .single();

    return data || null;
  } catch {
    return null;
  }
}

// --- NOTIFICATIONS SYSTEM ---
export interface CommerceNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  link?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export async function fetchNotificationsFromSupabase(): Promise<
  CommerceNotification[]
> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return [];
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", authData.user.id)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as CommerceNotification[];
  } catch {
    return [];
  }
}

export async function markNotificationAsReadInSupabase(id: string) {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return null;
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("recipient_id", authData.user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function markAllNotificationsAsReadInSupabase() {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return null;
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", authData.user.id)
      .eq("read", false)
      .select();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function clearReadNotificationsInSupabase() {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return false;
    const { error } = await supabase.from("notifications").delete().eq("recipient_id", authData.user.id).eq("read", true);
    return !error;
  } catch {
    return false;
  }
}

export async function createNotificationInSupabase(
  notification: Omit<CommerceNotification, "id" | "created_at">,
) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert([notification])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}
