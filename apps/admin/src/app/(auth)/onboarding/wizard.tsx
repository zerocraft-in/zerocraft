"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";

import { Button } from "@zerocraft/ui/button";
import { Card, CardContent, CardFooter } from "@zerocraft/ui/card";
import { Input } from "@zerocraft/ui/input";
import { Label } from "@zerocraft/ui/label";
import { Separator } from "@zerocraft/ui/separator";
import {
  CheckCircle,
  X,
  Loader2,
  Store,
  Check,
  ShieldCheck,
  AlertCircle,
  Info,
  Link as LinkIcon,
  Building2,
  Database,
  Truck,
} from "lucide-react";
import { useIsMobile } from "@zerocraft/ui";

const EMERALD = "16,185,129";

const STORAGE_KEY = "maara_setup_wizard";

const storeSchema = z.object({
  storeName: z.string().trim().min(2, "Store name must be at least 2 characters").max(120),
  storeSlug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(64, "Slug must be at most 64 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase, numbers, or hyphens only"),
  region: z.string().min(1, "Please select a region"),
});

const businessSchema = z.object({
  businessType: z.string().min(1, "Please select a business type"),
  legalName: z.string().trim().min(2, "Legal name must be at least 2 characters").optional(),
  country: z.string().min(2, "Please select a country"),
  addressLine1: z.string().trim().min(1, "Address is required"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().trim().min(1, "Phone number is required"),
});

const shippingSchema = z.object({
  shippingOrigin: z.string().trim().min(1, "Shipping origin is required"),
  destinationZones: z.array(z.string()).min(1, "Select at least one destination zone"),
  deliveryMethods: z.array(z.string()).min(1, "Select at least one delivery method"),
});

type StoreFormValues = z.infer<typeof storeSchema>;
type BusinessFormValues = z.infer<typeof businessSchema>;
type ShippingFormValues = z.infer<typeof shippingSchema>;

type JobStep = { step: string; status: string; message: string | null };
type JobStatus = {
  id: string;
  status: string;
  currentStep: string | null;
  progress: number;
  errorCode: string | null;
  errorMessage: string | null;
};
type OrganizationOption = { id: string; name: string; slug: string };

const STEP_LABELS: Record<number, string> = {
  1: "Store Details",
  2: "Business Info",
  3: "Shipping Setup",
  4: "Database Setup",
  5: "Review",
  6: "Complete",
};

const BUSINESS_TYPES = [
  { key: "sole_proprietorship", label: "Sole Proprietorship" },
  { key: "llc", label: "LLC" },
  { key: "corporation", label: "Corporation" },
  { key: "partnership", label: "Partnership" },
];

const COUNTRIES = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "SG", label: "Singapore" },
  { code: "AE", label: "United Arab Emirates" },
];

const DESTINATION_ZONES = [
  { key: "domestic", label: "Domestic (same country)" },
  { key: "international", label: "International" },
];

const DELIVERY_METHODS = [
  { key: "standard", label: "Standard Shipping" },
  { key: "express", label: "Express Delivery" },
  { key: "pickup", label: "Local Pickup" },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadDraft<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY + ":" + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveDraft(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY + ":" + key, JSON.stringify(value));
  } catch {}
}

