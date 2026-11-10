import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  type PublicAppearance,
  DEFAULT_APPEARANCE,
  SUPPORTED_FONTS,
} from "./studio-appearance";

export type { PublicAppearance };

const validFonts = new Set<string>(SUPPORTED_FONTS.map((font) => font.name));

export async function getPublicAppearance(): Promise<PublicAppearance> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.PLATFORM_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return DEFAULT_APPEARANCE;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await supabase
    .from("workspace_settings")
    .select("brand_name,accent_color,logo_url,favicon_url,font_family,theme_mode")
    .eq("id", 1)
    .maybeSingle();

  const accentColor = typeof data?.accent_color === "string" && /^#[0-9a-f]{6}$/i.test(data.accent_color)
    ? data.accent_color.toLowerCase()
    : DEFAULT_APPEARANCE.accentColor;
  const fontFamily = validFonts.has(data?.font_family as string)
    ? (data?.font_family as PublicAppearance["fontFamily"])
    : DEFAULT_APPEARANCE.fontFamily;
  const themeMode = data?.theme_mode === "light" || data?.theme_mode === "system"
    ? data.theme_mode
    : DEFAULT_APPEARANCE.themeMode;

  return {
    name: typeof data?.brand_name === "string" && data.brand_name.trim() ? data.brand_name.trim() : DEFAULT_APPEARANCE.name,
    accentColor,
    logoUrl: typeof data?.logo_url === "string" ? data.logo_url : DEFAULT_APPEARANCE.logoUrl,
    faviconUrl: typeof data?.favicon_url === "string" ? data.favicon_url : DEFAULT_APPEARANCE.faviconUrl,
    fontFamily,
    themeMode,
  };
}
