// The production domain and email are the existing studio configuration.
export const studio = {
  url: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://zerocraft.in").origin,
  email: "hello@zerocraft.in",
  description: "Zerocraft Studio is an independent creative studio in Tenkasi, India, specializing in branding, design, web and app development, photography, video, and motion.",
};

const configuredSocials = [
  { label: "Instagram", url: "https://instagram.com/studio.zerocraft" },
  { label: "LinkedIn", url: process.env.NEXT_PUBLIC_LINKEDIN_URL },
  { label: "GitHub", url: process.env.NEXT_PUBLIC_GITHUB_URL },
  { label: "X", url: process.env.NEXT_PUBLIC_X_URL },
];

export const studioSocials = configuredSocials.filter(
  (link): link is { label: string; url: string } => Boolean(link.url?.startsWith("https://")),
);
