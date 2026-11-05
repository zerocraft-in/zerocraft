"use client";

import { useState } from "react";
import Link from "next/link";
import { List, Network, Plus, Settings2, SquareKanban } from "lucide-react";
import { Button } from "@zerocraft/ui/components/button";

type Project = {
  client: string;
  title: string;
  status: "On track" | "At risk" | "Needs client input";
  progress: number;
  due: string;
  team: string[];
};

const columns: { name: string; projects: Project[] }[] = [
  {
    name: "Discovery",
    projects: [
      {
        client: "Orbit",
        title: "App onboarding flow",
        status: "On track",
        progress: 12,
        due: "Due Jan 15",
        team: ["RB", "CH"],
      },
      {
        client: "Pine & Co",
        title: "Packaging system",
        status: "On track",
        progress: 8,
        due: "Due Feb 6",
        team: ["AK"],
      },
    ],
  },
  {
    name: "Design",
    projects: [
      {
        client: "Northwind",
        title: "Rebrand and brand system",
        status: "On track",
        progress: 68,
        due: "Due Dec 4",
        team: ["AK", "MR", "SL"],
      },
      {
        client: "Verde",
        title: "Spring campaign visuals",
        status: "On track",
        progress: 54,
        due: "Due Nov 30",
        team: ["TV", "JD"],
      },
    ],
  },
  {
    name: "Development",
    projects: [
      {
        client: "Atlas Labs",
        title: "Atlas product site",
        status: "At risk",
        progress: 41,
        due: "Due Nov 28",
        team: ["AK", "ZS", "PN"],
      },
      {
        client: "Harbor",
        title: "Website refresh",
        status: "On track",
        progress: 47,
        due: "Due Dec 12",
        team: ["PN", "RB"],
      },
    ],
  },
  {
    name: "Review",
    projects: [
      {
        client: "Lumen",
        title: "Launch film",
        status: "Needs client input",
        progress: 88,
        due: "Due Nov 14",
        team: ["MR", "SL"],
      },
    ],
  },
  {
    name: "Launch",
    projects: [
      {
        client: "Quill",
        title: "Annual report microsite",
        status: "On track",
        progress: 96,
        due: "Due Nov 8",
        team: ["CH", "ZS"],
      },
    ],
  },
];

const glass =
  "border-white/[.1] bg-white/[.06] shadow-none backdrop-blur-[28px]";

function AvatarStack({ names }: { names: string[] }) {
  return (
    <span className="flex">
      {names.map((name) => (
        <i
          key={name}
          className="-ml-1.5 grid size-6 place-items-center rounded-full border-2 border-[#1c1c20] bg-[#3a3a40] text-[10px] font-semibold not-italic text-white first:ml-0"
        >
          {name}
        </i>
      ))}
    </span>
  );
}

