"use client";

import { useCallback, useEffect, useState } from "react";
import { IconBrandGoogle, IconDatabase, IconCheck, IconChevronRight, IconLoader2, IconLock, IconPlugConnected, IconRefresh, IconUnlink, IconX } from "@tabler/icons-react";

type Provider = "gemini" | "supabase";
type Snapshot = {
  integrations: { provider: Provider; display_name: string; status: string; last_verified_at: string | null; updated_at: string; enabled?: boolean; has_saved_credentials?: boolean }[];
  migrationRequired: boolean;
  encryptionConfigured: boolean;
  core: {
    supabase: { ready: boolean; detail: string };
    gemini: { ready: boolean; configured: boolean; model: string; source: string };
  };
};
type Pending = { provider: Provider; credentials: Record<string, string> };
type PlannedProvider = "workspace" | "github" | "vercel";

const plannedProviders: Record<PlannedProvider, { name: string; mark: string; description: string; scope: string; requirements: string[] }> = {
  workspace: { name: "Google Workspace", mark: "G", description: "Connect Gmail, Drive, and Calendar for your workspace.", scope: "Gmail · Drive · Calendar", requirements: ["Create a Google OAuth app", "Add the Studio callback URL to the OAuth client", "Choose which Workspace scopes Studio can access"] },
  github: { name: "GitHub", mark: "GH", description: "Link repositories and deployment workflows to Studio.", scope: "Repositories · Deployments", requirements: ["Register a GitHub OAuth app", "Add the Studio callback URL", "Choose repository access for the connection"] },
  vercel: { name: "Vercel", mark: "▲", description: "Connect projects and deployment status from Vercel.", scope: "Projects · Deployments", requirements: ["Create a Vercel OAuth integration", "Configure the Studio callback URL", "Select the Vercel team and projects to authorize"] },
};

const providerInfo = {
  gemini: {
    title: "Google Gemini", subtitle: "AI models", icon: IconBrandGoogle,
    description: "Power the Studio assistant and editorial drafting with the Gemini API.",
    caution: "The API key is sent to Google once to verify it, then encrypted before it is stored. Keep the key server-side and rotate it in Google AI Studio if it is exposed.",
  },
  supabase: {
    title: "Supabase", subtitle: "Database & authentication", icon: IconDatabase,
    description: "Connect the project that stores Studio content, staff access, and commerce records.",
    caution: "A Supabase secret/service_role key has full database access and bypasses row-level security. It is sent only to your configured Supabase project for verification, then encrypted in the server-side vault. Never use a publishable key here.",
  },
} satisfies Record<Provider, { title: string; subtitle: string; icon: typeof IconDatabase; description: string; caution: string }>;

