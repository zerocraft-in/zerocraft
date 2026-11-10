"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  Mail,
  Megaphone,
  Plus,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@zerocraft/ui/components/alert";
import { Badge } from "@zerocraft/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@zerocraft/ui/components/breadcrumb";
import { Button } from "@zerocraft/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@zerocraft/ui/components/field";
import { Input } from "@zerocraft/ui/components/input";
import { Kbd, KbdGroup } from "@zerocraft/ui/components/kbd";
import { SelectField } from "@zerocraft/ui/components/select-field";
import { Spinner } from "@zerocraft/ui/components/spinner";
import { Textarea } from "@zerocraft/ui/components/textarea";
import { useStudioAppearance } from "@/components/providers/studio-appearance-provider";
import { readableAccentForeground } from "@/lib/studio-appearance";
import { studioToast } from "@/lib/studio-toast";

const emailPattern = /^\S+@\S+\.\S+$/;

const emptyValues = {
  name: "",
  email: "",
  company: "",
  phone: "",
  service_interest: "",
  next_action: "",
  next_action_at: "",
  notes: "",
};

type Values = typeof emptyValues;
type FieldKey = keyof Values;

const sourceOptions = [
  { value: "manual", label: "Manual entry" },
  { value: "contact form", label: "Website contact form" },
  { value: "referral", label: "Referral" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "google", label: "Google search" },
  { value: "event", label: "Event or networking" },
  { value: "outreach", label: "Outbound outreach" },
  { value: "other", label: "Other" },
] as const;

const serviceSuggestions = [
  "Brand identity",
  "Website design & build",
  "Product design",
  "Campaign & content",
  "Motion & film",
  "Ongoing retainer",
];

const followUpPresets = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
] as const;

const panelClass =
  "rounded-[28px] border-white/[.1] bg-white/[.04] shadow-none backdrop-blur-2xl";
const focusRing =
  "focus-visible:border-[var(--brand-accent)] focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--brand-accent)_25%,transparent)]";
const inputClass = `h-11 rounded-xl text-[15px] placeholder:text-zinc-400 ${focusRing}`;
const selectClass = `h-11 rounded-xl bg-input/30 data-[size=default]:h-11 ${focusRing}`;

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
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
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
    <CardHeader className="border-b border-white/[.08] px-6 py-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-white/[.14] bg-white/[.04] text-[11px] font-medium tabular-nums text-zinc-400">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-[15px] font-medium">{title}</CardTitle>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{description}</p>
        </div>
        {action}
      </div>
    </CardHeader>
  );
}

function PreviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-zinc-400" />
      <span className="w-14 shrink-0 text-[10px] uppercase tracking-[.12em] text-zinc-400">
        {label}
      </span>
      <span className="truncate text-zinc-200">{value}</span>
    </div>
  );
}