export default function StoreSetupWizard() {
  const [orgIdFromUrl, setOrgIdFromUrl] = React.useState<string>("");

  // Read the organization ID from the URL query params after mount. Reading
  // from window.location.search at module scope captures "" during SSR
  // (window is undefined), and the value is never recomputed during client
  // hydration, so orgIdFromUrl would remain empty even when the URL contains
  // ?organizationId=.... Loading it in an effect ensures the client value is
  // correct before the user can click Connect Supabase.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrgIdFromUrl(params.get("organizationId") ?? "");
  }, []);
  const [step, setStep] = React.useState<number>(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [regions, setRegions] = React.useState<string[]>([]);
  const [connections, setConnections] = React.useState<Array<{
    id: string;
    accountName: string | null;
    organization: { id: string; name: string; slug: string };
    connectionStatus: string;
  }>>([]);
  const [oauthState, setOAuthState] = React.useState<string | null>(null);
  const [pendingOrgs, setPendingOrgs] = React.useState<OrganizationOption[]>([]);
  const [jobStatus, setJobStatus] = React.useState<JobStatus | null>(null);
  const [jobSteps, setJobSteps] = React.useState<JobStep[]>([]);
  const [provisionerConfigured, setProvisionerConfigured] = React.useState<
    boolean | null
  >(null);

  const storeForm = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      storeName: "",
      storeSlug: "",
      region: "",
    },
  });

  const businessForm = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      businessType: "",
      legalName: undefined,
      country: "IN",
      addressLine1: "",
      addressLine2: "",
      city: "",
      postalCode: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const shippingForm = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      shippingOrigin: "",
      destinationZones: [],
      deliveryMethods: [],
    },
  });

  const [connectionId, setConnectionId] = React.useState<string | undefined>(
    undefined
  );

  // Load draft state from localStorage after mount to avoid SSR hydration mismatch.
  React.useEffect(() => {
    setStep(loadDraft("step", 1));
  }, []);

  React.useEffect(() => {
    storeForm.reset(loadDraft("store", {
      storeName: "",
      storeSlug: "",
      region: "",
    }));
  }, [storeForm]);

  React.useEffect(() => {
    businessForm.reset(loadDraft("business", {
      businessType: "",
      legalName: undefined,
      country: "IN",
      addressLine1: "",
      addressLine2: "",
      city: "",
      postalCode: "",
      contactEmail: "",
      contactPhone: "",
    }));
  }, [businessForm]);

  React.useEffect(() => {
    shippingForm.reset(loadDraft("shipping", {
      shippingOrigin: "",
      destinationZones: [],
      deliveryMethods: [],
    }));
  }, [shippingForm]);

  React.useEffect(() => {
    setConnectionId(loadDraft("connection", undefined));
  }, []);

  const totalSteps = 6;
  const canGoBack = step > 1;
  const isLastStep = step === totalSteps;

  React.useEffect(() => {
    saveDraft("step", step);
  }, [step]);

  React.useEffect(() => {
    saveDraft("store", storeForm.getValues());
  }, [storeForm.getValues()]);

  React.useEffect(() => {
    saveDraft("business", businessForm.getValues());
  }, [businessForm.getValues()]);

  React.useEffect(() => {
    saveDraft("shipping", shippingForm.getValues());
  }, [shippingForm.getValues()]);

  React.useEffect(() => {
    saveDraft("connection", connectionId);
  }, [connectionId]);

  async function loadPendingOrgs(state: string) {
    try {
      const res = await fetch(`/api/onboarding/oauth/pending?state=${encodeURIComponent(state)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.organizations)) setPendingOrgs(data.organizations);
    } catch {}
  }

  async function loadRegions() {
    try {
      const res = await fetch("/api/onboarding/regions", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.regions)) setRegions(data.regions);
    } catch {}
  }

  async function loadConnections() {
    try {
      const res = await fetch("/api/onboarding/connections", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.connections)) setConnections(data.connections);
    } catch {}
  }

  async function loadProvisionerStatus() {
    try {
      const res = await fetch("/api/onboarding/provisioner-status", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok && typeof data.provisionerConfigured === "boolean") {
        setProvisionerConfigured(data.provisionerConfigured);
      }
    } catch {
      setProvisionerConfigured(false);
    }
  }

  React.useEffect(() => {
    async function init() {
      await loadRegions();
      await loadConnections();
      await loadProvisionerStatus();
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const oauth = params.get("oauth");
      const state = params.get("state");
      if (oauth === "connected") { setStep(4); return; }
      if (oauth === "select" && state) { setOAuthState(state); loadPendingOrgs(state); return; }
      if (oauth === "error") { const reason = params.get("reason") ?? "unknown"; setError("Supabase connection failed: " + reason); }
    }
    void init();
  }, []);

  async function startOAuth() {
    setError(null); setLoading(true);
    try {
      if (!orgIdFromUrl) {
        setError("Organization ID is unavailable. Please restart the onboarding flow.");
        return;
      }
      const returnTo = `${window.location.origin}/api/oauth/supabase/callback`;
      const res = await fetch("/api/onboarding/oauth/start", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: orgIdFromUrl, returnTo }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (
          typeof data.error === "string" &&
          data.error.includes("TENANT_PROVISIONER_SHARED_SECRET")
        ) {
          setError(
            "Database provisioning is temporarily unavailable. An administrator must configure the provisioner connection."
          );
        } else {
          setError(data.error || "Unable to start connection.");
        }
        return;
      }
      window.location.href = data.authorizeUrl;
    } catch { setError("Unable to start connection."); } finally { setLoading(false); }
  }

  async function finalizeConnection() {
    if (!oauthState) return;
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/onboarding/oauth/finalize", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: oauthState, supabaseOrganizationId: connectionId }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (
          typeof data.error === "string" &&
          data.error.includes("TENANT_PROVISIONER_SHARED_SECRET")
        ) {
          setError(
            "Database provisioning is temporarily unavailable. An administrator must configure the provisioner connection."
          );
        } else {
          setError(data.error || "Unable to finalize connection.");
        }
        return;
      }
      setConnections(prev => [...prev, { id: data.connectionId, accountName: data.organization.name, organization: data.organization, connectionStatus: "active" }]);
      setConnectionId(data.connectionId);
      setOAuthState(null); setStep(5);
    } catch { setError("Unable to finalize connection."); } finally { setLoading(false); }
  }

  async function startProvisioning() {
    setError(null); setSubmitting(true);
    if (provisionerConfigured === false) {
      setError("Database provisioning is temporarily unavailable. An administrator must configure the provisioner connection.");
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/onboarding/provision", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storeName: storeForm.getValues("storeName"),
          storeSlug: storeForm.getValues("storeSlug"),
          region: storeForm.getValues("region"),
          connectionId: connectionId || "",
          idempotencyKey: storeForm.getValues("storeSlug"),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (
          typeof data.error === "string" &&
          data.error.includes("TENANT_PROVISIONER_SHARED_SECRET")
        ) {
          setError(
            "Database provisioning is temporarily unavailable. An administrator must configure the provisioner connection."
          );
        } else {
          setError(data.error || "Unable to start provisioning.");
        }
        return;
      }
      setStep(5); pollJob(data.jobId);
    } catch { setError("Unable to start provisioning."); } finally { setSubmitting(false); }
  }

  async function pollJob(jobId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/job-status?jobId=" + encodeURIComponent(jobId), { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setJobStatus(data.job); setJobSteps(data.steps);
        if (data.job.status === "SUCCEEDED" || data.job.status === "FAILED" || data.job.status === "NEEDS_REAUTHORIZATION") { setStep(6); return; }
        setTimeout(() => pollJob(jobId), 3000);
      }
    } catch { setTimeout(() => pollJob(jobId), 3000); } finally { setLoading(false); }
  }

  function goBack() { setStep(step - 1); setError(null); }

  function handleContinue() {
    switch (step) {
      case 1:
        storeForm.trigger().then((valid) => { if (valid) setStep(2); });
        break;
      case 2:
        businessForm.trigger().then((valid) => { if (valid) setStep(3); });
        break;
      case 3:
        shippingForm.trigger().then((valid) => { if (valid) setStep(4); });
        break;
      case 4:
        if (connectionId) setStep(5);
        else setError("Please connect a Supabase account to continue.");
        break;
      case 5: startProvisioning(); break;
      default: break;
    }
  }

  const storeValues = storeForm.getValues();
  const businessValues = businessForm.getValues();
  const shippingValues = shippingForm.getValues();

  const completedSteps = React.useMemo(() => {
    const s = new Set<number>();
    if (storeValues.storeName && storeValues.storeSlug) s.add(1);
    if (businessValues.businessType) s.add(2);
    if (shippingValues.shippingOrigin) s.add(3);
    if (connectionId) s.add(4);
    return s;
  }, [storeValues, businessValues, shippingValues, connectionId]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#f8fafc] px-4">
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25, ease: "easeOut" }} className="flex w-full max-w-3xl flex-col">
          <header className="mb-6 flex flex-col items-center justify-between gap-4">
            <div className="flex w-full items-center justify-between gap-4 px-2">
              {[1, 2, 3, 4, 5, 6].map((n) => {
                const isDone = completedSteps.has(n) || (n < step && n !== 4);
                const isActive = n === step;
                const stepClass = isDone || isActive
                  ? "text-xs font-bold bg-[#" + EMERALD + "] text-white border-[#" + EMERALD + "]"
                  : "text-xs font-bold text-gray-400 border-gray-200";
                const stepShadow = isActive ? " shadow-[0_0_0_2px_rgba(16,185,129,0.4)]" : "";
                const labelClass = isDone ? "text-gray-700" : "text-gray-400";
                const lineClass = isDone ? "bg-emerald-200" : "bg-gray-100";
                return (
                  <div key={n} className="flex flex-col items-center gap-1.5">
                    <div className={"size-8 rounded-full border flex items-center justify-center transition-all " + stepClass + stepShadow}>
                      {completedSteps.has(n) ? <Check size={11} strokeWidth={2} /> : n <= step ? <span className="text-[10px]">{n}</span> : n}
                    </div>
                    <span className={"text-[10px] font-medium leading-none " + labelClass}>{STEP_LABELS[n]}</span>
                    {n < totalSteps && <div className={"h-[1px] w-8 flex-1 " + lineClass} />}
                  </div>
                );
              })}
            </div>
            <Separator className="w-full" />
          </header>

          <Card className="mt-4 overflow-hidden border-gray-100 shadow-sm">
            {step === 1 && <WizardStep1 form={storeForm} regions={regions} loading={loading} error={error} />}
            {step === 2 && <WizardStep2 form={businessForm} loading={loading} error={error} />}
            {step === 3 && <WizardStep3 form={shippingForm} loading={loading} error={error} />}
            {step === 4 && <WizardStep4 setStep={setStep} connections={connections} pendingOrgs={pendingOrgs} oauthState={oauthState} connectionId={connectionId} setConnectionId={setConnectionId} startOAuth={startOAuth} finalizeConnection={finalizeConnection} loading={loading} error={error} jobStatus={jobStatus} jobSteps={jobSteps} />}
            {step === 5 && <WizardStep5 storeForm={storeForm} businessForm={businessForm} shippingForm={shippingForm} connectionId={connectionId} setStep={setStep} error={error} jobStatus={jobStatus} />}
            {step === 6 && <WizardStep6 jobStatus={jobStatus} jobSteps={jobSteps} loading={loading} setStep={setStep} />}
          </Card>

          <CardFooter className="flex items-center justify-between gap-3 px-8 py-4 border-t border-gray-100 bg-gray-50/50">
            {canGoBack && (
              <Button type="button" variant="outline" size="sm" onClick={goBack} disabled={loading} className="text-xs font-medium text-gray-600 hover:bg-gray-100">Back</Button>
            )}
            {isLastStep && jobStatus?.status === "SUCCEEDED" ? (
              <Link href="/overview"><Button type="button" size="sm" className="text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/80">Go to dashboard</Button></Link>
            ) : (
              <Button type="button" size="sm" onClick={handleContinue} disabled={loading || submitting} className="text-xs font-medium bg-primary text-white hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? "Starting…" : isLastStep ? "Complete setup" : "Continue"}
              </Button>
            )}
          </CardFooter>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function WizardStep1({ form, regions, loading, error }: { form: ReturnType<typeof useForm<StoreFormValues>>; regions: string[]; loading: boolean; error: string | null }) {
  const slugValue = form.getValues("storeSlug") || slugify(form.getValues("storeName"));
  const [slugTouched, setSlugTouched] = React.useState(false);

  React.useEffect(() => {
    const name = form.getValues("storeName");
    if (name && !form.getValues("storeSlug")) {
      form.setValue("storeSlug", slugValue, { shouldValidate: true });
    }
  }, [form.getValues("storeName"), form, slugValue]);

  return (
    <CardContent className="px-8 pt-8 pb-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Store className="size-5" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Name your store</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">This is your customer-facing store name. You can change it later.</p>
      <input type="hidden" />
      <div className="mt-8 space-y-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="storeName" className="text-sm font-medium text-gray-700 flex items-center gap-1">Store name <span className="text-emerald-600">*</span></Label>
          <Input id="storeName" placeholder="Maara Clothing" disabled={loading} className="bg-white border-gray-200 text-gray-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" {...form.register("storeName")} />
          {form.formState.errors.storeName && <p className="text-[10px] text-red-500">{form.formState.errors.storeName.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="storeSlug" className="text-sm font-medium text-gray-700 flex items-center gap-1">Store slug (URL handle)</Label>
          <div className="relative">
            <Input id="storeSlug" placeholder="maara" disabled={loading} className="bg-white border-gray-200 text-gray-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" {...form.register("storeSlug", { onBlur: () => setSlugTouched(true) })} />
            <Info className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 cursor-help" />
          </div>
          {slugTouched && form.formState.errors.storeSlug && <p className="text-[10px] text-red-500">{form.formState.errors.storeSlug.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="region" className="text-sm font-medium text-gray-700 flex items-center gap-1">Region <span className="text-emerald-600">*</span></Label>
          <div className="grid grid-cols-2 gap-3">
            {regions.map((region) => {
              const selected = form.getValues("region") === region;
              return (
                <label key={region} className={"flex items-center gap-3 rounded-lg border px-3 py-4 cursor-pointer transition-all " + (selected ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]" : "border-gray-200 text-gray-500 hover:border-emerald-200 hover:bg-emerald-5")}>
                  <input type="radio" value={region} checked={selected} onChange={() => form.setValue("region", region)} className="appearance-none size-3.5 rounded-full border-emerald-500 checked:bg-emerald-500 checked:border-emerald-500" />
                  {region}
                </label>
              );
            })}
            {regions.length === 0 && <p className="text-[10px] text-gray-400">Loading regions…</p>}
          </div>
          {form.formState.errors.region && <p className="text-[10px] text-red-500">{form.formState.errors.region.message}</p>}
        </div>
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="size-4 text-emerald-600" />
            <span className="text-sm text-emerald-900">Store URL: <span className="font-mono text-emerald-700">{slugValue}.zerocraft.studio</span></span>
          </div>
        </div>
        {error && <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[10px] text-red-600"><AlertCircle size={14} strokeWidth={2} />{error}</div>}
      </div>
    </CardContent>
  );
}

function WizardStep2({ form, loading, error }: { form: ReturnType<typeof useForm<BusinessFormValues>>; loading: boolean; error: string | null }) {
  const showLegalName = form.getValues("businessType") === "llc" || form.getValues("businessType") === "corporation";
  return (
    <CardContent className="px-8 pt-8 pb-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Building2 className="size-5" /></div>
        <h2 className="text-xl font-bold text-gray-900">Business info</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">Tell us about your business so we can set up your store correctly.</p>
      <div className="mt-8 space-y-6">
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">Business type <span className="text-emerald-600">*</span></Label>
          <div className="grid grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((bt) => {
              const selected = form.getValues("businessType") === bt.key;
              return (
                <label key={bt.key} className={"flex items-center gap-3 rounded-lg border px-3 py-4 cursor-pointer transition-all " + (selected ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]" : "border-gray-200 text-gray-500 hover:border-emerald-200 hover:bg-emerald-5")}>
                  <input type="radio" value={bt.key} checked={selected} onChange={() => form.setValue("businessType", bt.key)} className="appearance-none size-3.5 rounded-full border-emerald-500 checked:bg-emerald-500 checked:border-emerald-500" />
                  <span className="text-sm font-medium text-gray-900">{bt.label}</span>
                </label>
              );
            })}
          </div>
          {form.formState.errors.businessType && <p className="text-[10px] text-red-500">{form.formState.errors.businessType.message}</p>}
        </div>
        {showLegalName && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="legalName" className="text-sm font-medium text-gray-700 flex items-center gap-1">Legal business name <span className="text-emerald-600">*</span></Label>
            <Input id="legalName" placeholder="Maara Retail Pvt. Ltd." disabled={loading} className="bg-white border-gray-200 text-gray-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" {...form.register("legalName")} />
            {form.formState.errors.legalName && <p className="text-[10px] text-red-500">{form.formState.errors.legalName.message}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="country" className="text-sm font-medium text-gray-700 flex items-center gap-1">Country <span className="text-emerald-600">*</span></Label>
            <select id="country" disabled={loading} className="bg-white border-gray-200 text-gray-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" {...form.register("country")}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            {form.formState.errors.country && <p className="text-[10px] text-red-500">{form.formState.errors.country.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="city" className="text-sm font-medium text-gray-700 flex items-center gap-1">City <span className="text-emerald-600">*</span></Label>
            <Input id="city" placeholder="Bengaluru" disabled={loading} className="bg-white border-gray-200 text-gray-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" {...form.register("city")} />
            {form.formState.errors.city && <p className="text-[10px] text-red-500">{form.formState.errors.city.message}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="addressLine1" className="text-sm font-medium text-gray-700 flex items-center gap-1">Street address <span className="text-emerald-600">*</span></Label>
          <Input id="addressLine1" placeholder="123 MG Road" disabled={loading} className="bg-white border-gray-200 text-gray-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" {...form.register("addressLine1")} />
          {form.formState.errors.addressLine1 && <p className="text-[10px] text-red-500">{form.formState.errors.addressLine1.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="addressLine2" className="text-sm font-medium text-gray-700">Apartment, suite, etc. (optional)</Label>
          <Input id="addressLine2" placeholder="Floor 2" disabled={loading} className="bg-white border-gray-200 text-gray-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" {...form.register("addressLine2")} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700 flex items-center gap-1">Postal code <span className="text-emerald-600">*</span></Label>
            <Input id="postalCode" placeholder="560001" disabled={loading} className="bg-white border-gray-200 text-gray-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" {...form.register("postalCode")} />
            {form.formState.errors.postalCode && <p className="text-[10px] text-red-500">{form.formState.errors.postalCode.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactEmail" className="text-sm font-medium text-gray-700 flex items-center gap-1">Contact email <span className="text-emerald-600">*</span></Label>
            <Input id="contactEmail" type="email" placeholder="you@company.com" disabled={loading} className="bg-white border-gray-200 text-gray-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" {...form.register("contactEmail")} />
            {form.formState.errors.contactEmail && <p className="text-[10px] text-red-500">{form.formState.errors.contactEmail.message}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contactPhone" className="text-sm font-medium text-gray-700 flex items-center gap-1">Contact phone <span className="text-emerald-600">*</span></Label>
          <Input id="contactPhone" type="tel" placeholder="+91 98765 43210" disabled={loading} className="bg-white border-gray-200 text-gray-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" {...form.register("contactPhone")} />
          {form.formState.errors.contactPhone && <p className="text-[10px] text-red-500">{form.formState.errors.contactPhone.message}</p>}
        </div>
        {error && <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[10px] text-red-600"><AlertCircle size={14} strokeWidth={2} />{error}</div>}
      </div>
    </CardContent>
  );
}

function WizardStep3({ form, loading, error }: { form: ReturnType<typeof useForm<ShippingFormValues>>; loading: boolean; error: string | null }) {
  return (
    <CardContent className="px-8 pt-8 pb-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Truck className="size-5" /></div>
        <h2 className="text-xl font-bold text-gray-900">Shipping setup</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">Configure where and how you&apos;ll ship orders.</p>
      <div className="mt-8 space-y-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="shippingOrigin" className="text-sm font-medium text-gray-700 flex items-center gap-1">Shipping origin <span className="text-emerald-600">*</span></Label>
          <Input id="shippingOrigin" placeholder="123 MG Road, Bengaluru, IN" disabled={loading} className="bg-white border-gray-200 text-gray-900 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" {...form.register("shippingOrigin")} />
          {form.formState.errors.shippingOrigin && <p className="text-[10px] text-red-500">{form.formState.errors.shippingOrigin.message}</p>}
          <p className="text-[10px] text-gray-400">Orders will ship from this address.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">Destination zones <span className="text-emerald-600">*</span></Label>
          <div className="grid grid-cols-1 gap-3">
            {DESTINATION_ZONES.map((zone) => {
              const selected = form.getValues("destinationZones").includes(zone.key);
              return (
                <label key={zone.key} className={"flex items-center gap-3 rounded-lg border px-3 py-4 cursor-pointer transition-all " + (selected ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]" : "border-gray-200 text-gray-500 hover:border-emerald-200 hover:bg-emerald-5")}>
                  <input type="checkbox" checked={selected} onChange={() => {
                    const current = form.getValues("destinationZones");
                    if (selected) form.setValue("destinationZones", current.filter((k: string) => k !== zone.key));
                    else form.setValue("destinationZones", [...current, zone.key]);
                  }} className="appearance-none size-3.5 rounded-full border-emerald-500 checked:bg-emerald-500 checked:border-emerald-500" />
                  <span className="text-sm font-medium text-gray-900">{zone.label}</span>
                </label>
              );
            })}
          </div>
          {form.formState.errors.destinationZones && <p className="text-[10px] text-red-500">{form.formState.errors.destinationZones.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">Delivery methods <span className="text-emerald-600">*</span></Label>
          <div className="grid grid-cols-1 gap-3">
            {DELIVERY_METHODS.map((method) => {
              const selected = form.getValues("deliveryMethods").includes(method.key);
              return (
                <label key={method.key} className={"flex items-center gap-3 rounded-lg border px-3 py-4 cursor-pointer transition-all " + (selected ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]" : "border-gray-200 text-gray-500 hover:border-emerald-200 hover:bg-emerald-5")}>
                  <input type="checkbox" checked={selected} onChange={() => {
                    const current = form.getValues("deliveryMethods");
                    if (selected) form.setValue("deliveryMethods", current.filter((k: string) => k !== method.key));
                    else form.setValue("deliveryMethods", [...current, method.key]);
                  }} className="appearance-none size-3.5 rounded-full border-emerald-500 checked:bg-emerald-500 checked:border-emerald-500" />
                  <span className="text-sm font-medium text-gray-900">{method.label}</span>
                </label>
              );
            })}
          </div>
          {form.formState.errors.deliveryMethods && <p className="text-[10px] text-red-500">{form.formState.errors.deliveryMethods.message}</p>}
        </div>
        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-[10px] text-gray-500">Shipping rates and carrier integration are configured after store provisioning.</p>
        </div>
        {error && <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[10px] text-red-600"><AlertCircle size={14} strokeWidth={2} />{error}</div>}
      </div>
    </CardContent>
  );
}

function WizardStep4({ setStep, connections, pendingOrgs, oauthState, connectionId, setConnectionId, startOAuth, finalizeConnection, loading, error, jobStatus, jobSteps }: { setStep: (n: number) => void; connections: Array<{ id: string; accountName: string | null; organization: { id: string; name: string; slug: string }; connectionStatus: string }>; pendingOrgs: OrganizationOption[]; oauthState: string | null; connectionId: string | undefined; setConnectionId: (id: string | undefined) => void; startOAuth: () => void; finalizeConnection: () => void; loading: boolean; error: string | null; jobStatus: JobStatus | null; jobSteps: JobStep[]; }) {
  const existing = connections.find((c) => c.connectionStatus === "active");
  const effectiveConnectionId = connectionId || existing?.id;
  const hasConnection = !!effectiveConnectionId;
  return (
    <CardContent className="px-8 pt-8 pb-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Database className="size-5" /></div>
        <h2 className="text-xl font-bold text-gray-900">Database Setup</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">Each store gets its own independent Supabase project and database. Your store's commerce data lives in this customer-owned database, not in the shared platform database. Connecting your Supabase account establishes the connection; actual database provisioning starts when you provision your store on the Review step.</p>
      <div className="mt-8 space-y-6">
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">Supabase connection <span className="text-emerald-600">*</span></Label>
          {existing && (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-600"><CheckCircle size={14} strokeWidth={2} /> Connected to <strong>{existing.accountName}</strong></div>
          )}
          {!existing && oauthState && (
            <div className="mt-8 space-y-3">
              <Label className="text-sm font-medium text-gray-700">Choose your Supabase organization</Label>
              <div className="grid grid-cols-1 gap-2">
                {pendingOrgs.map((org) => {
                  const selected = connectionId === org.id;
                  return (
                    <label key={org.id} className={"flex items-center gap-3 rounded-lg border px-3 py-4 cursor-pointer transition-all " + (selected ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-[0_0_0_1px_rgba(16,185,129,0.2)]" : "border-gray-200 text-gray-500 hover:border-emerald-200 hover:bg-emerald-5")}>
                      <input type="radio" value={org.id} checked={selected} onChange={() => setConnectionId(org.id)} className="appearance-none size-3.5 rounded-full border-emerald-500 checked:bg-emerald-500 checked:border-emerald-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{org.name}</p>
                        <p className="text-[10px] text-gray-500">{org.slug}</p>
                      </div>
                    </label>
                  );
                })}
                {pendingOrgs.length === 0 && <p className="text-[10px] text-gray-400">Loading organizations…</p>}
              </div>
            </div>
          )}
          {!existing && !oauthState && (
            <Button type="button" onClick={startOAuth} disabled={loading} className="w-full text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">{loading ? "Connecting…" : "Connect Supabase account"}</Button>
          )}
          {error && <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[10px] text-red-600"><AlertCircle size={14} strokeWidth={2} />{error}</div>}
        </div>
        {jobStatus && (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-gray-700">Provisioning status</Label>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-medium text-gray-500">Status</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{jobStatus.status}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500">Progress</p>
                  <p className="text-sm font-medium text-gray-900">{jobStatus.progress ?? 0}%</p>
                </div>
              </div>
              {jobSteps.length > 0 && (
                <div className="mt-4 space-y-2">
                  {jobSteps.map((s) => {
                    const statusClass = s.status === "SUCCEEDED" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : s.status === "RUNNING" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : s.status === "FAILED" ? "bg-red-100 text-red-700 border-red-200" : "bg-gray-50 text-gray-400 border-gray-200";
                    return (
                      <div key={s.step} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 bg-white">
                        <div className={"size-5 rounded-full flex items-center justify-center text-[9px] font-semibold " + statusClass}>
                          {s.status === "SUCCEEDED" ? <Check size={10} strokeWidth={2} /> : s.status === "FAILED" ? <X size={10} strokeWidth={2} /> : s.status === "RUNNING" ? <Loader2 size={10} strokeWidth={2} className="animate-spin" /> : "-"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900">{s.step}</p>
                          <span className="text-[9px] text-gray-500">{s.status}</span>
                        </div>
                        {s.message && <p className="text-[9px] text-gray-400">{s.message}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
              {jobStatus.status === "FAILED" && jobStatus.errorMessage && <p className="mt-3 text-[10px] text-red-600">{jobStatus.errorMessage}</p>}
            </div>
          </div>
        )}
        {!jobStatus && hasConnection && (
          <p className="text-[10px] text-gray-400">Provisioning will start when you provision your store on the Review step.</p>
        )}
        {!hasConnection && !oauthState && (
          <p className="text-[10px] text-gray-400">Connect a Supabase account to set up your store's database.</p>
        )}
      </div>
      <CardFooter className="flex items-center justify-between gap-3 px-8 py-4 border-t border-gray-100 bg-gray-50/50">
        <Button type="button" variant="outline" size="sm" onClick={() => setStep(3)} className="text-xs font-medium text-gray-600 hover:bg-gray-100">Back</Button>
        <Button type="button" size="sm" onClick={() => { if (oauthState) finalizeConnection(); else setStep(5); }} disabled={!hasConnection || loading} className="text-xs font-medium bg-primary text-white hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed">Continue</Button>
      </CardFooter>
    </CardContent>
  );
}

function WizardStep5({ storeForm, businessForm, shippingForm, connectionId, setStep, error, jobStatus }: { storeForm: ReturnType<typeof useForm<StoreFormValues>>; businessForm: ReturnType<typeof useForm<BusinessFormValues>>; shippingForm: ReturnType<typeof useForm<ShippingFormValues>>; connectionId: string | undefined; setStep: (n: number) => void; error: string | null; jobStatus: JobStatus | null; }) {
  return (
    <CardContent className="px-8 pt-8 pb-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="size-5" /></div>
        <h2 className="text-xl font-bold text-gray-900">Review</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">Confirm your store details before provisioning.</p>
      <div className="mt-8 space-y-6">
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <Store className="size-4.5 shrink-0 text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-gray-500">Store name</p>
            <p className="text-sm font-medium text-gray-900">{storeForm.getValues("storeName")}</p>
            <p className="text-[10px] text-gray-500">{storeForm.getValues("storeSlug")}.zerocraft.studio</p>
          </div>
          <Button type="button" size="xs" variant="outline" onClick={() => setStep(1)} className="text-[10px]">Edit</Button>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <Building2 className="size-4.5 shrink-0 text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-gray-500">Business type</p>
            <p className="text-sm font-medium text-gray-900">{BUSINESS_TYPES.find((b) => b.key === businessForm.getValues("businessType"))?.label || businessForm.getValues("businessType")}</p>
            <p className="text-[10px] text-gray-500">{businessForm.getValues("country")} · {businessForm.getValues("city")}</p>
          </div>
          <Button type="button" size="xs" variant="outline" onClick={() => setStep(2)} className="text-[10px]">Edit</Button>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <Truck className="size-4.5 shrink-0 text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-gray-500">Shipping origin</p>
            <p className="text-sm font-medium text-gray-900">{shippingForm.getValues("shippingOrigin")}</p>
            <p className="text-[10px] text-gray-500">{shippingForm.getValues("destinationZones").join(", ") || "—"}</p>
          </div>
          <Button type="button" size="xs" variant="outline" onClick={() => setStep(3)} className="text-[10px]">Edit</Button>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <Database className="size-4.5 shrink-0 text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-gray-500">Database (Supabase)</p>
            <p className="text-sm font-medium text-gray-900">{jobStatus?.status ? jobStatus.status : connectionId ? "Connection established" : "Not connected"}</p>
            <p className="text-[10px] text-gray-500">Database provisioning starts when you provision your store</p>
          </div>
          <Button type="button" size="xs" variant="outline" onClick={() => setStep(4)} className="text-[10px]">Edit</Button>
        </div>
        {error && <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[10px] text-red-600"><AlertCircle size={14} strokeWidth={2} />{error}</div>}
      </div>
      <CardFooter className="flex items-center justify-between gap-3 px-8 py-4 border-t border-gray-100 bg-gray-50/50">
        <Button type="button" variant="outline" size="sm" onClick={() => setStep(4)} className="text-xs font-medium text-gray-600 hover:bg-gray-100">Back</Button>
        <Button type="button" size="sm" disabled={error !== null} className="text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">Provision store</Button>
      </CardFooter>
    </CardContent>
  );
}

function WizardStep6({ jobStatus, jobSteps, loading, setStep }: { jobStatus: JobStatus | null; jobSteps: JobStep[]; loading: boolean; setStep: (n: number) => void; }) {
  const failed = jobStatus?.status === "FAILED";
  const needsReauth = jobStatus?.status === "NEEDS_REAUTHORIZATION";
  const succeeded = jobStatus?.status === "SUCCEEDED";

  if (succeeded) {
    return (
      <CardContent className="px-8 pt-8 pb-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto mb-4">
          <CheckCircle size={24} strokeWidth={2} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Store ready</h2>
        <p className="mt-1 text-sm text-gray-600 text-center">Your customer-owned commerce project is provisioned and active.</p>
        <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-600">
          <ShieldCheck size={14} strokeWidth={2} />
          <span>Project {jobStatus?.id?.slice(-8)} is active</span>
        </div>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button type="button" size="sm" onClick={() => setStep(5)} className="text-xs font-medium text-emerald-600 hover:bg-emerald-50">Back</Button>
          <Link href="/overview">
            <Button type="button" size="sm" className="text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700">Go to dashboard</Button>
          </Link>
        </div>
      </CardContent>
    );
  }

  return (
    <>
      <CardContent className="px-8 pt-8 pb-8">
        <div className="flex items-center gap-3 mb-1">
          <Loader2 className="size-5 shrink-0 animate-spin text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-900">Provisioning progress</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600">Your tenant project is being set up. You can close this page; the job continues in the background.</p>
        <div className="mt-8 space-y-3">
          {jobSteps.map((s) => {
            const statusClass = s.status === "SUCCEEDED" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : s.status === "RUNNING" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : s.status === "FAILED" ? "bg-red-100 text-red-700 border-red-200" : "bg-gray-50 text-gray-400 border-gray-200";
            return (
              <div key={s.step} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 bg-white">
                <div className={"size-5 rounded-full flex items-center justify-center text-[9px] font-semibold " + statusClass}>
                  {s.status === "SUCCEEDED" ? <Check size={10} strokeWidth={2} /> : s.status === "FAILED" ? <X size={10} strokeWidth={2} /> : s.status === "RUNNING" ? <Loader2 size={10} strokeWidth={2} className="animate-spin" /> : "-"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">{s.step}</p>
                  <span className="text-[9px] text-gray-500">{s.status}</span>
                </div>
                {s.message && <p className="text-[9px] text-gray-400">{s.message}</p>}
              </div>
            );
          })}
          {failed && <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3"><h3 className="text-[10px] font-semibold text-red-600">Provisioning failed</h3><p className="mt-1 text-[10px] text-gray-600">{jobStatus?.errorMessage ?? "Unknown error."}</p></div>}
          {needsReauth && <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3"><h3 className="text-[10px] font-semibold text-emerald-600">Supabase authorization needed</h3><p className="mt-1 text-[10px] text-gray-600">Please reconnect your Supabase account and retry.</p></div>}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3 px-8 py-4 border-t border-gray-100 bg-gray-50/50">
        <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)} disabled={loading || jobStatus?.status === "RUNNING"} className="text-xs font-medium text-gray-600 hover:bg-gray-100">Back</Button>
        {failed || needsReauth ? (
          <Button type="button" size="sm" onClick={() => setStep(1)} className="text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700">Retry</Button>
        ) : (
          <Button type="button" size="sm" disabled className="text-xs font-medium bg-gray-100 text-gray-400 cursor-not-allowed">Waiting…</Button>
        )}
      </CardFooter>
    </>
  );
}