export default function IntegrationsManager({ canManage }: { canManage: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [formProvider, setFormProvider] = useState<Provider | null>(null);
  const [plannedProvider, setPlannedProvider] = useState<PlannedProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-3.8-flash");
  const [projectUrl, setProjectUrl] = useState("");
  const [serviceKey, setServiceKey] = useState("");
  const [updatingGeminiState, setUpdatingGeminiState] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/studio/integrations", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load integration status.");
      setSnapshot(await response.json());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load integrations.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/studio/integrations", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load integration status.");
        return await response.json() as Snapshot;
      })
      .then(setSnapshot)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load integrations.");
      });
    return () => controller.abort();
  }, []);

  const close = () => {
    setFormProvider(null); setPending(null); setApiKey(""); setServiceKey(""); setProjectUrl(""); setConfirmed(false); setError("");
  };

  const startSetup = (provider: Provider) => {
    setFormProvider(provider); setPending(null); setNotice(""); setError("");
    setModel(snapshot?.core.gemini.model || "gemini-3.8-flash");
    setProjectUrl(""); setApiKey(""); setServiceKey(""); setConfirmed(false);
  };

  const prepare = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!formProvider) return;
    const credentials: Record<string, string> = formProvider === "gemini"
      ? { apiKey: apiKey.trim(), model: model.trim() }
      : { url: projectUrl.trim(), serviceRoleKey: serviceKey.trim() };
    if (Object.values(credentials).some((value) => !value)) { setError("Complete each field to continue."); return; }
    setPending({ provider: formProvider, credentials });
    setConfirmed(false);
  };

  const connect = async () => {
    if (!pending || !confirmed) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/studio/integrations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pending, confirmed: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Connection could not be verified.");
      setNotice(result.message || "Connection verified and saved."); close(); await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connection failed. Try again.");
    } finally { setBusy(false); }
  };

  const disconnect = async (provider: Provider) => {
    const copy = provider === "supabase"
      ? "Disconnect the saved Supabase override? Studio data and authentication still use the deployment connection."
      : "Remove the saved Gemini key? The server environment key, if configured, will remain available.";
    if (!window.confirm(copy)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/studio/integrations", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, confirmed: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not disconnect provider.");
      setNotice(`${providerInfo[provider].title} saved credentials removed.`); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not disconnect provider."); }
    finally { setBusy(false); }
  };

  const rowFor = (provider: Provider) => snapshot?.integrations.find((entry) => entry.provider === provider);
  const ready = (provider: Provider) => provider === "gemini" && rowFor("gemini")?.enabled === false ? false : Boolean(rowFor(provider)?.status === "connected" || snapshot?.core[provider].ready);
  const geminiEnabled = rowFor("gemini")?.enabled !== false;

  const toggleGeminiEnabled = async () => {
    setUpdatingGeminiState(true); setError("");
    try {
      const response = await fetch("/api/studio/integrations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "gemini", enabled: !geminiEnabled }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update Gemini state.");
      setNotice(`Gemini ${result.enabled ? "enabled" : "disabled"}.`); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update Gemini state."); }
    finally { setUpdatingGeminiState(false); }
  };

  return (
    <div className="studio-integrations-manager">
      {snapshot?.migrationRequired && <div className="studio-integration-callout is-warning"><strong>Secure vault setup required</strong><p>Apply <code>supabase/studio-integrations-vault.sql</code> in the Supabase SQL editor, then configure <code>STUDIO_CREDENTIALS_ENCRYPTION_KEY</code> on the server and redeploy.</p></div>}
      {snapshot && !snapshot.encryptionConfigured && <div className="studio-integration-callout is-warning"><strong>Credential encryption is not configured</strong><p>Add a 32-byte base64url <code>STUDIO_CREDENTIALS_ENCRYPTION_KEY</code> to your local and deployment secrets before saving API keys.</p></div>}
      {notice && <div className="studio-integration-callout is-success" role="status"><IconCheck size={16} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><IconX size={14} /></button></div>}
      {error && !formProvider && <div className="studio-integration-callout is-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss"><IconX size={14} /></button></div>}
      <div className="studio-integration-cards grid gap-3">
        {(["gemini", "supabase"] as const).map((provider) => {
          const info = providerInfo[provider]; const Icon = info.icon; const connected = ready(provider); const saved = Boolean(rowFor(provider)?.has_saved_credentials);
          const disabled = provider === "gemini" && rowFor("gemini")?.enabled === false;
          const configured = saved || (provider === "gemini" && Boolean(snapshot?.core.gemini.configured)) || (provider === "supabase" && Boolean(snapshot?.core.supabase.ready));
          const status = snapshot ? (disabled ? "Disabled" : saved ? "Securely connected" : connected ? "Connected via server environment" : "Not connected") : "Checking connection";
          const capabilities = provider === "gemini" ? ["Generate content", "AI assistant", "Model access"] : ["Database", "Authentication", "Workspace data"];
          return <article className="studio-integration-card grid gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 md:grid-cols-[minmax(0,1fr)_auto]" key={provider}>
            <div className="flex min-w-0 items-start gap-3">
              <span className={`studio-integration-provider-icon is-${provider}`}><Icon size={21} /></span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{info.title}</h3>
                  <span className={`studio-settings-badge ${connected && !disabled ? "is-ready" : "is-missing"}`}><i className={`studio-settings-dot ${connected && !disabled ? "is-ready" : "is-missing"}`} />{status}</span>
                </div>
                <p className="text-sm text-muted-foreground">{info.description}</p>
                <div className="flex flex-wrap gap-1.5" aria-label={`${info.title} capabilities`}>
                  {capabilities.map((capability) => <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground" key={capability}>{capability}</span>)}
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-2 md:items-end">
              <span className="text-xs text-muted-foreground">{disabled ? "Disabled by admin" : saved ? "Saved credential" : connected ? "Environment" : "Not configured"}</span>
              {provider === "gemini" && (connected || disabled) && <div className="text-xs text-muted-foreground">Model <strong className="font-medium text-foreground">{saved ? "Managed key" : snapshot?.core.gemini.model}</strong></div>}
              {provider === "supabase" && connected && <div className="text-xs text-muted-foreground">Project <strong className="font-medium text-foreground">{snapshot?.core.supabase.detail}</strong></div>}
            </div>
            <footer className="flex flex-wrap items-center justify-end gap-2 md:col-span-2">
              {canManage ? <button className="studio-integration-primary" disabled={busy || !snapshot?.encryptionConfigured || Boolean(snapshot?.migrationRequired)} onClick={() => startSetup(provider)}>{configured ? "Manage" : "Connect"}</button> : <span className="studio-integration-readonly">Admin setup</span>}
              {provider === "gemini" && canManage && configured && <button type="button" className={`inline-flex min-h-8 items-center gap-2 rounded-md border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-50 ${geminiEnabled ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" : ""}`} role="switch" aria-checked={geminiEnabled} disabled={updatingGeminiState || Boolean(snapshot?.migrationRequired)} title={snapshot?.migrationRequired ? "Apply the integrations vault migration to change this setting." : undefined} onClick={() => void toggleGeminiEnabled()}><i className={`size-2 rounded-full ${geminiEnabled ? "bg-emerald-500" : "bg-zinc-400"}`} />{updatingGeminiState ? "Saving…" : geminiEnabled ? "Enabled" : "Disabled"}</button>}
              {saved && canManage && <button className="studio-integration-remove" disabled={busy} onClick={() => void disconnect(provider)} aria-label={`Disconnect ${info.title}`}><IconUnlink size={15} /> Remove saved key</button>}
            </footer>
          </article>;
        })}
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Available integrations</p><h3 className="mt-1 text-sm font-semibold">Connect your tools</h3><p className="mt-1 text-sm text-muted-foreground">Choose a provider to review the setup requirements.</p></div><span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">OAuth setup</span></div>
        <div className="divide-y border-t">
          {(Object.entries(plannedProviders) as [PlannedProvider, typeof plannedProviders[PlannedProvider]][]).map(([key, integration]) => <article className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3" key={key}>
            <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted text-sm font-semibold" aria-hidden="true">{integration.mark}</span>
            <div className="min-w-0 flex-1"><strong className="block text-sm font-medium">{integration.name}</strong><small className="mt-0.5 block text-xs text-muted-foreground">{integration.description}</small></div>
            <span className="hidden text-xs text-muted-foreground lg:block">{integration.scope}</span>
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"><i className="size-1.5 rounded-full bg-amber-500" /> Setup needed</span>
            <button className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent" type="button" onClick={() => setPlannedProvider(key)}>View setup <IconChevronRight size={14} /></button>
          </article>)}
        </div>
      </div>
      <div className="studio-integrations-security"><IconLock size={15} /><span><strong>Protected credentials</strong><small>Saved credentials are encrypted with a deployment secret and are never returned to the browser. Server-side operations use them only when needed. Only administrators can manage providers.</small></span><button onClick={() => void refresh()} aria-label="Refresh integration status"><IconRefresh size={15} /></button></div>

      {formProvider && <div className="studio-integration-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <section className="studio-integration-modal" role="dialog" aria-modal="true" aria-labelledby="integration-modal-title">
          <header><span className={`studio-integration-provider-icon is-${formProvider}`}>{formProvider === "gemini" ? <IconBrandGoogle size={20} /> : <IconDatabase size={20} />}</span><div><p className="studio-settings-eyebrow">PROVIDER SETUP</p><h3 id="integration-modal-title">{pending ? "Review connection" : `Connect ${providerInfo[formProvider].title}`}</h3></div><button onClick={close} aria-label="Close"><IconX size={17} /></button></header>
          {!pending ? <form onSubmit={prepare}>
            {formProvider === "gemini" ? <>
              <label>Gemini API key<input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste your Gemini API key" required /></label>
              <label>Model ID<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="gemini-3.8-flash" required /></label>
              <p className="studio-integration-help">Create a key in Google AI Studio. The key stays hidden after saving; rotation requires entering a new key.</p>
            </> : <>
              <label>Supabase project URL<input type="url" autoComplete="url" value={projectUrl} onChange={(event) => setProjectUrl(event.target.value)} placeholder="https://your-project.supabase.co" required /></label>
              <label>Secret / service_role key<input type="password" autoComplete="new-password" value={serviceKey} onChange={(event) => setServiceKey(event.target.value)} placeholder="sb_secret_…" required /></label>
              <p className="studio-integration-help">The active CMS database remains the project configured in deployment environment. This saved provider entry is for securely verifying and managing the project connection; it does not switch Studio authentication.</p>
            </>}
            {error && <p className="studio-integration-error" role="alert">{error}</p>}
            <footer><button type="button" className="studio-integration-secondary" onClick={close}>Cancel</button><button className="studio-integration-primary" type="submit">Review setup <IconChevronRight size={15} /></button></footer>
          </form> : <div className="studio-integration-review">
            <div className="studio-integration-callout is-warning"><IconLock size={16} /><p>{providerInfo[formProvider].caution}</p></div>
            <div className="studio-integration-review-value"><small>Provider</small><strong>{providerInfo[formProvider].title}</strong><small>{formProvider === "gemini" ? `Model · ${pending.credentials.model}` : pending.credentials.url}</small><strong className="studio-integration-secret-mask">••••••••••••••••••••</strong></div>
            <label className="studio-integration-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I understand and approve verifying and saving this credential.</label>
            {error && <p className="studio-integration-error" role="alert">{error}</p>}
            <footer><button className="studio-integration-secondary" onClick={() => { setPending(null); setConfirmed(false); }}>Back</button><button className="studio-integration-primary" disabled={!confirmed || busy} onClick={() => void connect()}>{busy ? <><IconLoader2 className="is-spinning" size={15} /> Verifying…</> : <><IconPlugConnected size={15} /> Verify & connect</>}</button></footer>
          </div>}
        </section>
      </div>}
      {plannedProvider && <div className="studio-integration-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPlannedProvider(null); }}>
        <section className="studio-integration-modal text-foreground" role="dialog" aria-modal="true" aria-labelledby="planned-integration-title">
          <header><span className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted text-sm font-semibold" aria-hidden="true">{plannedProviders[plannedProvider].mark}</span><div><p className="studio-settings-eyebrow">OAUTH PROVIDER</p><h3 id="planned-integration-title">{plannedProviders[plannedProvider].name}</h3></div><button type="button" onClick={() => setPlannedProvider(null)} aria-label="Close"><IconX size={17} /></button></header>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{plannedProviders[plannedProvider].description}</p>
          <div className="flex items-start gap-2 rounded-md border bg-muted p-3 text-sm text-muted-foreground"><IconLock className="mt-0.5 shrink-0" size={16} /><p>OAuth sign-in is not configured for this provider yet. Complete these steps before enabling account access:</p></div>
          <ol className="my-4 grid list-decimal gap-2 pl-5 text-sm leading-relaxed">{plannedProviders[plannedProvider].requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ol>
          <p className="text-xs text-muted-foreground">No account will be connected until the OAuth callback and server credentials are configured.</p>
          <footer className="mt-4 flex justify-end border-t pt-3"><button type="button" className="studio-integration-primary" onClick={() => setPlannedProvider(null)}>Done</button></footer>
        </section>
      </div>}
    </div>
  );
}
