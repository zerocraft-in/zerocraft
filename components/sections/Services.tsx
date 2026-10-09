import { IconArrowUpRight, IconGridDots, IconDevices, IconCamera, IconCode } from "@tabler/icons-react";

const services = [
  { title: "Brand Identity", icon: IconGridDots, subtitle: "Strategy. Identity. Presence.", description: "Distinctive logos, visual identities, brand guidelines, and packaging that give your business a voice of its own." },
  { title: "Digital Design", icon: IconDevices, subtitle: "Web. UI/UX. Digital.", description: "Intuitive interfaces, thoughtful user experiences, and digital design systems built around the people who use them." },
  { title: "Content Creation", icon: IconCamera, subtitle: "Photo. Video. Motion.", description: "Brand films, product photography, motion graphics, and social content that turn your story into something people feel." },
  { title: "Development", icon: IconCode, subtitle: "Websites. Applications.", description: "Fast, accessible websites and custom applications that bring design to life, built with Next.js, React, and TypeScript." },
];

export default function Services() {
  return (
    <section className="section studio-services" id="services" aria-labelledby="services-heading">
      <div className="container-site">
        <span className="studio-eyebrow">/ Our services</span>
        <h2 className="studio-heading" id="services-heading">Services designed<br />to elevate <span>your brand.</span></h2>
        <div className="studio-services__grid">
          {services.map(({ title, icon: Icon, subtitle, description }) => (
            <details className="service-card" key={title}>
              <summary>
                <Icon size={30} stroke={1.3} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{subtitle}</p>
                <span className="studio-circle" aria-hidden="true"><IconArrowUpRight size={17} stroke={1.5} /></span>
              </summary>
              <div className="service-card__details">
                <p>{description}</p>
                <a href="mailto:hello@zerocraft.in">Let’s talk <IconArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
