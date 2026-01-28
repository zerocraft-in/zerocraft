import Link from "next/link";
import {
  IconBrandLinkedin,
  IconBrandFacebook,
  IconBrandInstagram,
  IconCirclePlusFilled,
  IconCopyright,
} from "@tabler/icons-react";

const footerData = {
  contact: {
    email: "hello.zerocraft@gmail.com",
    tagline: "Crafting digital experiences that elevate your brand.",
  },
  social: [
    { icon: <IconBrandFacebook size={24} />, href: "https://facebook.com" },
    { icon: <IconBrandInstagram size={24} />, href: "https://instagram.com" },
    { icon: <IconBrandLinkedin size={24} />, href: "https://linkedin.com" },
  ],
  company: [
    { label: "About Us", href: "#" },
    { label: "Our Team", href: "#" },
    { label: "Testimonials", href: "#" },
    { label: "Pricing", href: "#" },
    { label: "Blogs", href: "#" },
  ],
  services: [
    { label: "Branding", href: "#" },
    { label: "Web Development", href: "#" },
    { label: "Digital Marketing", href: "#" },
    { label: "Video Production", href: "#" },
    { label: "UI/UX Design", href: "#" },
  ],
  support: [
    { label: "FAQs", href: "#" },
    { label: "Help Center", href: "#" },
    { label: "Contact Support", href: "#" },
  ],
  policies: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Use", href: "#" },
    { label: "Site Map", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer id="footer-section">
      
    </footer>
  );
}
