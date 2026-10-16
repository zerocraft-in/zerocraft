import { createClient } from "@/utils/supabase/client";

export const isSupabaseConfigured = true;

// Supabase client instance connected to live backend
export const supabase = createClient();

// Role Based Access Control Types
export type UserRole = "admin" | "manager" | "staff" | "client";

export interface StudioUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

// LIVE SUPABASE FETCH & MUTATION HELPERS

// --- BLOGS ---
export async function fetchBlogsFromSupabase(strict = false) {
  try {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { if (strict) throw error; return []; }
    if (!data) return [];
    return data;
  } catch (cause) {
    if (strict) throw cause;
    return [];
  }
}

export async function createBlogInSupabase(blog: Record<string, any>) {
  const { data, error } = await supabase
    .from("blogs")
    .insert([blog])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBlogInSupabase(
  id: string,
  updates: Record<string, any>,
) {
  const { data, error } = await supabase
    .from("blogs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBlogInSupabase(id: string) {
  const { error } = await supabase.from("blogs").delete().eq("id", id).select("id").single();
  if (error) throw error;
  return true;
}

// --- WORKS ---
export async function fetchWorksFromSupabase(strict = false) {
  try {
    const { data, error } = await supabase
      .from("works")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { if (strict) throw error; return []; }
    if (!data) return [];
    return data;
  } catch (cause) {
    if (strict) throw cause;
    return [];
  }
}

export async function createWorkInSupabase(work: Record<string, any>) {
  const { data, error } = await supabase
    .from("works")
    .insert([work])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkInSupabase(
  id: string,
  updates: Record<string, any>,
) {
  const { data, error } = await supabase
    .from("works")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkInSupabase(id: string) {
  const { error } = await supabase.from("works").delete().eq("id", id).select("id").single();
  if (error) throw error;
  return true;
}

// --- REVIEWS ---
export async function fetchReviewsFromSupabase(strict = false) {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { if (strict) throw error; return []; }
    if (!data) return [];
    return data;
  } catch (cause) {
    if (strict) throw cause;
    return [];
  }
}

export async function createReviewInSupabase(review: Record<string, any>) {
  const { data, error } = await supabase
    .from("reviews")
    .insert([review])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReviewInSupabase(
  id: string,
  updates: Record<string, any>,
) {
  const { data, error } = await supabase
    .from("reviews")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReviewInSupabase(id: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
  return true;
}

// --- CLIENTS ---
export async function fetchClientsFromSupabase(strict = false) {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { if (strict) throw error; return []; }
    if (!data) return [];
    return data;
  } catch (cause) {
    if (strict) throw cause;
    return [];
  }
}

export async function fetchClientByIdFromSupabase(id: string) {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function createClientInSupabase(client: Record<string, any>) {
  const { data, error } = await supabase
    .from("clients")
    .insert([client])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClientInSupabase(
  id: string,
  updates: Record<string, any>,
) {
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClientInSupabase(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id).select("id").single();
  if (error) throw error;
  return true;
}

// --- APPOINTMENTS ---
export async function fetchAppointmentsFromSupabase(strict = false) {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { if (strict) throw error; return []; }
    if (!data) return [];
    return data;
  } catch (cause) {
    if (strict) throw cause;
    return [];
  }
}

export async function createAppointmentInSupabase(
  appointment: Record<string, any>,
) {
  const { data, error } = await supabase
    .from("appointments")
    .insert([appointment])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAppointmentInSupabase(
  id: string,
  updates: Record<string, any>,
) {
  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAppointmentInSupabase(id: string) {
  const { error } = await supabase.from("appointments").delete().eq("id", id).select("id").single();
  if (error) throw error;
  return true;
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
      .from("profiles")
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
    .from("profiles")
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

  const isOwner = user.email === "ivd.maran@gmail.com";
  const defaultRole: UserRole = isOwner ? "admin" : "client";
  const defaultName = isOwner
    ? "Maran (Owner)"
    : user.user_metadata?.full_name || user.email.split("@")[0];

  const payload = {
    id: user.id,
    email: user.email,
    full_name: defaultName,
    role: defaultRole,
    avatar_url: user.user_metadata?.avatar_url || null,
  };

  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (existing) return existing;
    const { data } = await supabase
      .from("profiles")
      .insert(payload)
      .select()
      .single();

    return data || null;
  } catch {
    return null;
  }
}

// --- NOTIFICATIONS SYSTEM ---
export interface StudioNotification {
  id: string;
  title: string;
  message: string;
  category: "appointments" | "clients" | "works" | "blogs" | "system";
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  link?: string;
  created_at: string;
}

export async function fetchNotificationsFromSupabase(): Promise<
  StudioNotification[]
> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as StudioNotification[];
  } catch {
    return [];
  }
}

export async function markNotificationAsReadInSupabase(id: string) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
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
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false)
      .select();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function createNotificationInSupabase(
  notification: Omit<StudioNotification, "id" | "created_at">,
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
