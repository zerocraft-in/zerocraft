"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  FolderKanban,
  List,
  Network,
  Plus,
  Save,
  SquareKanban,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@zerocraft/ui/components/button";
import { StudioLoadTransition } from "@/components/studio-loading";
import { studioToast } from "@/lib/studio-toast";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@zerocraft/ui/components/empty";

type Status =
  | "planning"
  | "active"
  | "review"
  | "completed"
  | "on_hold"
  | "cancelled";
type Milestone = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "blocked" | "done";
  due_date: string | null;
  position: number;
};
type Member = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
};
type Project = {
  id: string;
  name: string;
  description: string;
  status: Status;
  deadline: string | null;
  budget: number | null;
  progress: number;
  owner_id: string | null;
  owner: Member | null;
  milestones: Milestone[];
  updated_at: string;
};
type View = "board" | "timeline" | "list";
const statuses: Status[] = [
  "planning",
  "active",
  "review",
  "completed",
  "on_hold",
  "cancelled",
];
const labels: Record<Status, string> = {
  planning: "Planning",
  active: "Active",
  review: "Review",
  completed: "Completed",
  on_hold: "On hold",
  cancelled: "Cancelled",
};
const glass =
  "border-white/[.1] bg-white/[.06] shadow-none backdrop-blur-[28px]";

