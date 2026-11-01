"use client";
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
 const url=process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key) throw new Error("ZeroCraft platform authentication is not configured.");
 return createBrowserClient(url,key);
}
