"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { IconArrowUpRight, IconX } from "@tabler/icons-react";

const projects = [
  { title: "Illustrations Set", category: "Visual identity · Packaging", image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=1000", description: "A study in visual identity, expressive illustration, and considered packaging." },
  { title: "Interactive Concept", category: "Digital design · Development", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000", description: "An exploration of form, color, and interaction for a distinctive digital experience." },
  { title: "Elevated Brand System", category: "Art direction · Brand identity", image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&q=80&w=1000", description: "An exploration of art direction and a distinctive brand language." },
  { title: "Creative Studio", category: "Web design · UI/UX", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000", description: "A digital design concept connecting clear information with intuitive interfaces." },
  { title: "Product Visuals", category: "Photography · Art direction", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1000", description: "Bold product imagery, a vivid palette, and a focused visual story." },
  { title: "Spaces & Stories", category: "Brand direction · Campaign", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1000", description: "An architectural mood study bringing together space, light, and brand storytelling." },
];

export default function Works() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<(typeof projects)[number] | null>(null);
  return (
    <section className="section studio-work" id="works" tabIndex={-1} aria-labelledby="works-heading">
      <div className="container-site">
        <div className="studio-work__header">
          <div><span className="studio-eyebrow">/ Selected work</span><h2 className="studio-heading" id="works-heading">Crafting stories<br />that make an <span>impact.</span></h2></div>
          <p>Concept studies &amp; visual directions.<br />Explore our latest work on Instagram.</p>
        </div>
        <div className="studio-work__grid">
          {projects.map((project) => (
            <button className="project-card" key={project.title} onClick={() => { setSelected(project); dialog.current?.showModal(); }} aria-label={`View ${project.title}`}>
              <Image src={project.image} alt={project.title} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" />
              <span className="project-card__shade" />
              <span className="project-card__caption"><span><strong>{project.title}</strong><small>{project.category}</small></span><span className="studio-circle" aria-hidden="true"><IconArrowUpRight size={18} stroke={1.5} /></span></span>
            </button>
          ))}
        </div>
        <div className="studio-work__footer"><a href="https://instagram.com/studio.zerocraft" target="_blank" rel="noopener noreferrer">See the studio journal <span className="studio-circle"><IconArrowUpRight size={16} aria-hidden="true" /></span></a></div>
      </div>
      <dialog ref={dialog} data-lenis-prevent className="project-dialog" aria-labelledby="project-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        {selected && <div className="project-dialog__content">
          <button autoFocus className="project-dialog__close" aria-label="Close project" onClick={() => dialog.current?.close()}><IconX size={22} /></button>
          <div className="project-dialog__image"><Image src={selected.image} alt={selected.title} fill sizes="(max-width: 700px) 90vw, 700px" /></div>
          <div className="project-dialog__copy"><span className="studio-eyebrow">{selected.category}</span><h2 id="project-title">{selected.title}</h2><p>{selected.description}</p><a href="mailto:hello@zerocraft.in">Discuss a similar project ↗</a></div>
        </div>}
      </dialog>
    </section>
  );
}
