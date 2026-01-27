import Link from "next/link";
import {
  IconBrandLinkedin,
  IconBrandFacebook,
  IconBrandInstagram,
  IconCirclePlusFilled,
  IconCopyright,
} from "@tabler/icons-react";
import MaxWidthWrapper from "@/components/wrapper/max-width.wrapper";

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
      <MaxWidthWrapper id="footer_top" className="px-2.5 md:px-20 py-10">
        <div className="footer-content">
          <div>
            <Link href="#" className="text-primary flex gap-2 items-center">
              <span className="size-8 rounded-full flex items-center justify-center">
                <IconCirclePlusFilled strokeWidth={2} />
              </span>
              <div>
                <h2 className="footer_title text-base">{footerData.contact.email}</h2>
                <div className="border-b-2 border-secondary" />
              </div>
            </Link>

            <p className="text-sm text-accent-primary mt-4 max-w-xs">
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
        <MaxWidthWrapper className="footer-bottom gap-2">
          <div className="footer-copyrights">
            <div className="flex gap-1 items-center">
              <IconCopyright size={16} />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  id="Layer_2"
                  viewBox="0 0 741.58 115.63"
                  className="fill-accent w-30"
                >
                  <g id="Layer_1-2">
                    <path d="M0,37.79h67.57v21.46l-33.4,32.65h33.4v21.46H0v-21.46l33.25-32.65H0v-21.46Z" />
                    <path d="M156.45,82.38h-54.57c1.81,10.13,7.86,13.75,17.23,13.75,8.77,0,15.12-3.93,15.12-8.46h21.31c0,16.63-12.7,27.96-36.43,27.96-28.42,0-42.47-13.75-42.47-40.06s14.21-40.06,39.75-40.06c28.72,0,40.06,14.36,40.06,43.83v3.02ZM133.17,65.9c-1.81-7.26-7.56-10.88-15.57-10.88-6.8,0-12.24,3.63-14.81,10.88h30.38Z" />
                    <path d="M168.54,113.37V37.79h23.88v9.98c4.84-7.71,11.79-12.24,20.71-12.24,16.93,0,27.81,9.67,27.81,32.8h-21.46c0-6.35-5.29-10.73-12.55-10.73-9.07,0-14.51,6.05-14.51,17.99v37.79h-23.88Z" />
                    <path d="M291.58,35.52c29.02,0,43.08,13.76,43.08,40.06s-14.06,40.06-43.08,40.06-43.08-13.75-43.08-40.06,13.91-40.06,43.08-40.06ZM291.58,93.56c12.39,0,18.44-6.2,18.44-17.99s-6.05-17.99-18.44-17.99c-13.3,0-18.44,6.05-18.44,17.99s6.05,17.99,18.44,17.99Z" />
                    <path d="M422.63,68.02h-21.46c0-6.35-6.05-10.43-15.42-10.43-10.43,0-17.38,4.69-17.38,17.84s7.86,18.14,18.89,18.14c9.67,0,14.81-4.08,14.81-10.43h21.46c0,18.14-12.24,32.5-37.49,32.5-27.66,0-42.32-13.75-42.32-40.06s12.7-40.06,42.02-40.06c23.88,0,36.88,14.36,36.88,32.5Z" />
                    <path d="M434.12,113.37V37.79h23.88v9.98c4.84-7.71,11.79-12.24,20.71-12.24,16.93,0,27.81,9.67,27.81,32.8h-21.46c0-6.35-5.29-10.73-12.54-10.73-9.07,0-14.51,6.05-14.51,17.99v37.79h-23.88Z" />
                    <path d="M553.69,55.02c-6.35,0-15.42.6-15.42,8.92h-21.46c0-20.86,14.36-28.42,37.33-28.42,26.6,0,39.6,6.65,39.6,34.31v43.53h-24.03v-9.83c-2.87,7.41-9.52,12.09-24.94,12.09-17.53,0-32.2-4.84-32.2-24.33,0-15.87,12.39-21.31,30.38-22.98l26.75-2.42v-.15c0-9.67-9.37-10.73-16.02-10.73ZM548.25,84.19c-7.26.6-11.03,2.12-11.03,6.65,0,3.93,4.84,5.29,11.64,5.29,12.85,0,20.41-4.08,20.86-8.77v-5.14l-21.46,1.96Z" />
                    <path d="M647.86,0c19.65,0,30.68,7.56,30.68,30.99h-21.46c0-6.65-2.87-8.92-8.31-8.92-4.99,0-7.71,2.57-7.71,10.13v5.59h39.15l9.98-30.23h13.91v30.23h35.82v21.46h-35.82v24.18c0,6.2,1.96,10.13,7.56,10.13,5.14,0,8.46-2.12,8.46-8.92h21.46c0,23.43-11.34,30.99-30.84,30.99-20.86,0-30.53-9.82-30.53-30.53v-25.85h-39.15v54.11h-23.88v-54.11h-14.36v-21.46h14.36v-6.8c0-20.56,9.22-30.99,30.68-30.99Z" />
                  </g>
                </svg>
            </div>
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
