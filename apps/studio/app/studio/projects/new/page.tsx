"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ListChecks,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { Button } from "@zerocraft/ui/components/button";
import { useStudioAppearance } from "@/components/providers/studio-appearance-provider";
import { readableAccentForeground } from "@/lib/studio-appearance";
import { studioToast } from "@/lib/studio-toast";

const statusMeta = {
  planning: { label: "Planning", hint: "Scope is taking shape", dot: "bg-sky-300" },
  active: { label: "Active", hint: "Work is in motion", dot: "bg-emerald-300" },
  review: { label: "Review", hint: "Awaiting feedback", dot: "bg-amber-300" },
  completed: { label: "Completed", hint: "Delivered and signed off", dot: "bg-zinc-200" },
  on_hold: { label: "On hold", hint: "Paused for now", dot: "bg-orange-300" },
  cancelled: { label: "Cancelled", hint: "No longer moving", dot: "bg-red-300" },
} as const;

type Status = keyof typeof statusMeta;
type Member = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};
type MilestoneDraft = { key: number; title: string; due_date: string };

const statusOrder = Object.keys(statusMeta) as Status[];
const deadlinePresets = [
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
] as const;

const panelClass =
  "rounded-[32px] border border-white/[.1] bg-white/[.06] backdrop-blur-[28px]";
const inputClass =
  "h-11 w-full rounded-2xl border border-white/[.14] bg-white/[.06] px-3.5 text-[15px] text-white outline-none transition-colors placeholder:text-zinc-400 focus:border-[var(--brand-accent)]";
const labelClass =
  "block text-[11px] font-medium uppercase tracking-[.16em] text-zinc-400";

