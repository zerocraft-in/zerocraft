export type PublicAppearance = {
  name: string;
  accentColor: string;
  logoUrl: string;
  faviconUrl: string;
  fontFamily: "Inter" | "DM Sans" | "Manrope" | "Space Grotesk" | "Plus Jakarta Sans";
  themeMode: "dark" | "light" | "system";
};

export const DEFAULT_APPEARANCE: PublicAppearance = {
  name: "Zerocraft Studio",
  accentColor: "#ff6a2b",
  logoUrl: "",
  faviconUrl: "",
  fontFamily: "Inter",
  themeMode: "dark",
};

export const SUPPORTED_FONTS = [
  {
    name: "Inter",
    label: "Inter",
    category: "Modern Sans-serif",
    description: "Neutral, clean, and highly legible across all screen sizes.",
    stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    name: "DM Sans",
    label: "DM Sans",
    category: "Geometric Sans",
    description: "Geometric precision with open, readable letterforms.",
    stack: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    name: "Manrope",
    label: "Manrope",
    category: "Semi-Geometric Grotesque",
    description: "Modern, balanced grotesque with elegant character accents.",
    stack: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    name: "Space Grotesk",
    label: "Space Grotesk",
    category: "Tech & Editorial",
    description: "Distinctive monospace-inspired proportions for design-forward studios.",
    stack: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    name: "Plus Jakarta Sans",
    label: "Plus Jakarta Sans",
    category: "Contemporary Geometric",
    description: "Crisp, sophisticated curves tailored for high-end digital products.",
    stack: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
] as const;

export type SupportedFontName = (typeof SUPPORTED_FONTS)[number]["name"];

export const ACCENT_PRESETS = [
  { name: "Zerocraft Orange", hex: "#ff6a2b" },
  { name: "Electric Indigo", hex: "#6366f1" },
  { name: "Emerald Mint", hex: "#10b981" },
  { name: "Cyber Rose", hex: "#f43f5e" },
  { name: "Sky Cyan", hex: "#06b6d4" },
  { name: "Golden Amber", hex: "#f59e0b" },
  { name: "Violet Orchid", hex: "#8b5cf6" },
  { name: "Pure White", hex: "#e4e4e7" },
] as const;

export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Manrope:wght@200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Space+Grotesk:wght@300..700&display=swap";

export const APPEARANCE_EVENT_NAME = "zerocraft:studio-appearance-updated";
export const APPEARANCE_CHANNEL_NAME = "zerocraft-studio-appearance-sync";
export const APPEARANCE_STORAGE_KEY = "zerocraft_studio_appearance_v1";

export function getFontFamilyStack(fontName: string): string {
  const match = SUPPORTED_FONTS.find(
    (font) => font.name.toLowerCase() === fontName.trim().toLowerCase()
  );
  return match ? match.stack : SUPPORTED_FONTS[0].stack;
}

/**
 * Pick a readable foreground colour for text or icons sitting on the brand
 * accent. Light accents (cyan, amber, orange) get near-black text; dark
 * accents keep white. 0.179 is the WCAG relative-luminance crossover point
 * where black and white switch places.
 */
export function readableAccentForeground(accentColor: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(accentColor.trim());
  const hex = match ? match[1] : "ff6a2b";
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const [red = 0, green = 0, blue = 0] = channels;
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance > 0.179 ? "#0a0a0b" : "#ffffff";
}

export function ensureGoogleFontsLoaded(): void {
  if (typeof document === "undefined") return;
  const linkId = "zerocraft-studio-google-fonts";
  if (!document.getElementById(linkId)) {
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  }
}

export function computeAppearanceTokens(appearance: PublicAppearance, isDark: boolean): Record<string, string> {
  const fontStack = getFontFamilyStack(appearance.fontFamily);
  const accent = /^#[0-9a-f]{6}$/i.test(appearance.accentColor) ? appearance.accentColor.toLowerCase() : "#ff6a2b";

  return {
    "--background": isDark ? "#0a0a0b" : "#f8fafc",
    "--foreground": isDark ? "#f4f4f5" : "#09090b",
    "--card": isDark ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.88)",
    "--card-foreground": isDark ? "#f4f4f5" : "#09090b",
    "--popover": isDark ? "#202024" : "#ffffff",
    "--popover-foreground": isDark ? "#f4f4f5" : "#09090b",
    "--primary": accent,
    "--primary-foreground": "#ffffff",
    "--secondary": isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.05)",
    "--secondary-foreground": isDark ? "#f4f4f5" : "#09090b",
    "--muted": isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.04)",
    "--muted-foreground": isDark ? "#a8a8b0" : "#64748b",
    "--accent": isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.05)",
    "--accent-foreground": isDark ? "#ffffff" : "#09090b",
    "--destructive": "#ef4444",
    "--border": isDark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.08)",
    "--input": isDark ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.08)",
    "--ring": accent,
    "--brand-accent": accent,
    "--studio-font": fontStack,
    "font-family": fontStack,
    "color-scheme": isDark ? "dark" : "light",
  };
}

export function applyAppearanceToDOM(appearance: PublicAppearance): void {
  if (typeof document === "undefined") return;

  const isSystem = appearance.themeMode === "system";
  const systemDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = isSystem ? systemDark : appearance.themeMode !== "light";
  const resolvedTheme = isDark ? "dark" : "light";

  const root = document.documentElement;
  const body = document.body;

  const bgColor = isDark ? "#0a0a0b" : "#f8fafc";
  root.style.backgroundColor = bgColor;
  body.style.backgroundColor = bgColor;

  root.dataset.studioTheme = resolvedTheme;
  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  body.dataset.studioRoot = "true";
  body.dataset.workspaceName = appearance.name;

  const tokens = computeAppearanceTokens(appearance, isDark);
  for (const [key, value] of Object.entries(tokens)) {
    if (key === "font-family") {
      body.style.fontFamily = value;
      root.style.fontFamily = value;
    } else if (key === "color-scheme") {
      body.style.colorScheme = value;
      root.style.colorScheme = value;
    } else {
      body.style.setProperty(key, value);
      root.style.setProperty(key, value);
    }
  }
}

export function broadcastAppearanceUpdate(appearance: PublicAppearance): void {
  if (typeof window === "undefined") return;

  applyAppearanceToDOM(appearance);

  window.dispatchEvent(
    new CustomEvent(APPEARANCE_EVENT_NAME, { detail: appearance })
  );

  try {
    const channel = new BroadcastChannel(APPEARANCE_CHANNEL_NAME);
    channel.postMessage(appearance);
    channel.close();
  } catch {}

  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  } catch {}
}
