"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFormState, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@zerocraft/ui/toast";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";

import { Input } from "@zerocraft/ui/input";
import { Switch } from "@zerocraft/ui/switch";
import { Badge } from "@zerocraft/ui/badge";
import { updateBusinessDetails } from "@/app/(dashboard)/settings/actions";
import { Building2, Search, X, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsDirtyForm } from "@/components/providers/dirty-provider";

// ─────────────────────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const PHONE_COUNTRIES = [
  { value: "IN", label: "India (+91)", dial: "+91", flag: "🇮🇳" },
  { value: "US", label: "United States (+1)", dial: "+1", flag: "🇺🇸" },
  { value: "GB", label: "United Kingdom (+44)", dial: "+44", flag: "🇬🇧" },
  { value: "AE", label: "UAE (+971)", dial: "+971", flag: "🇦🇪" },
  { value: "SG", label: "Singapore (+65)", dial: "+65", flag: "🇸🇬" },
];

const BUSINESS_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
  { value: "public_company", label: "Public Company" },
  { value: "private_limited", label: "Private Company" },
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "llp", label: "Limited Liability Partnership" },
  { value: "partnership", label: "Unincorporated Partnership" },
];

const NATIONALITIES = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const COUNTRY_FLAGS: Record<string, string> = {
  IN: "🇮🇳",
  US: "🇺🇸",
  GB: "🇬🇧",
  AE: "🇦🇪",
  SG: "🇸🇬",
  CA: "🇨🇦",
  AU: "🇦🇺",
};

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema
// ─────────────────────────────────────────────────────────────────────────────

