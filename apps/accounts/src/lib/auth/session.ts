import "server-only";

import { redirect } from "next/navigation";

import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string | null;
  emailConfirmedAt: string | null;
};

export type SafeUser = {
  id: string;
  email: string | null;
};

function toSafeUser(user: {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
}): SessionUser {
  return {
    id: user.id,
    email: user.email ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
  };
}

/** Returns the validated user or null. Never throws for a missing session. */
export async function getOptionalUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return toSafeUser(user);
  } catch {
    return null;
  }
}

export async function requireUser(nextPath = "/"): Promise<SessionUser> {
  const user = await getOptionalUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

export function toClientUser(user: SessionUser | null): SafeUser | null {
  if (!user) return null;
  return { id: user.id, email: user.email };
}