export default function NewLeadPage() {
  const router = useRouter();
  const { appearance } = useStudioAppearance();
  const accent = appearance.accentColor;
  const accentForeground = readableAccentForeground(accent);

  const [values, setValues] = useState<Values>(emptyValues);
  const [source, setSource] = useState("manual");
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [error, setError] = useState("");
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!dirty || saving) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saving]);

  function markDirty() {
    setDirty(true);
    if (error) {
      setError("");
      setDuplicateId(null);
    }
  }

  function update(key: FieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    markDirty();
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  function changeSource(value: string) {
    setSource(value);
    markDirty();
  }

  function setFollowUpIn(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    update("next_action_at", local.toISOString().slice(0, 10));
  }

  function validate() {
    const next: Partial<Record<FieldKey, string>> = {};
    if (values.name.trim().length < 2) {
      next.name = "Add the lead's name (at least 2 characters).";
    }
    if (!emailPattern.test(values.email.trim())) {
      next.email = "Enter a valid email address.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      (next.name ? nameRef.current : emailRef.current)?.focus();
      return false;
    }
    return true;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !validate()) return;

    setSaving(true);
    setError("");
    setDuplicateId(null);
    try {
      const response = await fetch("/api/studio/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          name: values.name.trim(),
          email: values.email.trim(),
          company: values.company.trim(),
          phone: values.phone.trim(),
          service_interest: values.service_interest.trim(),
          next_action: values.next_action.trim(),
          notes: values.notes.trim(),
          source,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 409 && typeof payload?.leadId === "string") {
          setDuplicateId(payload.leadId);
        }
        throw new Error(payload?.error ?? "Could not create this lead. Try again.");
      }
      if (!payload?.lead?.id) {
        throw new Error("The lead was created but the response was incomplete.");
      }
      setDirty(false);
      studioToast.success("Lead created", payload.lead.name);
      router.push(`/studio/inquiries/${payload.lead.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create this lead. Try again.",
      );
      setSaving(false);
    }
  }

  const name = values.name.trim();
  const sourceLabel =
    sourceOptions.find((option) => option.value === source)?.label ?? source;
  const checklist = [
    { label: "Name captured", done: name.length > 1 },
    { label: "Email is valid", done: emailPattern.test(values.email.trim()) },
    { label: "Company identified", done: values.company.trim().length > 0 },
    { label: "Follow-up planned", done: values.next_action.trim().length > 0 },
    { label: "Context noted", done: values.notes.trim().length > 0 },
  ];
  const readyCount = checklist.filter((item) => item.done).length;
  const progress = Math.round((readyCount / checklist.length) * 100);

  return (
    <div className="relative -mx-8 -mb-10 min-h-[calc(100vh-32px)] p-5 pl-7 max-md:-mx-4 max-md:p-4">
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<Link href="/studio" />}
                  className="text-zinc-400 transition-colors hover:text-white"
                >
                  Studio
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-zinc-600" />
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<Link href="/studio/inquiries" />}
                  className="text-zinc-400 transition-colors hover:text-white"
                >
                  Pipeline
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-zinc-600" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-zinc-200">New lead</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[.14] bg-white/[.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[.16em] text-zinc-400">
            <span
              className={`size-1.5 rounded-full ${
                dirty ? "animate-pulse bg-[var(--brand-accent)]" : "bg-zinc-500"
              }`}
            />
            {dirty ? "Draft in progress" : "New inquiry"}
          </span>
        </div>

        <header className="mt-7 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-[var(--brand-accent)]">
            New lead
          </p>
          <h1 className="mt-3 text-[clamp(36px,5.2vw,58px)] font-light leading-[.98] tracking-[-.04em]">
            Start with the person.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            Capture who reached out, what they need, and the next step. You can
            move the lead through the pipeline later.
          </p>
        </header>

        <form
          ref={formRef}
          onSubmit={submit}
          noValidate
          className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_356px]"
        >
          <div className="min-w-0 space-y-5">
            <Card className={`${panelClass} gap-0 py-0`}>
              <SectionHeader
                step="01"
                title="Contact details"
                description="The basics we need to keep this conversation moving."
              />
              <CardContent className="px-6 py-6">
                <FieldGroup className="gap-5">
                  <Field data-invalid={Boolean(errors.name)}>
                    <FieldLabel htmlFor="lead-name" className="text-[13px] text-zinc-300">
                      Name <span className="text-[var(--brand-accent)]">*</span>
                    </FieldLabel>
                    <Input
                      ref={nameRef}
                      id="lead-name"
                      name="name"
                      value={values.name}
                      onChange={(event) => update("name", event.target.value)}
                      placeholder="e.g. Ananya Kumar"
                      autoComplete="name"
                      maxLength={160}
                      required
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "lead-name-error" : undefined}
                      className={inputClass}
                    />
                    <FieldError id="lead-name-error">{errors.name}</FieldError>
                  </Field>

                  <Field data-invalid={Boolean(errors.email)}>
                    <FieldLabel htmlFor="lead-email" className="text-[13px] text-zinc-300">
                      Email <span className="text-[var(--brand-accent)]">*</span>
                    </FieldLabel>
                    <Input
                      ref={emailRef}
                      id="lead-email"
                      name="email"
                      type="email"
                      value={values.email}
                      onChange={(event) => update("email", event.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                      maxLength={320}
                      required
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? "lead-email-error" : "lead-email-hint"
                      }
                      className={inputClass}
                    />
                    {errors.email ? (
                      <FieldError id="lead-email-error">{errors.email}</FieldError>
                    ) : (
                      <FieldDescription id="lead-email-hint" className="text-xs text-zinc-400">
                        We check for an existing active lead with the same address.
                      </FieldDescription>
                    )}
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field>
                      <FieldLabel
                        htmlFor="lead-company"
                        className="text-[13px] text-zinc-300"
                      >
                        Company
                      </FieldLabel>
                      <Input
                        id="lead-company"
                        name="company"
                        value={values.company}
                        onChange={(event) => update("company", event.target.value)}
                        placeholder="Studio or brand"
                        autoComplete="organization"
                        maxLength={180}
                        className={inputClass}
                      />
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor="lead-phone"
                        className="text-[13px] text-zinc-300"
                      >
                        Phone
                      </FieldLabel>
                      <Input
                        id="lead-phone"
                        name="phone"
                        type="tel"
                        value={values.phone}
                        onChange={(event) => update("phone", event.target.value)}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                        maxLength={60}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card className={`${panelClass} gap-0 py-0`}>
              <SectionHeader
                step="02"
                title="What they need"
                description="Point the lead at the right offer and remember where it came from."
              />
              <CardContent className="px-6 py-6">
                <FieldGroup className="gap-5">
                  <Field>
                    <FieldLabel
                      htmlFor="lead-service"
                      className="text-[13px] text-zinc-300"
                    >
                      Service interest
                    </FieldLabel>
                    <Input
                      id="lead-service"
                      name="service_interest"
                      list="lead-service-options"
                      value={values.service_interest}
                      onChange={(event) =>
                        update("service_interest", event.target.value)
                      }
                      placeholder="e.g. Brand identity"
                      maxLength={180}
                      className={inputClass}
                    />
                    <datalist id="lead-service-options">
                      {serviceSuggestions.map((service) => (
                        <option key={service} value={service} />
                      ))}
                    </datalist>
                    <FieldDescription className="text-xs text-zinc-400">
                      Pick a suggestion or type the request in their own words.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="lead-source"
                      className="text-[13px] text-zinc-300"
                    >
                      Source
                    </FieldLabel>
                    <SelectField
                      id="lead-source"
                      value={source}
                      onValueChange={changeSource}
                      options={sourceOptions}
                      aria-label="Lead source"
                      className={selectClass}
                    />
                    <FieldDescription className="text-xs text-zinc-400">
                      Where this conversation started. It helps us see what is working.
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card className={`${panelClass} gap-0 py-0`}>
              <SectionHeader
                step="03"
                title="Follow-up"
                description="Give this lead a clear next step and a date to act on it."
              />
              <CardContent className="px-6 py-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      htmlFor="lead-next-action"
                      className="text-[13px] text-zinc-300"
                    >
                      Next action
                    </FieldLabel>
                    <Input
                      id="lead-next-action"
                      name="next_action"
                      value={values.next_action}
                      onChange={(event) => update("next_action", event.target.value)}
                      placeholder="e.g. Send the brand questionnaire"
                      maxLength={300}
                      className={inputClass}
                    />
                    <FieldDescription className="text-xs text-zinc-400">
                      One clear step keeps the follow-up honest.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel
                        htmlFor="lead-follow-up"
                        className="text-[13px] text-zinc-300"
                      >
                        Follow-up date
                      </FieldLabel>
                      {values.next_action_at && (
                        <button
                          type="button"
                          onClick={() => update("next_action_at", "")}
                          className="text-[11px] text-zinc-400 transition-colors hover:text-white"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <Input
                      id="lead-follow-up"
                      name="next_action_at"
                      type="date"
                      value={values.next_action_at}
                      onChange={(event) =>
                        update("next_action_at", event.target.value)
                      }
                      className={inputClass}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {followUpPresets.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="outline"
                          size="xs"
                          className="rounded-full border-white/15 text-[11px] text-zinc-300"
                          onClick={() => setFollowUpIn(preset.days)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className={`${panelClass} gap-0 py-0`}>
              <SectionHeader
                step="04"
                title="Context"
                description="Anything worth remembering before the first reply."
                action={
                  <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                    {values.notes.length.toLocaleString()} / 4,000
                  </span>
                }
              />
              <CardContent className="px-6 py-6">
                <Field>
                  <FieldLabel htmlFor="lead-notes" className="sr-only">
                    Notes
                  </FieldLabel>
                  <Textarea
                    id="lead-notes"
                    name="notes"
                    value={values.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    maxLength={4000}
                    rows={6}
                    placeholder="Budget signals, links, referral context, or anything the client already shared..."
                    className="min-h-32 rounded-xl text-[15px] leading-relaxed placeholder:text-zinc-400 focus-visible:border-[var(--brand-accent)] focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--brand-accent)_25%,transparent)]"
                  />
                  <FieldDescription className="text-xs text-zinc-400">
                    Only your team sees this. Keep it short and useful.
                  </FieldDescription>
                </Field>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <Card className={`${panelClass} gap-0 py-0`}>
              <CardHeader className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-medium">Live preview</CardTitle>
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-white/15 text-[10px] font-medium uppercase tracking-[.12em] text-zinc-300"
                  >
                    <span className="size-1.5 rounded-full bg-sky-400" />
                    New
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex items-center gap-3 border-t border-white/[.08] pt-4">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-full text-sm font-medium"
                    style={{ backgroundColor: accent, color: accentForeground }}
                  >
                    {initials(values.name) || "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium">
                      {name || "New lead"}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {values.company.trim() || "No company yet"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                  <Mail className="size-3.5 shrink-0 text-zinc-400" />
                  <span className="truncate">
                    {values.email.trim() || "Email pending"}
                  </span>
                </div>

                <div className="mt-4 space-y-2.5 border-t border-white/[.08] pt-4 text-xs">
                  <PreviewRow
                    icon={Target}
                    label="Interest"
                    value={values.service_interest.trim() || "Not set"}
                  />
                  <PreviewRow icon={Megaphone} label="Source" value={sourceLabel} />
                  <PreviewRow
                    icon={CalendarDays}
                    label="Follow-up"
                    value={
                      values.next_action_at
                        ? formatDate(values.next_action_at)
                        : "Not scheduled"
                    }
                  />
                </div>

                {values.next_action.trim() && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/[.08] bg-white/[.03] px-3 py-2 text-xs text-zinc-300">
                    <Clock3 className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
                    <span className="min-w-0 truncate">{values.next_action.trim()}</span>
                  </div>
                )}

                <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
                  Nothing is saved until you create the lead. You can still edit
                  everything afterwards.
                </p>
              </CardContent>
            </Card>

            <Card className={`${panelClass} gap-0 py-0`}>
              <CardHeader className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-medium">Capture checklist</CardTitle>
                  <span className="text-[11px] tabular-nums text-zinc-400">
                    {readyCount}/{checklist.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${progress}%`, backgroundColor: accent }}
                  />
                </div>
                <ul className="mt-4 space-y-2.5">
                  {checklist.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center gap-2.5 text-[13px]"
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                          item.done
                            ? "border-transparent"
                            : "border-white/20 text-transparent"
                        }`}
                        style={
                          item.done
                            ? { backgroundColor: accent, color: accentForeground }
                            : undefined
                        }
                      >
                        <Check className="size-3" />
                      </span>
                      <span className={item.done ? "text-zinc-300" : "text-zinc-400"}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className={`${panelClass} gap-0 py-0`}>
              <CardContent className="px-5 py-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="size-4" style={{ color: accent }} />
                  Ready when you are
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  {name ? (
                    <>
                      Adding <span className="text-zinc-200">{name}</span> to the
                      pipeline as a new lead.
                    </>
                  ) : (
                    "Add a name and email to create the lead. Everything else is optional."
                  )}
                </p>

                {error && (
                  <Alert
                    variant="destructive"
                    className="mt-3 rounded-xl border-red-400/30 bg-red-400/10 px-3 py-2"
                  >
                    <CircleAlert />
                    <AlertTitle className="text-xs">
                      Could not create this lead
                    </AlertTitle>
                    <AlertDescription className="text-[11px] text-red-200/90">
                      {error}
                      {duplicateId && (
                        <Link
                          href={`/studio/inquiries/${duplicateId}`}
                          className="mt-1.5 flex items-center gap-1 font-medium text-red-100 underline underline-offset-4"
                        >
                          Open the existing lead
                          <ArrowUpRight className="size-3" />
                        </Link>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={saving}
                  className="mt-4 h-12 w-full rounded-full text-[15px] font-medium shadow-lg transition-transform hover:scale-[1.01]"
                  style={{ backgroundColor: accent, color: accentForeground }}
                >
                  {saving ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                  {saving ? "Creating lead..." : "Create lead"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  render={<Link href="/studio/inquiries" />}
                  className="mt-1 h-10 w-full rounded-full text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>

                <div className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] uppercase tracking-[.14em] text-zinc-400">
                  <KbdGroup>
                    <Kbd>Ctrl</Kbd>
                    <Kbd>Enter</Kbd>
                  </KbdGroup>
                  to create
                </div>
              </CardContent>
            </Card>

            <Link
              href="/studio/projects/new"
              className="group flex items-center justify-between gap-3 rounded-[24px] border border-white/[.08] bg-white/[.02] px-4 py-3 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
            >
              <span>
                <span className="block text-sm text-zinc-200 group-hover:text-white">
                  Already won the work?
                </span>
                Start a project instead of a lead.
              </span>
              <ArrowUpRight className="size-4 shrink-0" />
            </Link>
          </aside>
        </form>
      </div>
    </div>
  );
}