function ProjectCard({
  project,
  selected,
  onSelect,
}: {
  project: Project;
  selected: boolean;
  onSelect: () => void;
}) {
  const statusClass =
    project.status === "At risk"
      ? "bg-white text-[#0a0a0b]"
      : project.status === "Needs client input"
        ? "border-violet-300 bg-violet-300/20 text-violet-100"
        : "border-white/25";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`mb-3 block w-full rounded-[28px] border p-4 text-left transition-colors ${selected ? "border-orange-500 shadow-[0_0_0_1px_#ff6a2b,0_0_34px_rgba(255,106,43,.25)]" : "border-white/[.1] bg-white/[.07] hover:bg-white/[.1]"}`}
    >
      <div className="text-[13px] text-zinc-400">{project.client}</div>
      <div className="mt-1 text-[17px] font-medium leading-tight">
        {project.title}
      </div>
      <span
        className={`mt-3 inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${statusClass}`}
      >
        <span aria-hidden="true">
          {project.status === "At risk"
            ? "▲"
            : project.status === "Needs client input"
              ? "■"
              : "●"}
        </span>
        {project.status}
      </span>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"
        role="img"
        aria-label={`${project.progress} percent complete`}
      >
        <span
          className="block h-full rounded-full bg-[#ff6a2b]"
          style={{ width: `${project.progress}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-[13px] text-zinc-400">
        <span>{project.due}</span>
        <AvatarStack names={project.team} />
      </div>
    </button>
  );
}

function ProjectInspector() {
  return (
    <aside
      aria-label="Project detail: Atlas product site"
      className={`${glass} relative z-10 flex w-[350px] shrink-0 flex-col gap-4 rounded-[40px] p-6 max-[1180px]:m-0 max-[1180px]:mb-4 max-[1180px]:w-full`}
    >
      <div>
        <div className="text-sm text-zinc-400">Atlas Labs</div>
        <h2 className="mt-1 text-[28px] font-light leading-tight tracking-tight">
          Atlas product site
        </h2>
        <span className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-2.5 text-xs font-medium text-[#0a0a0b]">
          ▲ At risk
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-[44px] font-light leading-none tracking-tight">
          41<span className="ml-1 text-base opacity-70">%</span>
        </div>
        <span className="font-mono text-sm text-zinc-400">due 28 nov</span>
      </div>
      <div>
        <div className="mb-1.5 text-[13px] text-zinc-400">Milestones</div>
        {["Kickoff and discovery", "Wireframes approved"].map((item) => (
          <div key={item} className="flex items-start gap-3 py-1.5 text-sm">
            <i className="mt-1 size-3 shrink-0 rounded-full bg-white not-italic" />
            {item}
          </div>
        ))}
        <div className="flex items-start gap-3 py-1.5 text-sm">
          <i className="mt-1 size-3 shrink-0 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(255,106,43,.25)] not-italic" />
          <span>
            Homepage build
            <br />
            <span className="text-[13px] text-zinc-400">Waiting on review</span>
          </span>
        </div>
        {["QA and accessibility", "Launch"].map((item) => (
          <div
            key={item}
            className="flex items-start gap-3 py-1.5 text-sm text-zinc-400"
          >
            <i className="mt-1 size-3 shrink-0 rounded-full border border-white/50 not-italic" />
            {item}
          </div>
        ))}
      </div>
      <div>
        {[
          ["Budget", "$48K"],
          ["Spent", "$31K"],
          ["Est. margin", "34%"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between border-t border-white/[.08] py-2 text-sm"
          >
            <span className="text-zinc-400">{label}</span>
            <b className="font-medium">{value}</b>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-white/[.08] py-2 text-sm">
          <span className="text-zinc-400">Team</span>
          <AvatarStack names={["AK", "ZS", "PN"]} />
        </div>
      </div>
      <div className="mt-auto flex gap-2">
        <Button className="flex-1 rounded-full">Request approval</Button>
        <Button variant="outline" className="flex-1 rounded-full">
          Open project
        </Button>
      </div>
    </aside>
  );
}

export default function ProjectsDashboard() {
  const [view, setView] = useState<"board" | "timeline" | "list">("board");
  const [selected, setSelected] = useState("Atlas product site");
  const allProjects = columns.flatMap((column) => column.projects);

  return (
    <div className="relative -mx-8 -mb-10 min-h-[calc(100vh-32px)] overflow-hidden  p-5 pl-7 max-md:-mx-4 max-md:p-4">

      <div className="relative z-10 flex min-w-0 flex-1 flex-wrap gap-5">
        <main className="min-w-[360px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/studio"
              className="mr-auto text-[15px] text-zinc-400 hover:text-white"
            >
              ZeroCraft Studio <span className="mx-1">/</span>{" "}
              <span className="text-white">Projects</span>
            </Link>
            {(
              [
                ["board", "Board", SquareKanban],
                ["timeline", "Timeline", Network],
                ["list", "List", List],
              ] as const
            ).map(([value, label, Icon]) => (
              <Button
                key={value}
                variant={view === value ? "default" : "outline"}
                size="sm"
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className="h-9 rounded-full px-3"
              >
                <Icon />
                {label}
              </Button>
            ))}
            <Button className="h-9 rounded-full">
              <Plus />
              New project
            </Button>
          </div>
          <h1 className="mt-6 text-[50px] font-light leading-none tracking-[-.03em] max-md:text-[38px]">
            Projects
          </h1>
          <div className="mt-5 grid grid-cols-3 gap-3 max-md:grid-cols-1">
            {[
              ["12", "Active"],
              ["2", "At risk"],
              ["3", "Need client input"],
            ].map(([value, label]) => (
              <div
                key={label}
                className={`${glass} flex min-h-[92px] items-end justify-between rounded-[28px] p-4 px-5`}
              >
                <b className="text-[44px] font-light leading-none tracking-tight">
                  {value}
                </b>
                <span className="text-sm text-zinc-300">{label}</span>
              </div>
            ))}
          </div>
          {view === "board" && (
            <div
              className="mt-5 overflow-x-auto pb-2"
              role="region"
              aria-label="Project board"
            >
              <div className="flex min-w-[1050px] gap-3.5">
                {columns.map((column) => (
                  <section key={column.name} className="min-w-[200px] flex-1">
                    <div className="flex items-center justify-between px-1.5 pb-3 text-[15px] font-medium">
                      {column.name}
                      <span className="text-[13px] font-normal text-zinc-400">
                        {column.projects.length}
                      </span>
                    </div>
                    {column.projects.map((project) => (
                      <ProjectCard
                        key={project.title}
                        project={project}
                        selected={selected === project.title}
                        onSelect={() => setSelected(project.title)}
                      />
                    ))}
                  </section>
                ))}
              </div>
            </div>
          )}
          {view === "timeline" && (
            <div className={`${glass} mt-5 rounded-[32px] p-5`}>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-medium">Project timeline</h2>
                <Settings2 className="text-zinc-400" size={18} />
              </div>
              {allProjects.map((project) => (
                <div
                  key={project.title}
                  className="grid grid-cols-[minmax(180px,1fr)_2fr_auto] items-center gap-4 border-t border-white/[.08] py-3 text-sm max-md:grid-cols-1"
                >
                  <span>{project.title}</span>
                  <div className="h-2 rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-orange-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-zinc-400">{project.due}</span>
                </div>
              ))}
            </div>
          )}
          {view === "list" && (
            <div className={`${glass} mt-5 overflow-hidden rounded-[32px]`}>
              <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-4 border-b border-white/[.1] px-5 py-3 text-xs uppercase tracking-wider text-zinc-500 max-md:hidden">
                <span>Project</span>
                <span>Status</span>
                <span>Progress</span>
                <span>Due</span>
              </div>
              {allProjects.map((project) => (
                <button
                  key={project.title}
                  type="button"
                  onClick={() => setSelected(project.title)}
                  className="grid w-full grid-cols-[1.5fr_1fr_1fr_auto] gap-4 border-b border-white/[.08] px-5 py-4 text-left text-sm last:border-0 hover:bg-white/[.05] max-md:grid-cols-1"
                >
                  <span>
                    <b className="block font-medium">{project.title}</b>
                    <small className="text-zinc-400">{project.client}</small>
                  </span>
                  <span className="text-zinc-300">{project.status}</span>
                  <span className="text-zinc-400">{project.progress}%</span>
                  <span className="text-zinc-400">{project.due}</span>
                </button>
              ))}
            </div>
          )}
        </main>
        <ProjectInspector />
      </div>
    </div>
  );
}
