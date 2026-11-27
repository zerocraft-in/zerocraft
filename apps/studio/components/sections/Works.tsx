"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import RotatingWords from "@/components/ui/RotatingWords";
import ArrowIcon from "@/components/ui/ArrowIcon";
import StudioGlyph from "@/components/ui/StudioGlyph";
import type Lenis from "lenis";

export type StudioProject = {
  id: string;
  title: string;
  category: string;
  image_url: string;
  client_name: string;
  description: string | null;
  featured: boolean;
};

export default function Works({ projects }: { projects: StudioProject[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<StudioProject | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const categories = ["All", ...Array.from(new Set(projects.map((project) => project.category)))];
  const visibleProjects = activeFilter === "All"
    ? projects
    : projects.filter((project) => project.category === activeFilter);
  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    document.body.style.overflow = "hidden";
    lenis?.stop();
    if (!dialog.current?.open) dialog.current?.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      lenis?.start();
    };
  }, [selected]);
  return (
    <section
      className="section studio-work"
      id="works"
      tabIndex={-1}
      aria-labelledby="works-heading"
    >
      <div className="container-site">
        <div className="studio-work__header">
          <div>
            <span className="studio-eyebrow studio-eyebrow--section">Selected work</span>
            <h2 className="studio-heading" id="works-heading" aria-label="Crafting stories that make an impact.">
              Crafting stories
              <br />
              that make an <RotatingWords words={["impact.", "imprint.", "effect."]} className="studio-accent" />
            </h2>
          </div>
          <p>
            An evolving collection of brand identities, digital experiences,
            visual explorations, and creative experiments.
          </p>
        </div>
        <p className="studio-work__context">
          Brand Identity · Digital Experiences · Creative &amp; Visuals ·
          Photography · Film &amp; Motion
        </p>
        <p className="studio-work__disclosure">
          Published projects from the Zerocraft Studio portfolio.
        </p>
        <div className="studio-work__filters" aria-label="Filter projects by discipline">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={activeFilter === category ? "studio-work__filter studio-work__filter--active" : "studio-work__filter"}
              aria-pressed={activeFilter === category}
              onClick={() => setActiveFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
        {visibleProjects.length > 0 ? <div className="studio-work__grid">
          {visibleProjects.map((project, index) => (
            <button
              className="project-card"
              key={project.title}
              onClick={() => {
                setSelected(project);
              }}
              aria-label={`View ${project.title}`}
            >
              <Image
                src={project.image_url}
                alt={`${project.title} — ${project.category}`}
                fill
                sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
              />
              <span className="project-card__shade" />
              <span className="project-card__index" aria-hidden="true">{String(index + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</span>
              <span className="project-card__caption">
                <span>
                  <strong>{project.title}</strong>
                  <small>
                    {project.category}{project.client_name ? ` · ${project.client_name}` : ""}
                  </small>
                </span>
                <span className="studio-circle" aria-hidden="true">
                  <ArrowIcon direction="up-right" size={16} />
                </span>
              </span>
              <span className="project-card__hover-note">Open case study <ArrowIcon direction="up-right" size={11} /></span>
            </button>
          ))}
        </div> : <div className="studio-work__empty" role="status">
          <span className="studio-eyebrow">Portfolio loading</span>
          <p>New case studies are being prepared. Start a conversation and we’ll share the work most relevant to your brief.</p>
          <a href="mailto:hello@zerocraft.in">Request the private reel <ArrowIcon direction="up-right" size={12} /></a>
        </div>}
        <div className="studio-work__footer">
          <a
            href="https://instagram.com/studio.zerocraft"
            target="_blank"
            rel="noopener noreferrer"
          >
            See the studio journal{" "}
            <span className="studio-circle">
              <ArrowIcon direction="up-right" size={15} />
            </span>
          </a>
        </div>
      </div>
      <dialog
        ref={dialog}
        data-lenis-prevent
        className="project-dialog"
        aria-labelledby="project-title"
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        {selected && (
          <div className="project-dialog__content">
            <button
              autoFocus
              className="project-dialog__close"
              aria-label="Close project"
              onClick={() => dialog.current?.close()}
            >
              <StudioGlyph variant="close" size={17} />
            </button>
            <div className="project-dialog__image">
              <Image
                src={selected.image_url}
                alt={`${selected.title} — ${selected.category}`}
                fill
                sizes="(max-width: 700px) 90vw, 700px"
              />
            </div>
            <div className="project-dialog__copy">
              <span className="studio-eyebrow">{selected.category}</span>
              <h2 id="project-title">{selected.title}</h2>
              <p>{selected.description || "A Zerocraft Studio project."}</p>
              <a href="mailto:hello@zerocraft.in">
                Discuss a similar project <ArrowIcon direction="up-right" size={12} />
              </a>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
