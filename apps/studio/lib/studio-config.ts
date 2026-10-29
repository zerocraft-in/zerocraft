export const studio = {
  name: "Zerocraft Studio",
  url: process.env.NEXT_PUBLIC_STUDIO_URL || "https://zerocraft.in",
  email: "hello@zerocraft.in",
  whatsapp: {
    number: "919445475424",
    display: "+91 94454 75424",
    message: "Hi Zerocraft Studio, I’d like to discuss a project.",
  },
  description: "Zerocraft Studio is a premium creative and digital studio from Tenkasi, India, shaping distinctive brands, digital experiences, and visual stories.",
  founder: "Manimaran",
  founderRole: "Founder & Creative Lead",
  address: {
    streetAddress: "South Street, Arunasalampatti",
    addressLocality: "Kadayam",
    postalCode: "627415",
    addressRegion: "Tamil Nadu",
    addressCountry: "IN",
    district: "Tenkasi",
    formatted: "South Street, Arunasalampatti, Kadayam - 627415, Tenkasi District, Tamil Nadu, India",
  },
};

export const studioSocials = [
  { label: "Instagram", url: "https://instagram.com/studio.zerocraft" },
];

export function studioWhatsAppUrl(message = studio.whatsapp.message) {
  return `https://wa.me/${studio.whatsapp.number}?text=${encodeURIComponent(message)}`;
}