const schema = z.object({
  country: z.string().min(1),
  businessType: z.string().min(1, "Select a business type"),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  dobMonth: z.string().min(1, "Month is required"),
  dobDay: z.string().min(1, "Day is required"),
  dobYear: z.string().min(1, "Year is required"),
  nationality: z.string().min(1, "Select a nationality"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(254)
    .optional()
    .or(z.literal("")),
  residentialAddress: z.string().trim().min(1, "Address is required"),
  apartment: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "Select a state"),
  pinCode: z.string().trim().min(1, "PIN code is required").max(10),
  legalBusinessName: z.string().trim().optional().or(z.literal("")),
  businessAddress: z.string().trim().optional().or(z.literal("")),
  businessApartment: z.string().trim().optional().or(z.literal("")),
  businessCity: z.string().trim().optional().or(z.literal("")),
  businessState: z.string().trim().optional().or(z.literal("")),
  businessPinCode: z.string().trim().optional().or(z.literal("")),
  businessPhoneCountry: z.string().optional(),
  businessPhone: z.string().trim().optional().or(z.literal("")),
  showOptional: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

type AddressValue = {
  raw?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  businessType?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  legalBusinessName?: string | null;
  businessAddress?: string | null;
  businessApartment?: string | null;
  businessCity?: string | null;
  businessState?: string | null;
  businessPinCode?: string | null;
  businessPhoneCountry?: string | null;
  businessPhone?: string | null;
};

export type AboutYourBusinessDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    address: Record<string, unknown> | null;
    country: string | null;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Atomic sub-components (semantic Tailwind / shadcn tokens)
// ─────────────────────────────────────────────────────────────────────────────

function FieldLabel({
  children,
  htmlFor,
  required,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-foreground mb-1 leading-none"
    >
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -3 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1 text-xs text-destructive leading-none"
    >
      {message}
    </motion.p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-foreground leading-none">
      {children}
    </h2>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// Reusable input class helper
function inputCls(hasError?: boolean) {
  return cn(
    "h-9 px-3 text-sm border-input rounded-lg bg-background",
    "placeholder:text-muted-foreground",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
    hasError && "border-destructive focus-visible:ring-destructive/40",
  );
}

function selectTriggerCls(hasError?: boolean) {
  return cn(
    "h-9 px-3 text-sm border-input w-full rounded-lg bg-background",
    "focus:ring-2 focus:ring-ring focus:ring-offset-0",
    hasError && "border-destructive focus:ring-destructive/40",
  );
}

function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      className={cn(selectTriggerCls(), "appearance-none", className)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// button variants (used inline where shadcn Button isn't enough)
// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function AboutYourBusinessDrawer({
  open,
  onOpenChange,
  org,
}: AboutYourBusinessDrawerProps) {
  const router = useRouter();
  const address = (org.address ?? {}) as AddressValue;
  const nameParts = (org.name ?? "").trim().split(/\s+/);
  const defaultFirst = nameParts[0] ?? "";
  const defaultLast = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const storedDob = address.dateOfBirth ? new Date(address.dateOfBirth) : null;
  const defaultDob =
    storedDob && !Number.isNaN(storedDob.getTime())
      ? {
          month: String(storedDob.getMonth() + 1).padStart(2, "0"),
          day: String(storedDob.getDate()).padStart(2, "0"),
          year: String(storedDob.getFullYear()),
        }
      : { month: "", day: "", year: "" };

  // ── Form ─────────────────────────────────────────────────────────────────

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      country: org.country ?? "IN",
      businessType: address.businessType ?? "individual",
      firstName: defaultFirst,
      lastName: defaultLast,
      dobMonth: defaultDob.month,
      dobDay: defaultDob.day,
      dobYear: defaultDob.year,
      nationality: address.nationality ?? (org.country === "IN" ? "IN" : ""),
      email: org.email ?? "",
      residentialAddress: address.street ?? address.raw ?? "",
      apartment: "",
      city: address.city ?? "",
      state: address.state ?? "",
      pinCode: address.zip ?? "",
      legalBusinessName: address.legalBusinessName ?? "",
      businessAddress: address.businessAddress ?? "",
      businessApartment: address.businessApartment ?? "",
      businessCity: address.businessCity ?? "",
      businessState: address.businessState ?? "",
      businessPinCode: address.businessPinCode ?? "",
      businessPhoneCountry: address.businessPhoneCountry ?? "IN",
      businessPhone: address.businessPhone ?? "",
      showOptional: false,
    },
  });

  // KEY: useFormState creates a stable subscription to isDirty + errors
  const { isDirty, errors, isSubmitting } = useFormState({
    control: form.control,
  });

  // ── Local state ──────────────────────────────────────────────────────────

  const [saving, setSaving] = React.useState(false);
  const [submitAttempted, setSubmitAttempted] = React.useState(false);
  const [selectedDocuments, setSelectedDocuments] = React.useState<string[]>(
    [],
  );
  const documentInputRef = React.useRef<HTMLInputElement>(null);

  // Snapshot of the values the form was last reset to, so "discard" always
  // returns to the current org state (not a stale mount-time default).
  const initialValuesRef = React.useRef<FormValues | null>(null);

  const hasErrors = Object.keys(errors).length > 0;
  const isBusy = saving || isSubmitting;

  // watched values needed for rendering
  const showOptional = useWatch({ control: form.control, name: "showOptional", defaultValue: false }) ?? false;
  const businessType = useWatch({ control: form.control, name: "businessType" });
  const isIndividual = businessType === "individual";

  function handleDocumentSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      setSelectedDocuments((current) => [
        ...current,
        ...files.map((file) => file.name),
      ]);
    }
    event.target.value = "";
  }

  // ── Navigation protection ─────────────────────────────────────────────────
  // `beforeunload` covers hard refresh / tab / window close. Next.js client-side
  // navigation (Link / router.push) cannot be cancelled in Next.js 15+, so the
  // native beforeunload dialog is the only reliable guard (popstate fires *after*
  // navigation and preventDefault() does not stop it).

  React.useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // ── Reset form when drawer re-opens ──────────────────────────────────────

  const defaultFormValues: FormValues = {
    country: org.country ?? "IN",
    businessType: address.businessType ?? "individual",
    firstName: defaultFirst,
    lastName: defaultLast,
    dobMonth: defaultDob.month,
    dobDay: defaultDob.day,
    dobYear: defaultDob.year,
    nationality: address.nationality ?? (org.country === "IN" ? "IN" : ""),
    email: org.email ?? "",
    residentialAddress: address.street ?? address.raw ?? "",
    apartment: "",
    city: address.city ?? "",
    state: address.state ?? "",
    pinCode: address.zip ?? "",
    legalBusinessName: address.legalBusinessName ?? "",
    businessAddress: address.businessAddress ?? "",
    businessApartment: address.businessApartment ?? "",
    businessCity: address.businessCity ?? "",
    businessState: address.businessState ?? "",
    businessPinCode: address.businessPinCode ?? "",
    businessPhoneCountry: address.businessPhoneCountry ?? "IN",
    businessPhone: address.businessPhone ?? "",
    showOptional: false,
  };

  React.useEffect(() => {
    if (open) {
      form.reset(defaultFormValues);
      initialValuesRef.current = defaultFormValues;
      // Defer transient state resets to avoid cascading renders within the effect
      queueMicrotask(() => {
        setSelectedDocuments([]);
        setSubmitAttempted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Close / discard logic ────────────────────────────────────────────────

  function requestClose() {
    if (isBusy) return;
    if (isDirty) {
      form.reset(initialValuesRef.current ?? defaultFormValues);
      setSubmitAttempted(false);
    }
    setSelectedDocuments([]);
    onOpenChange(false);
  }

  function discardChanges() {
    form.reset(initialValuesRef.current ?? defaultFormValues);
    setSelectedDocuments([]);
    setSubmitAttempted(false);
  }

  function handleEscapeKeyDown() {
    requestClose();
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function onValid(values: FormValues) {
    setSaving(true);
    try {
      const dob = new Date(
        Number(values.dobYear),
        Number(values.dobMonth) - 1,
        Number(values.dobDay),
      );
      if (isNaN(dob.getTime()) || dob.getDate() !== Number(values.dobDay)) {
        toast.add({ title: "Enter a valid date of birth.", type: "error" });
        return;
      }

      const result = await updateBusinessDetails({
        organizationId: org.id,
        name: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        phone: values.businessPhone ?? "",
        address: {
          street: values.residentialAddress,
          apartment: values.apartment || undefined,
          city: values.city,
          state: values.state,
          zip: values.pinCode,
        },
        businessType: values.businessType,
        nationality: values.nationality,
        dateOfBirth: dob.toISOString(),
        legalBusinessName: values.legalBusinessName,
        businessAddress: values.businessAddress,
        businessApartment: values.businessApartment,
        businessCity: values.businessCity,
        businessState: values.businessState,
        businessPinCode: values.businessPinCode,
        businessPhoneCountry: values.businessPhoneCountry,
        businessPhone: values.businessPhone,
      });

      if (!result.ok) {
        toast.add({ title: result.error ?? "Unable to save.", type: "error" });
        return;
      }

      toast.add({ title: "Business details saved.", type: "success" });
      setSubmitAttempted(false);
      form.reset(values); // mark form clean, then close
      router.refresh();
      onOpenChange(false);
    } catch {
      toast.add({ title: "Unable to save. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function handleSaveClick() {
    setSubmitAttempted(true);
    form.handleSubmit(onValid)();
  }

  useSettingsDirtyForm(
    {
      dirty: isDirty,
      saving: isBusy,
      onDiscard: discardChanges,
      onSave: handleSaveClick,
    },
    open,
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════
          Full-screen sheet — using raw Radix Dialog so we control every pixel
      ════════════════════════════════════════════════════════════════════ */}
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
      >
        <DialogPrimitive.Portal>
          {/* Backdrop */}
          <AnimatePresence>
            {open && (
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  key="overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 z-50 bg-black/30"
                />
              </DialogPrimitive.Overlay>
            )}
          </AnimatePresence>

          {/* Sheet panel — full viewport */}
          <AnimatePresence>
            {open && (
              <DialogPrimitive.Content
                forceMount
                onEscapeKeyDown={handleEscapeKeyDown}
                asChild
                aria-describedby={undefined}
              >
                <motion.div
                  key="sheet"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.25,
                    ease: "easeInOut",
                  }}
                  className={cn(
                    "fixed inset-y-0 right-0 left-0 z-50 lg:left-[18rem]",
                    "flex flex-col m-2 rounded-xl",
                    "bg-background",
                    "border-l border-border",
                    "shadow-2xl",
                    "outline-none",
                  )}
                >
                  {/* ══════════════════════════════════════════
                      STICKY HEADER
                  ══════════════════════════════════════════ */}
                  <header className="shrink-0 flex items-center justify-between gap-4 px-4 h-12  border-b border-border z-10">
                    {/* Left — icon + name + badge */}
                    <div className="flex items-center gap-2 min-w-0 shrink-0">
                      <Building2 className="size-5 text-muted-foreground shrink-0" />
                      <span className="text-[13px] font-medium text-foreground truncate leading-none">
                        {org.name ?? "Your business"}
                      </span>
                      <Badge
                        variant="outline"
                        className="h-[20px] px-2 text-[11px] font-medium border-green-300 bg-green-50 text-green-700 rounded-full shrink-0 leading-none"
                      >
                        Active
                      </Badge>
                    </div>

                    {/* Right — actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Close */}
                      <button
                        type="button"
                        onClick={requestClose}
                        aria-label="Close"
                        className={cn(
                          "shrink-0 flex items-center justify-center",
                          "size-7 rounded-full",
                          "text-muted-foreground hover:text-foreground hover:bg-accent",
                          "transition-colors duration-100",
                        )}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </header>

                  {/* ══════════════════════════════════════════
                      ERROR BANNER
                  ══════════════════════════════════════════ */}
                  <AnimatePresence>
                    {submitAttempted && hasErrors && (
                      <motion.div
                        key="error-banner"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="shrink-0 overflow-hidden"
                      >
                        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-destructive/8 border-b border-destructive/20">
                          <AlertCircle className="size-4 text-destructive shrink-0" />
                          <p className="text-sm">
                            <span className="font-semibold text-destructive">
                              Couldn&apos;t save changes
                            </span>
                            <span className="text-destructive/80 ml-2 font-normal">
                              Fix the errors highlighted in the form
                            </span>
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ══════════════════════════════════════════
                      SCROLLABLE BODY
                  ══════════════════════════════════════════ */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="max-w-[970px] w-full mx-auto px-4 py-7 sm:px-0 space-y-6">
                      <form onSubmit={form.handleSubmit(onValid)} noValidate>
                        {/* ────────────────────────────────────────
                            SECTION 1 — About your business
                        ──────────────────────────────────────── */}
                        <div className="space-y-6">
                          <section className="space-y-3">
                            <SectionTitle>About your business</SectionTitle>

                            <SectionCard>
                              {/* Business type row */}
                              <div>
                                <FieldLabel>
                                  What type of business do you have?
                                </FieldLabel>
                                <div className="flex gap-2">
                                  <Controller
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                      <NativeSelect
                                        value={field.value || "IN"}
                                        onChange={field.onChange}
                                        aria-label="Select country"
                                        className="w-[58px] shrink-0 px-2"
                                        options={Object.entries(
                                          COUNTRY_FLAGS,
                                        ).map(([code, flag]) => ({
                                          value: code,
                                          label: flag,
                                        }))}
                                      />
                                    )}
                                  />
                                  {/* Business type */}
                                  <Controller
                                    control={form.control}
                                    name="businessType"
                                    render={({ field }) => (
                                      <NativeSelect
                                        value={field.value}
                                        onChange={field.onChange}
                                        className="flex-1"
                                        placeholder="Select business type"
                                        options={BUSINESS_TYPES}
                                      />
                                    )}
                                  />
                                </div>
                                <FieldError
                                  message={errors.businessType?.message}
                                />
                              </div>

                              {/* First / Last name */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <FieldLabel>First name</FieldLabel>
                                  <Input
                                    {...form.register("firstName")}
                                    className={inputCls(!!errors.firstName)}
                                    autoComplete="given-name"
                                  />
                                  <FieldError
                                    message={errors.firstName?.message}
                                  />
                                </div>
                                <div>
                                  <FieldLabel>Last name</FieldLabel>
                                  <Input
                                    {...form.register("lastName")}
                                    className={inputCls(!!errors.lastName)}
                                    autoComplete="family-name"
                                  />
                                  <FieldError
                                    message={errors.lastName?.message}
                                  />
                                </div>
                              </div>

                              {/* Date of birth */}
                              <div>
                                <FieldLabel>Date of birth</FieldLabel>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <Controller
                                      control={form.control}
                                      name="dobMonth"
                                      render={({ field }) => (
                                        <NativeSelect
                                          value={field.value}
                                          onChange={field.onChange}
                                          placeholder="Month"
                                          options={MONTHS}
                                        />
                                      )}
                                    />
                                    <FieldError
                                      message={errors.dobMonth?.message}
                                    />
                                  </div>
                                  <div>
                                    <Input
                                      {...form.register("dobDay")}
                                      placeholder="DD"
                                      maxLength={2}
                                      inputMode="numeric"
                                      className={cn(
                                        inputCls(!!errors.dobDay),
                                        "text-center",
                                      )}
                                    />
                                    <FieldError
                                      message={errors.dobDay?.message}
                                    />
                                  </div>
                                  <div>
                                    <Input
                                      {...form.register("dobYear")}
                                      placeholder="YYYY"
                                      maxLength={4}
                                      inputMode="numeric"
                                      className={cn(
                                        inputCls(!!errors.dobYear),
                                        "text-center",
                                      )}
                                    />
                                    <FieldError
                                      message={errors.dobYear?.message}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Nationality */}
                              <div>
                                <FieldLabel>Nationality</FieldLabel>
                                <Controller
                                  control={form.control}
                                  name="nationality"
                                  render={({ field }) => (
                                    <NativeSelect
                                      value={field.value}
                                      onChange={field.onChange}
                                      placeholder="Select nationality"
                                      options={NATIONALITIES}
                                    />
                                  )}
                                />
                                <FieldError
                                  message={errors.nationality?.message}
                                />
                              </div>

                              {/* Email */}
                              <div>
                                <FieldLabel>Email</FieldLabel>
                                <Input
                                  {...form.register("email")}
                                  type="email"
                                  autoComplete="email"
                                  className={inputCls(!!errors.email)}
                                />
                                <FieldError message={errors.email?.message} />
                              </div>

                              {/* Residential address */}
                              <div>
                                <FieldLabel>Residential address</FieldLabel>
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                                  <Input
                                    {...form.register("residentialAddress")}
                                    placeholder="House number, street name"
                                    className={cn(
                                      inputCls(!!errors.residentialAddress),
                                      "pl-8",
                                    )}
                                  />
                                </div>
                                <FieldError
                                  message={errors.residentialAddress?.message}
                                />
                              </div>

                              {/* Apartment — always visible */}
                              <div>
                                <FieldLabel>Apartment, suite, etc</FieldLabel>
                                <Input
                                  {...form.register("apartment")}
                                  placeholder="Apartment, suite, etc"
                                  className={inputCls()}
                                />
                              </div>

                              {/* City / State / PIN */}
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <FieldLabel>City</FieldLabel>
                                  <Input
                                    {...form.register("city")}
                                    placeholder="City"
                                    className={inputCls(!!errors.city)}
                                  />
                                  <FieldError message={errors.city?.message} />
                                </div>
                                <div>
                                  <FieldLabel>State</FieldLabel>
                                  <Controller
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                      <NativeSelect
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select a state"
                                        options={INDIAN_STATES.map((state) => ({
                                          value: state,
                                          label: state,
                                        }))}
                                      />
                                    )}
                                  />
                                  <FieldError message={errors.state?.message} />
                                </div>
                                <div>
                                  <FieldLabel>PIN code</FieldLabel>
                                  <Input
                                    {...form.register("pinCode")}
                                    placeholder="PIN code"
                                    maxLength={10}
                                    inputMode="numeric"
                                    className={inputCls(!!errors.pinCode)}
                                  />
                                  <FieldError
                                    message={errors.pinCode?.message}
                                  />
                                </div>
                              </div>

                              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                                These details are used for financial products,
                                markets, apps, and taxes in this shop.
                              </p>
                            </SectionCard>
                          </section>

                          {!isIndividual && (
                            <section className="space-y-3">
                              <SectionTitle>
                                Business verification details
                              </SectionTitle>
                              <SectionCard>
                                <div>
                                  <FieldLabel>
                                    Registered legal business name
                                  </FieldLabel>
                                  <Input
                                    {...form.register("legalBusinessName")}
                                    className={inputCls()}
                                  />
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    The official registered name of your
                                    business.
                                  </p>
                                </div>
                                <div>
                                  <FieldLabel>Business address</FieldLabel>
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                                    <Input
                                      {...form.register("businessAddress")}
                                      className={cn(inputCls(), "pl-8")}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <FieldLabel>Apartment, suite, etc</FieldLabel>
                                  <Input
                                    {...form.register("businessApartment")}
                                    className={inputCls()}
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <FieldLabel>City</FieldLabel>
                                    <Input
                                      {...form.register("businessCity")}
                                      placeholder="City"
                                      className={inputCls()}
                                    />
                                  </div>
                                  <div>
                                    <FieldLabel>State</FieldLabel>
                                    <Controller
                                      control={form.control}
                                      name="businessState"
                                      render={({ field }) => (
                                        <NativeSelect
                                          value={field.value ?? ""}
                                          onChange={field.onChange}
                                          placeholder="Select a state"
                                          options={INDIAN_STATES.map(
                                            (state) => ({
                                              value: state,
                                              label: state,
                                            }),
                                          )}
                                        />
                                      )}
                                    />
                                  </div>
                                  <div>
                                    <FieldLabel>PIN code</FieldLabel>
                                    <Input
                                      {...form.register("businessPinCode")}
                                      maxLength={10}
                                      inputMode="numeric"
                                      className={inputCls()}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <FieldLabel>Phone number</FieldLabel>
                                  <div className="flex gap-2">
                                    <Controller
                                      control={form.control}
                                      name="businessPhoneCountry"
                                      render={({ field }) => (
                                        <NativeSelect
                                          value={field.value ?? "IN"}
                                          onChange={field.onChange}
                                          className="w-[130px] shrink-0"
                                          options={PHONE_COUNTRIES.map(
                                            (country) => ({
                                              value: country.value,
                                              label: `${country.flag} ${country.dial}`,
                                            }),
                                          )}
                                        />
                                      )}
                                    />
                                    <Input
                                      {...form.register("businessPhone")}
                                      inputMode="tel"
                                      className="flex-1"
                                    />
                                  </div>
                                </div>
                              </SectionCard>
                            </section>
                          )}

                          {!isIndividual && (
                            <section className="space-y-3">
                              <SectionTitle>People</SectionTitle>
                              <p className="text-sm text-muted-foreground">
                                Add account representatives, owners, executives,
                                and directors.
                              </p>
                              <SectionCard>
                                <button
                                  type="button"
                                  onClick={() =>
                                    toast.add({
                                      title:
                                        "People can be added after the business profile is saved.",
                                      type: "info",
                                    })
                                  }
                                  className="flex w-full items-center gap-3 text-left text-sm font-medium text-foreground"
                                >
                                  <span className="flex size-7 items-center justify-center rounded-full border border-border">
                                    <Plus className="size-4" />
                                  </span>
                                  Add person
                                </button>
                              </SectionCard>
                            </section>
                          )}

                          {showOptional && (
                            <section className="space-y-3">
                              <div>
                                <SectionTitle>
                                  Business verification documents
                                </SectionTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Documents must be clear, complete, and
                                  uncropped.
                                </p>
                              </div>
                              <SectionCard>
                                <input
                                  ref={documentInputRef}
                                  type="file"
                                  accept="image/*,.pdf"
                                  multiple
                                  className="sr-only"
                                  onChange={handleDocumentSelected}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    documentInputRef.current?.click()
                                  }
                                  className="w-[196px] overflow-hidden rounded-xl border border-border text-left transition-colors hover:border-foreground/30"
                                >
                                  <span className="flex h-[112px] items-center justify-center bg-muted">
                                    <Plus className="size-5 text-muted-foreground" />
                                  </span>
                                  <span className="block border-t border-border bg-card px-3 py-2.5">
                                    <span className="block text-sm font-medium leading-5">
                                      Add document
                                    </span>
                                    <span className="block text-sm leading-5 text-primary">
                                      Select a file
                                    </span>
                                  </span>
                                </button>
                                {selectedDocuments.length > 0 && (
                                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                    {selectedDocuments.map(
                                      (fileName, index) => (
                                        <p
                                          key={`${fileName}-${index}`}
                                          className="truncate"
                                        >
                                          {fileName}
                                        </p>
                                      ),
                                    )}
                                  </div>
                                )}
                              </SectionCard>
                            </section>
                          )}

                          <div className="flex items-center gap-2.5 pt-1">
                            <Switch
                              id="show-optional"
                              checked={showOptional}
                              onCheckedChange={(checked) =>
                                form.setValue("showOptional", checked, {
                                  shouldDirty: false,
                                })
                              }
                            />
                            <label
                              htmlFor="show-optional"
                              className="cursor-pointer select-none text-sm text-foreground"
                            >
                              Show optional fields
                            </label>
                          </div>
                        </div>

                        <div className="h-8" />
                      </form>
                    </div>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            )}
          </AnimatePresence>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
