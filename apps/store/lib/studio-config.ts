// The production domain and email are the existing studio configuration.
export const studio = {
  url: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://store.zerocraft.in").origin,
  email: "hello@zerocraft.in",
  description: "Zerocraft Studio is a creative and digital studio in Tenkasi, India, specializing in branding, design, web and app development, photography, video, and motion.",
};

const configuredSocials = [
  { label: "Instagram", url: "https://instagram.com/studio.zerocraft" },
  { label: "LinkedIn", url: "https://www.linkedin.com/in/ivdmaran" },
  { label: "Behance", url: "https://www.behance.net/maranr" },
  { label: "GitHub", url: "https://github.com/zerocraft-in" },
  { label: "X", url: process.env.NEXT_PUBLIC_X_URL },
];

export const studioSocials = configuredSocials.filter(
  (link): link is { label: string; url: string } => Boolean(link.url?.startsWith("https://")),
);
