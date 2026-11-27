import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Server-only service-role client.
 *
 * Used for exactly two operations:
 *  - centralized account creation with duplicate detection;
 *  - minting a one-time Supabase magiclink token after a verified handoff.
 *
 * It is never imported by a client component and never exposed to browsers.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error("Supabase service role is not configured");
  }

  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
