import {
  IconGridDots,
  IconDevices,
  IconCamera,
  IconCode,
} from "@tabler/icons-react";
import RotatingWords from "@/components/ui/RotatingWords";
import ArrowIcon from "@/components/ui/ArrowIcon";
import StudioGlyph from "@/components/ui/StudioGlyph";

const services = [
  {
    title: "Branding & Identity",
    icon: IconGridDots,
    description:
      "We shape memorable brands through thoughtful strategy, distinctive identities, and cohesive visual systems.",
    capabilities: ["Brand Strategy", "Logo Design", "Visual Identity", "Packaging", "Brand Guidelines"],
  },
  {
    title: "Digital Design",
    icon: IconDevices,
    description:
      "We create intuitive, visually engaging interfaces that connect people with brands across every screen.",
    capabilities: ["UI/UX Design", "Web Design", "App Design", "Prototyping", "Interactive Experiences"],
  },
  {
    title: "Photography, Film & Motion",
    icon: IconCamera,
    description:
      "We bring stories to life through expressive photography, cinematic visuals, and motion-led storytelling.",
    capabilities: ["Product Photography", "Commercial Shoots", "Video Production", "Motion Graphics", "Animation"],
  },
  {
    title: "Web & App Development",
    icon: IconCode,
    description:
      "We turn thoughtful designs into responsive websites, interactive platforms, and scalable digital products.",
    capabilities: ["Creative Development", "Websites", "Web Applications", "Mobile Apps", "Interactive Animation"],
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
                <span className="service-card__visual" aria-hidden="true"><Icon size={42} stroke={1.25} /></span>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="service-card__more" aria-hidden="true"><span>Explore capabilities</span><StudioGlyph variant="plus" size={15} /></span>
              </summary>
              <div className="service-card__details">
                <span className="service-card__details-label">What we do</span>
                <ul>{capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
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