function ProjectEditor({
  project,
  members,
  onSaved,
  onCancel,
}: {
  project?: Project;
  members: Member[];
  onSaved: (project: Project) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "planning",
    deadline: project?.deadline ?? "",
    budget: project?.budget?.toString() ?? "",
    progress: project?.progress?.toString() ?? "0",
    owner_id: project?.owner_id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        project ? `/api/studio/projects/${project.id}` : "/api/studio/projects",
        {
          method: project ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...values,
            budget: values.budget ? Number(values.budget) : null,
            progress: Number(values.progress),
            owner_id: values.owner_id || null,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Could not save project.");
      studioToast.success(
        project ? "Project updated" : "Project created",
        payload.project.name,
      );
      onSaved(payload.project);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save project.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="rounded-[30px] border border-orange-300/30 bg-orange-300/[.06] p-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-zinc-400">
          Project name
          <input
            required
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-white/[.14] bg-white/[.06] px-3 text-white outline-none"
          />
        </label>
        <label className="text-sm text-zinc-400">
          Status
          <select
            value={values.status}
            onChange={(event) => update("status", event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-white/[.14] bg-[#252528] px-3 text-white"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {labels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-400">
          Owner
          <select
            value={values.owner_id}
            onChange={(event) => update("owner_id", event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-white/[.14] bg-[#252528] px-3 text-white"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name || member.email}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-400">
          Deadline
          <input
            type="date"
            value={values.deadline}
            onChange={(event) => update("deadline", event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-white/[.14] bg-white/[.06] px-3 text-white outline-none"
          />
        </label>
        <label className="text-sm text-zinc-400">
          Budget
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.budget}
            onChange={(event) => update("budget", event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-white/[.14] bg-white/[.06] px-3 text-white outline-none"
          />
        </label>
        <label className="text-sm text-zinc-400">
          Progress (%)
          <input
            type="number"
            min="0"
            max="100"
            value={values.progress}
            onChange={(event) => update("progress", event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-white/[.14] bg-white/[.06] px-3 text-white outline-none"
          />
        </label>
      </div>
      <label className="mt-4 block text-sm text-zinc-400">
        Description
        <textarea
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          className="mt-1.5 min-h-24 w-full rounded-xl border border-white/[.14] bg-white/[.06] p-3 text-white outline-none"
        />
      </label>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-300/10 p-3 text-sm text-red-100"
        >
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={onCancel}
        >
          <X />
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="rounded-full">
          <Save />
          {saving ? "Saving…" : "Save project"}
        </Button>
      </div>
    </form>
  );
}

function ProjectInspector({
  project,
  members,
  onUpdated,
  onDeleted,
}: {
  project: Project;
  members: Member[];
  onUpdated: (project: Project) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function addMilestone(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/studio/projects/${project.id}/milestones`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, due_date: dueDate || null }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Could not add milestone.");
      studioToast.success("Milestone added", title.trim());
      setTitle("");
      setDueDate("");
      onUpdated({
        ...project,
        milestones: [...project.milestones, payload.milestone],
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not add milestone.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggleMilestone(milestone: Milestone) {
    setError("");
    try {
      const status = milestone.status === "done" ? "todo" : "done";
      const response = await fetch(
        `/api/studio/projects/${project.id}/milestones/${milestone.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Could not update milestone.");
      studioToast.success(
        milestone.status === "done" ? "Milestone reopened" : "Milestone completed",
        milestone.title,
      );
      onUpdated({
        ...project,
        milestones: project.milestones.map((item) =>
          item.id === milestone.id ? payload.milestone : item,
        ),
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update milestone.",
      );
    }
  }
  async function remove() {
    if (!window.confirm(`Delete ${project.name}?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/studio/projects/${project.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Could not delete project.");
      studioToast.success("Project deleted", project.name);
      onDeleted();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not delete project.",
      );
      setBusy(false);
    }
  }
  if (editing)
    return (
      <ProjectEditor
        project={project}
        members={members}
        onSaved={(next) => {
          onUpdated({
            ...next,
            owner:
              members.find((member) => member.id === next.owner_id) ?? null,
            milestones: project.milestones,
          });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  return (
    <aside
      className={`${glass} relative z-10 flex w-[350px] shrink-0 flex-col gap-4 rounded-[40px] p-6 max-[1180px]:w-full`}
    >
      <div>
        <div className="text-sm text-zinc-400">Live project</div>
        <h2 className="mt-1 text-[28px] font-light leading-tight tracking-tight">
          {project.name}
        </h2>
        <span className="mt-3 inline-flex rounded-full border border-white/20 px-2.5 py-1 text-xs">
          {labels[project.status]}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-[44px] font-light leading-none">
          {project.progress}
          <span className="ml-1 text-base opacity-70">%</span>
        </div>
        <span className="text-sm text-zinc-400">
          {project.deadline
            ? `due ${new Date(project.deadline).toLocaleDateString()}`
            : "No deadline"}
        </span>
      </div>
      <div>
        <div className="mb-1.5 text-[13px] text-zinc-400">Milestones</div>
        {project.milestones.length === 0 ? (
          <p className="py-2 text-sm text-zinc-500">No milestones yet.</p>
        ) : (
          project.milestones.map((milestone) => (
            <button
              key={milestone.id}
              type="button"
              onClick={() => void toggleMilestone(milestone)}
              className="flex w-full items-start gap-3 py-1.5 text-left text-sm"
            >
              <i
                className={`mt-1 size-3 shrink-0 rounded-full ${milestone.status === "done" ? "bg-white" : milestone.status === "blocked" ? "bg-red-400" : "border border-orange-400"}`}
              />{" "}
              <span
                className={
                  milestone.status === "done"
                    ? "text-zinc-500 line-through"
                    : ""
                }
              >
                {milestone.title}
                <small className="block text-xs text-zinc-500">
                  {milestone.status.replace("_", " ")}
                  {milestone.due_date
                    ? ` · ${new Date(milestone.due_date).toLocaleDateString()}`
                    : ""}
                </small>
              </span>
            </button>
          ))
        )}
      </div>
      <form
        onSubmit={addMilestone}
        className="border-t border-white/[.08] pt-4"
      >
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="New milestone"
            className="min-w-0 flex-1 rounded-xl border border-white/[.14] bg-white/[.06] px-3 py-2 text-sm text-white outline-none"
          />
          <Button disabled={busy || !title.trim()} size="sm" type="submit">
            <Plus />
          </Button>
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          className="mt-2 h-8 rounded-lg border border-white/[.14] bg-[#252528] px-2 text-xs text-white"
        />
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-300/10 p-2 text-xs text-red-100"
        >
          {error}
        </p>
      )}
      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button onClick={() => setEditing(true)} className="rounded-full">
          <Save />
          Edit
        </Button>
        <Button
          variant="outline"
          className="rounded-full border-red-300/30 text-red-200"
          disabled={busy}
          onClick={() => void remove()}
        >
          <Trash2 />
          Delete
        </Button>
      </div>
    </aside>
  );
}

export default function ProjectsDashboard() {
  const router = useRouter();
  const [view, setView] = useState<View>("board");
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/studio/projects", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      const nextProjects = payload.projects ?? [];
      setProjects(nextProjects);
      setMembers(payload.members ?? []);
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const requestedId = params?.get("project");
      setSelectedId((current) =>
        requestedId &&
        nextProjects.some((project: Project) => project.id === requestedId)
          ? requestedId
          : current &&
              nextProjects.some((project: Project) => project.id === current)
            ? current
            : (nextProjects[0]?.id ?? ""),
      );
      if (params?.get("new") === "1") {
        params.delete("new");
        const search = params.toString();
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${search ? `?${search}` : ""}`,
        );
        router.replace("/studio/projects/new");
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load projects.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const selected =
    projects.find((project) => project.id === selectedId) ?? null;
  const grouped = useMemo(
    () =>
      Object.fromEntries(
        statuses.map((status) => [
          status,
          projects.filter((project) => project.status === status),
        ]),
      ) as Record<Status, Project[]>,
    [projects],
  );
  function updateProject(next: Project) {
    setProjects((current) =>
      current.map((project) =>
        project.id === next.id ? { ...project, ...next } : project,
      ),
    );
  }
  return (
    <div className="relative -mx-8 -mb-10 min-h-[calc(100vh-32px)] overflow-hidden p-5 pl-7 max-md:-mx-4 max-md:p-4">
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
            <Button
              className="h-9 rounded-full"
              render={<Link href="/studio/projects/new" />}
            >
              <Plus />
              New project
            </Button>
          </div>
          <h1 className="mt-6 text-[50px] font-light  leading-none tracking-[-.03em] max-md:text-[38px]">
            Projects
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {loading
              ? "Loading live projects…"
              : `${projects.length} live project${projects.length === 1 ? "" : "s"}`}
          </p>
          {error && (
            <div
              role="alert"
              className="mt-4 rounded-2xl bg-red-300/10 p-4 text-sm text-red-100"
            >
              {error}
              <Button
                variant="outline"
                size="sm"
                className="ml-3 rounded-full"
                onClick={() => void load()}
              >
                Retry
              </Button>
            </div>
          )}
          <div className="mt-5 grid grid-cols-3 gap-3 max-md:grid-cols-1">
            {[
              [
                projects.filter((project) => project.status === "active")
                  .length,
                "Active",
              ],
              [
                projects.filter((project) => project.status === "on_hold")
                  .length,
                "On hold",
              ],
              [
                projects.filter((project) => project.status === "review")
                  .length,
                "In review",
              ],
            ].map(([value, label]) => (
              <div
                key={label}
                className={`${glass} flex min-h-[92px] items-end justify-between rounded-[28px] p-4 px-5`}
              >
                <b className="text-[44px] font-light leading-none">{value}</b>
                <span className="text-sm text-zinc-300">{label}</span>
              </div>
            ))}
          </div>
          <StudioLoadTransition
            loading={loading}
            label="Loading live projects…"
            loadingClassName="mt-5 min-h-32 rounded-[30px] border border-white/[.1]"
          >
          {projects.length === 0 ? (
            <Empty className="mt-6 rounded-[32px] border-white/10 bg-white/[.06] shadow-none backdrop-blur-[28px] p-16">
              <EmptyHeader>
                <EmptyMedia variant="accent">
                  <FolderKanban className="size-7" />
                </EmptyMedia>
                <EmptyTitle className="text-2xl font-light tracking-tight text-white">
                  No projects yet
                </EmptyTitle>
                <EmptyDescription className="max-w-md text-sm text-zinc-400">
                  Create your first project or convert a won lead to kickstart
                  your delivery timeline and milestone tracking.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  render={<Link href="/studio/projects/new" />}
                  className="h-11 rounded-full px-6 font-medium text-white shadow-lg transition-transform hover:scale-105"
                  style={{ backgroundColor: "var(--brand-accent)" }}
                >
                  <Plus size={16} className="mr-1.5" />
                  New project
                </Button>
              </EmptyContent>
            </Empty>
          ) : view === "board" ? (
            <div className="mt-5 overflow-x-auto pb-2">
              <div className="flex min-w-[1200px] gap-3.5">
                {statuses.map((status) => (
                  <section key={status} className="min-w-[185px] flex-1">
                    <div className="flex items-center justify-between px-1.5 pb-3 text-[15px] font-medium">
                      {labels[status]}
                      <span className="text-[13px] font-normal text-zinc-400">
                        {grouped[status].length}
                      </span>
                    </div>
                    {grouped[status].map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => setSelectedId(project.id)}
                        className={`mb-3 block w-full rounded-[28px] border p-4 text-left transition-colors ${selectedId === project.id ? "border-orange-500 shadow-[0_0_0_1px_#ff6a2b,0_0_34px_rgba(255,106,43,.25)]" : "border-white/[.1] bg-white/[.07] hover:bg-white/[.1]"}`}
                      >
                        <div className="text-[17px] font-medium leading-tight">
                          {project.name}
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-zinc-500">
                          {project.description || "No description"}
                        </p>
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
                          <span
                            className="block h-full rounded-full bg-[#ff6a2b]"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                          <span>{project.progress}%</span>
                          <span>
                            {project.owner?.full_name || "Unassigned"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </section>
                ))}
              </div>
            </div>
          ) : view === "timeline" ? (
            <div className={`${glass} mt-5 rounded-[32px] p-5`}>
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                  className="grid w-full grid-cols-[minmax(180px,1fr)_2fr_auto] items-center gap-4 border-t border-white/[.08] py-4 text-left text-sm max-md:grid-cols-1"
                >
                  <span>
                    {project.name}
                    <small className="mt-1 block text-xs text-zinc-500">
                      {labels[project.status]}
                    </small>
                  </span>
                  <div className="h-2 rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-orange-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-zinc-400">
                    {project.deadline
                      ? new Date(project.deadline).toLocaleDateString()
                      : "No due date"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className={`${glass} mt-5 overflow-hidden rounded-[32px]`}>
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 border-b border-white/[.1] px-5 py-3 text-xs uppercase tracking-wider text-zinc-500 max-md:hidden">
                <span>Project</span>
                <span>Status</span>
                <span>Progress</span>
                <span>Owner</span>
              </div>
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                  className="grid w-full grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 border-b border-white/[.08] px-5 py-4 text-left text-sm last:border-0 hover:bg-white/[.05] max-md:grid-cols-1"
                >
                  <span>
                    <b className="block font-medium">{project.name}</b>
                    <small className="text-zinc-400">
                      {project.deadline
                        ? `Due ${new Date(project.deadline).toLocaleDateString()}`
                        : "No deadline"}
                    </small>
                  </span>
                  <span className="text-zinc-300">
                    {labels[project.status]}
                  </span>
                  <span className="text-zinc-400">{project.progress}%</span>
                  <span className="text-zinc-400">
                    {project.owner?.full_name || "Unassigned"}
                  </span>
                </button>
              ))}
            </div>
          )}
          </StudioLoadTransition>
        </main>
        {selected && (
          <ProjectInspector
            project={selected}
            members={members}
            onUpdated={updateProject}
            onDeleted={() => {
              setProjects((current) =>
                current.filter((project) => project.id !== selected.id),
              );
              setSelectedId("");
            }}
          />
        )}
      </div>
    </div>
  );
}
