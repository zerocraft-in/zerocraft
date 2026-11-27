import { createClient as createSupabaseBrowserClient } from "@zerocraft/supabase/client";
import { createClient as createSupabaseServerClient } from "@zerocraft/supabase/server";
import { getSupabasePublicConfig as getBaseConfig } from "@zerocraft/supabase/config";

export function getStudioSupabaseConfig() {
  try {
    return getBaseConfig();
  } catch {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zerocraft-staging.supabase.co",
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_placeholder_token",
      storeId: "zerocraft-studio",
    };
  }
}

export { createSupabaseBrowserClient, createSupabaseServerClient };

export interface StudioProject {
  id: string;
  title: string;
  slug: string;
  category: string;
  client?: string;
  year?: string;
  description: string;
  featured_image: string;
  tags: string[];
  metrics?: { label: string; value: string }[];
  status: "draft" | "published" | "archived";
}

export interface ClientInquiry {
  id: string;
  name: string;
  email: string;
  project_type: string;
  budget_range: string;
  message: string;
  created_at: string;
  status: "new" | "in_review" | "contacted" | "archived";
}