function memberName(member?: Member | null) {
  if (!member) return "";
  return member.full_name?.trim() || member.email?.trim() || "";
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SectionHeader({
  step,
  title,
  description,
  action,
}: {
  step: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/[.14] bg-white/[.04] text-[11px] font-medium tabular-nums text-zinc-400">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-medium leading-none">{title}</h2>
          <p className="mt-1.5 text-sm text-zinc-400">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const { appearance } = useStudioAppearance();
  const accent = appearance.accentColor;
  const accentForeground = readableAccentForeground(accent);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("planning");
  const [ownerId, setOwnerId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [progress, setProgress] = useState(0);
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const keyRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/studio/projects", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load the team list.");
        if (!cancelled) setMembers(Array.isArray(payload.members) ? payload.members : []);
      } catch (caught) {
        if (!cancelled) {
          setMembersError(
            caught instanceof Error ? caught.message : "Could not load the team list.",
          );
        }
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const dirty = Boolean(
    name.trim() || description.trim() || budget || milestones.length,
  );

  useEffect(() => {
    if (!dirty || saving) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saving]);

  const owner = useMemo(
    () => members.find((member) => member.id === ownerId) ?? null,
    [members, ownerId],
  );
  const ownerName = memberName(owner);
  const ownerLabel = ownerName || (ownerId ? "Team member" : "");
  const ownerInitials = initials(ownerName);
  const plannedMilestones = milestones.filter((milestone) => milestone.title.trim());

  const checklist = [
    { label: "Brief is named", done: name.trim().length > 1 },
    { label: "Owner assigned", done: Boolean(ownerId) },
    { label: "Deadline set", done: Boolean(deadline) },
    { label: "Milestones planned", done: plannedMilestones.length > 0 },
  ];
  const readyCount = checklist.filter((item) => item.done).length;

  function addMilestone() {
    keyRef.current += 1;
    setMilestones((current) => [
      ...current,
      { key: keyRef.current, title: "", due_date: "" },
    ]);
  }

  function updateMilestone(key: number, patch: Partial<MilestoneDraft>) {
    setMilestones((current) =>
      current.map((milestone) =>
        milestone.key === key ? { ...milestone, ...patch } : milestone,
      ),
    );
  }

  function removeMilestone(key: number) {
    setMilestones((current) => current.filter((milestone) => milestone.key !== key));
  }

  function setDeadlineInDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    setDeadline(`${year}-${month}-${day}`);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");

    if (!name.trim()) {
      setError("Give the project a name before creating it.");
      nameRef.current?.focus();
      return;
    }

    const budgetValue = budget.trim() ? Number(budget) : null;
    if (budgetValue !== null && (!Number.isFinite(budgetValue) || budgetValue < 0)) {
      setError("Budget must be a positive number.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/studio/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          status,
          deadline: deadline || null,
          budget: budgetValue,
          progress,
          owner_id: ownerId || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create the project.");

      const projectId = payload.project?.id as string | undefined;
      studioToast.success("Project created", payload.project?.name ?? name.trim());
      if (projectId) {
        for (const milestone of plannedMilestones) {
          try {
            const milestoneResponse = await fetch(
              `/api/studio/projects/${projectId}/milestones`,
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  title: milestone.title.trim(),
                  due_date: milestone.due_date || null,
                }),
              },
            );
            if (!milestoneResponse.ok) {
              console.warn("Milestone could not be created", milestone.title.trim());
            }
          } catch {
            // The project already exists; milestones can be added from the board.
          }        }
      }

      router.push(
        projectId
          ? `/studio/projects?project=${encodeURIComponent(projectId)}`
          : "/studio/projects",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the project.");
      setSaving(false);
    }
  }

  return (
    <div className="relative -mx-8 -mb-10 min-h-[calc(100vh-32px)] p-5 pl-7 max-md:-mx-4 max-md:p-4">
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/studio/projects"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            All projects
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[.14] bg-white/[.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[.16em] text-zinc-400">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--brand-accent)]" />
            Draft
          </span>
        </div>

        <header className="mt-7 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-[var(--brand-accent)]">
            New project
          </p>
          <h1 className="mt-3 text-[clamp(36px,5.2vw,58px)] font-light leading-[.98] tracking-[-.04em]">
            Give the work a name.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            Set the brief, pick an owner, and sketch the delivery plan. Everything can be
            refined later from the project board.
          </p>
        </header>

        <form
          ref={formRef}
          onSubmit={submit}
          className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_356px]"
        >
          <div className="min-w-0 space-y-5">
            <section className={`${panelClass} p-6`}>
              <SectionHeader
                step="01"
                title="The brief"
                description="Name the project and capture what a great outcome looks like."
              />
              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="project-name" className={`${labelClass} mb-2`}>
                    Project name <span className="text-[var(--brand-accent)]">*</span>
                  </label>
                  <input
                    ref={nameRef}
                    id="project-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={180}
                    autoComplete="off"
                    placeholder="e.g. Monsoon campaign identity"
                    className={`${inputClass} h-12 text-[17px]`}
                    required
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label htmlFor="project-description" className={labelClass}>
                      Description
                    </label>
                    <span className="text-[11px] tabular-nums text-zinc-400">
                      {description.length.toLocaleString()} / 8,000
                    </span>
                  </div>
                  <textarea
                    id="project-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={8000}
                    rows={4}
                    placeholder="Scope, deliverables, and context for the team..."
                    className={`${inputClass} min-h-32 resize-y py-3 leading-relaxed`}
                  />
                </div>
              </div>
            </section>

            <section className={`${panelClass} p-6`}>
              <SectionHeader
                step="02"
                title="Status and ownership"
                description="Decide where this starts and who is accountable."
              />
              <div className="mt-6">
                <span className={`${labelClass} mb-2`}>Status</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {statusOrder.map((key) => {
                    const meta = statusMeta[key];
                    const selected = status === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setStatus(key)}
                        className={`flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-colors ${
                          selected
                            ? "border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)]"
                            : "border-white/[.1] bg-white/[.03] hover:border-white/25 hover:bg-white/[.06]"
                        }`}
                      >
                        <span className={`mt-1 size-2 shrink-0 rounded-full ${meta.dot}`} />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-tight">
                            {meta.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                            {meta.hint}
                          </span>
                        </span>
                        {selected && (
                          <Check className="ml-auto size-4 shrink-0 text-[var(--brand-accent)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="project-owner" className={`${labelClass} mb-2`}>
                    Owner
                  </label>
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/[.14] bg-white/[.05] text-xs font-medium text-zinc-300">
                      {ownerInitials ? (
                        ownerInitials
                      ) : (
                        <UserRound className="size-4 text-zinc-400" />
                      )}
                    </span>
                    <select
                      id="project-owner"
                      value={ownerId}
                      onChange={(event) => setOwnerId(event.target.value)}
                      disabled={membersLoading}
                      className={`${inputClass} bg-[#252528] ${
                        membersLoading ? "opacity-60" : ""
                      }`}
                    >
                      <option value="">{membersLoading ? "Loading team..." : "Unassigned"}</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {memberName(member) || "Unnamed teammate"}
                        </option>
                      ))}
                    </select>
                  </div>
                  {membersError && (
                    <p className="mt-2 text-[11px] leading-relaxed text-amber-200/80">
                      {membersError} You can assign an owner later.
                    </p>
                  )}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label htmlFor="project-progress" className={labelClass}>
                      Starting progress
                    </label>
                    <span className="rounded-full border border-white/[.14] px-2 py-0.5 text-[11px] tabular-nums text-zinc-300">
                      {progress}%
                    </span>
                  </div>
                  <input
                    id="project-progress"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={progress}
                    onChange={(event) => setProgress(Number(event.target.value))}
                    style={{ accentColor: "var(--brand-accent)" }}
                    className="h-11 w-full cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between text-[10px] uppercase tracking-[.1em] text-zinc-400">
                    <span>Not started</span>
                    <span>In delivery</span>
                    <span>Shipped</span>
                  </div>
                </div>
              </div>
            </section>

            <section className={`${panelClass} p-6`}>
              <SectionHeader
                step="03"
                title="Timeline and budget"
                description="A realistic deadline keeps the board honest."
              />
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="project-deadline" className={`${labelClass} mb-2`}>
                    Deadline
                  </label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="project-deadline"
                      type="date"
                      value={deadline}
                      onChange={(event) => setDeadline(event.target.value)}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {deadlinePresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setDeadlineInDays(preset.days)}
                        className="rounded-full border border-white/[.12] px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-white/30 hover:text-white"
                      >
                        {preset.label}
                      </button>
                    ))}
                    {deadline && (
                      <button
                        type="button"
                        onClick={() => setDeadline("")}
                        className="rounded-full px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="project-budget" className={`${labelClass} mb-2`}>
                    Budget
                  </label>
                  <div className="relative">
                    <Wallet className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="project-budget"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={budget}
                      onChange={(event) => setBudget(event.target.value)}
                      placeholder="0.00"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                    Optional planning figure. It stays internal to the studio.
                  </p>
                </div>
              </div>
            </section>

            <section className={`${panelClass} p-6`}>
              <SectionHeader
                step="04"
                title="Milestones"
                description="Break the delivery into a few checkpoints."
                action={
                  plannedMilestones.length > 0 ? (
                    <span className="rounded-full border border-white/[.14] px-2.5 py-1 text-[11px] tabular-nums text-zinc-400">
                      {plannedMilestones.length} planned
                    </span>
                  ) : undefined
                }
              />
              <div className="mt-6 space-y-2.5">
                {milestones.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/[.12] bg-white/[.02] px-4 py-7 text-center">
                    <ListChecks className="mx-auto size-5 text-zinc-400" />
                    <p className="mt-2 text-sm text-zinc-400">No milestones yet.</p>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      Add a first checkpoint or leave the plan for later.
                    </p>
                  </div>
                ) : (
                  milestones.map((milestone, index) => (
                    <div
                      key={milestone.key}
                      className="grid gap-2 rounded-2xl border border-white/[.08] bg-white/[.03] p-2.5 transition-colors focus-within:border-white/20 sm:grid-cols-[28px_minmax(0,1fr)_148px_36px] sm:items-center"
                    >
                      <span className="grid size-7 place-items-center rounded-full bg-white/[.06] text-[11px] tabular-nums text-zinc-400">
                        {index + 1}
                      </span>
                      <input
                        value={milestone.title}
                        onChange={(event) =>
                          updateMilestone(milestone.key, { title: event.target.value })
                        }
                        placeholder={`Milestone ${index + 1} - e.g. Concept sign-off`}
                        aria-label={`Milestone ${index + 1} title`}
                        maxLength={180}
                        className="h-9 min-w-0 rounded-xl border border-white/[.12] bg-white/[.05] px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-400 focus:border-[var(--brand-accent)]"
                      />
                      <input
                        type="date"
                        value={milestone.due_date}
                        onChange={(event) =>
                          updateMilestone(milestone.key, { due_date: event.target.value })
                        }
                        aria-label={`Milestone ${index + 1} due date`}
                        className="h-9 rounded-xl border border-white/[.12] bg-white/[.05] px-2 text-xs text-white outline-none focus:border-[var(--brand-accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => removeMilestone(milestone.key)}
                        aria-label={`Remove milestone ${index + 1}`}
                        className="grid size-9 place-items-center rounded-xl text-zinc-400 transition-colors hover:bg-red-400/10 hover:text-red-300"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={addMilestone}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[.16] py-3 text-sm text-zinc-400 transition-colors hover:border-[var(--brand-accent)] hover:text-white"
              >
                <Plus className="size-4" />
                Add milestone
              </button>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-5">
            <section className="rounded-[32px] border border-white/[.12] bg-white/[.055] p-5 backdrop-blur-[28px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-medium uppercase tracking-[.18em] text-zinc-400">
                  Live preview
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[.14] px-2.5 py-1 text-[11px] text-zinc-300">
                  <span className={`size-1.5 rounded-full ${statusMeta[status].dot}`} />
                  {statusMeta[status].label}
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-medium leading-tight tracking-[-.02em]">
                {name.trim() || "Untitled project"}
              </h2>
              <p className="mt-2 line-clamp-3 min-h-14 text-sm leading-relaxed text-zinc-400">
                {description.trim() || "Your project brief will appear here."}
              </p>
              <div className="mt-5 flex items-end justify-between gap-3 text-xs text-zinc-400">
                <span className="tabular-nums">{progress}% complete</span>
                <span className="truncate">
                  {deadline ? formatDate(deadline) : "No deadline"}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                <span
                  className="block h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: "var(--brand-accent)" }}
                />
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-white/[.08] pt-4 text-xs text-zinc-400">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-white/[.14] bg-white/[.05] text-[10px] font-medium text-zinc-300">
                  {ownerInitials ? (
                    ownerInitials
                  ) : (
                    <UserRound className="size-3.5 text-zinc-400" />
                  )}
                </span>
                <span className="truncate">{ownerLabel || "Unassigned"}</span>
                <span className="ml-auto shrink-0">
                  {plannedMilestones.length} milestone
                  {plannedMilestones.length === 1 ? "" : "s"}
                </span>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/[.1] bg-white/[.04] p-5 backdrop-blur-[28px]">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Setup checklist</h2>
                <span className="text-[11px] tabular-nums text-zinc-400">
                  {readyCount}/{checklist.length}
                </span>
              </div>
              <ul className="mt-3 space-y-2.5">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                        item.done
                          ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]"
                          : "border-white/20 text-transparent"
                      }`}
                      style={item.done ? { color: accentForeground } : undefined}
                    >
                      <Check className="size-3" />
                    </span>
                    <span className={item.done ? "text-zinc-300" : "text-zinc-400"}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`${panelClass} p-5`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-[var(--brand-accent)]" />
                Ready when you are
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                This project will land on the board under{" "}
                <span className="text-zinc-300">{statusMeta[status].label}</span>. You can
                move it at any time.
              </p>
              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={saving}
                className="mt-4 h-12 w-full rounded-full text-[15px] font-medium shadow-lg transition-transform hover:scale-[1.01]"
                style={{ backgroundColor: accent, color: accentForeground }}
              >
                {saving ? <Loader2 className="animate-spin" /> : <Plus />}
                {saving ? "Creating project..." : "Create project"}
              </Button>
              <Link
                href="/studio/projects"
                className="mt-2 flex h-10 items-center justify-center rounded-full text-sm text-zinc-400 transition-colors hover:bg-white/[.05] hover:text-white"
              >
                Cancel
              </Link>
              <p className="mt-2 text-center text-[10px] uppercase tracking-[.14em] text-zinc-400">
                Ctrl + Enter to create
              </p>
            </section>

            <Link
              href="/studio/inquiries"
              className="flex items-center justify-between gap-3 rounded-[24px] border border-white/[.08] bg-white/[.02] px-4 py-3 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
            >
              <span>Converting a won lead instead?</span>
              <ArrowUpRight className="size-3.5 shrink-0" />
            </Link>
          </aside>
        </form>
      </div>
    </div>
  );
}
