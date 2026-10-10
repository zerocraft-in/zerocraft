import { IconArrowUpRight, IconGridDots, IconDevices, IconCamera, IconCode } from "@tabler/icons-react";

const services = [
  { title: "Branding & Identity", icon: IconGridDots, description: "We shape memorable brands through thoughtful strategy, distinctive identities, and cohesive visual systems.", capabilities: "Brand Strategy, Logo Design, Visual Identity, Packaging, Brand Guidelines." },
  { title: "Digital Design", icon: IconDevices, description: "We create intuitive, visually engaging interfaces that connect people with brands across every screen.", capabilities: "UI/UX Design, Web Design, App Design, Prototyping, Interactive Experiences." },
  { title: "Photography, Film & Motion", icon: IconCamera, description: "We bring stories to life through expressive photography, cinematic visuals, and motion-led storytelling.", capabilities: "Product Photography, Commercial Shoots, Video Production, Motion Graphics, Animation." },
  { title: "Web & App Development", icon: IconCode, description: "We turn thoughtful designs into responsive websites, interactive platforms, and scalable digital products.", capabilities: "Creative Development, Websites, Web Applications, Mobile Apps, Interactive Animation." },
];

export default function Services() {
  return (
    <section className="section studio-services" id="services" aria-labelledby="services-heading">
      <div className="container-site">
        <span className="studio-eyebrow">OUR EXPERTISE</span>
        <h2 className="studio-heading" id="services-heading">Everything you need to make<br />your brand <span>stand out.</span></h2>
        <div className="studio-services__grid">
          {services.map(({ title, icon: Icon, description, capabilities }) => (
            <details className="service-card" key={title}>
              <summary>
                <Icon size={30} stroke={1.3} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="studio-circle" aria-hidden="true"><IconArrowUpRight size={17} stroke={1.5} /></span>
              </summary>
              <div className="service-card__details">
                <p>{capabilities}</p>
                <a href="mailto:hello@zerocraft.in">Let’s talk <IconArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
