import {
  IconGridDots,
  IconDevices,
  IconCamera,
  IconCode,
} from "@tabler/icons-react";
import RotatingWords from "@/components/ui/RotatingWords";
import ArrowIcon from "@/components/ui/ArrowIcon";

const services = [
  {
    title: "Branding & Identity",
    icon: IconGridDots,
    description:
      "We shape memorable brands through thoughtful strategy, distinctive identities, and cohesive visual systems.",
    capabilities:
      "Brand Strategy, Logo Design, Visual Identity, Packaging, Brand Guidelines.",
  },
  {
    title: "Digital Design",
    icon: IconDevices,
    description:
      "We create intuitive, visually engaging interfaces that connect people with brands across every screen.",
    capabilities:
      "UI/UX Design, Web Design, App Design, Prototyping, Interactive Experiences.",
  },
  {
    title: "Photography, Film & Motion",
    icon: IconCamera,
    description:
      "We bring stories to life through expressive photography, cinematic visuals, and motion-led storytelling.",
    capabilities:
      "Product Photography, Commercial Shoots, Video Production, Motion Graphics, Animation.",
  },
  {
    title: "Web & App Development",
    icon: IconCode,
    description:
      "We turn thoughtful designs into responsive websites, interactive platforms, and scalable digital products.",
    capabilities:
      "Creative Development, Websites, Web Applications, Mobile Apps, Interactive Animation.",
  },
];

export default function Services() {
  return (
    <section
      className="section studio-services"
      id="services"
      aria-labelledby="services-heading"
    >
      <div className="container-site">
        <span className="studio-eyebrow studio-eyebrow--section">Our expertise</span>
        <div className="studio-services__intro">
          <h2 className="studio-heading" id="services-heading" aria-label="Everything you need to make your brand stand out.">
            Everything you need to make
            <br />
            your brand <RotatingWords words={["stand out.", "feel alive.", "move forward."]} className="studio-accent" />
          </h2>
          <div className="studio-services__aside"><span>DESIGN / CODE / STORY</span><p>From the first mark to the final interaction, every discipline works together.</p></div>
        </div>
        <div className="studio-services__grid">
          {services.map(({ title, icon: Icon, description, capabilities }, index) => (
            <details className={`service-card service-card--${index + 1}`} key={title}>
              <summary>
                <span className="service-card__topline"><span>{String(index + 1).padStart(2, "0")} / 04</span><span>ZEROCRAFT / EXPERTISE</span></span>
                <span className="service-card__visual" aria-hidden="true" data-number={String(index + 1).padStart(2, "0")}><span className="service-card__orbit" /><span className="service-card__object" /><Icon size={76} stroke={1} /></span>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="studio-circle" aria-hidden="true">
                  <ArrowIcon direction="up-right" size={14} />
                </span>
              </summary>
              <div className="service-card__details">
                <p>{capabilities}</p>
                <a href="mailto:hello@zerocraft.in">
                  Let’s talk <ArrowIcon direction="up-right" size={13} />
                </a>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
