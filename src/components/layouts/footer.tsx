import Link from "next/link";
import { Facebook, Instagram, Linkedin, Plus } from "lucide-react";

import MaxWidthWrapper from "../wrapper/max-width.wrapper";

const footerData = {
  contact: {
    email: "hello@pothigaipixels.in",
    tagline: "Crafting digital experiences that elevate your brand.",
  },
  social: [
    { icon: <Facebook size={18} />, href: "https://facebook.com" },
    { icon: <Instagram size={18} />, href: "https://instagram.com" },
    { icon: <Linkedin size={18} />, href: "https://linkedin.com" },
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
      <MaxWidthWrapper id="footer_top" className="px-2.5 md:px-20 py-10">
        <div className="footer-content">
          <div>
            <Link href="#" className="text-primary flex gap-2 items-center">
              <span className="bg-foreground size-6 p-1 rounded-full flex items-center justify-center text-secondary">
                <Plus strokeWidth={2} />
              </span>
              <div>
                <h2 className="footer_title">{footerData.contact.email}</h2>
                <div className="border-b-2 border-foreground" />
              </div>
            </Link>

            <p className="text-sm text-primary/80 mt-4 max-w-xs">
              {footerData.contact.tagline}
            </p>

            <div className="flex gap-4 mt-4">
              {footerData.social.map((social, index) => (
                <Link
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-secondary transition-colors"
                >
                  {social.icon}
                </Link>
              ))}
            </div>
          </div>

          <div className="footer-menus">
            {[
              { title: "Company", items: footerData.company },
              { title: "Services", items: footerData.services },
              { title: "Support", items: footerData.support },
            ].map((menu, index) => (
              <div className="footer-menu" key={index}>
                <h2 className="footer_title">{menu.title}</h2>
                <ul className="footer_nav">
                  {menu.items.map((item, idx) => (
                    <li key={idx}>
                      <Link href={item.href}>{item.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </MaxWidthWrapper>

      <div id="footer_bottom">
        <MaxWidthWrapper className="footer-bottom">
          <div className="footer-copyrights">
            <p>© 2025 pothigai pixels. All rights reserved.</p>
          </div>
          <div className="footer-policy">
            {footerData.policies.map((policy, index) => (
              <Link key={index} href={policy.href} className="footer-link">
                {policy.label}
              </Link>
            ))}
          </div>
        </MaxWidthWrapper>
      </div>
    </footer>
  );
}
