"use server";

import { cookies } from "next/headers";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchTaxonomyManifest } from "@/lib/taxonomy";
import {
  startSupabaseOAuth,
  getPendingOAuthSession as fetchPendingOAuthSession,
  finalizeSupabaseOAuth,
  allowedRegions,
} from "@/lib/provisioner";

export type CreateOrganizationResult =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

export async function createOrganization(
  name: string,
  taxonomyRootIds: string[] = [],
): Promise<CreateOrganizationResult> {
  const selectedRoots = [...new Set(taxonomyRootIds)];
  if (selectedRoots.length !== taxonomyRootIds.length || selectedRoots.length > 26) {
    return { ok: false, error: "Choose valid Shopify product category groups." };
  }

  try {
    const manifest = await fetchTaxonomyManifest();
    const allowedRootIds = new Set(manifest.roots.map((root) => `gid://shopify/TaxonomyCategory/${root.prefix}`));
    if (selectedRoots.some((id) => !allowedRootIds.has(id))) {
      return { ok: false, error: "Choose valid Shopify product category groups." };
    }
  } catch {
    return { ok: false, error: "Shopify product categories are temporarily unavailable." };
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Unauthenticated" };
  }

  // Check if the user already has an active membership.
  const { data: existingMembers } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (existingMembers && existingMembers.length > 0) {
    return { ok: false, error: "You already belong to an organization." };
  }

  // Call the private RPC that creates the organization, default locations,
  // settings, and the Owner membership atomically. This RPC is created by
  // migration 003 (private.create_organization, public wrapper
  // public.create_organization). Use the server client (not the admin client)
  // so that auth.uid() resolves from the caller's JWT inside the SECURITY
  // DEFINER RPC. The taxonomy selection is validated against the manifest
  // above but is not persisted by this RPC (no taxonomy table exists yet).
  const { data, error } = await supabase.rpc("create_organization", {
    p_name: name.trim(),
    p_timezone: "Asia/Kolkata",
    p_currency: "INR",
  });

  if (error || !data) {
    // Surface the real database error in server logs during development so it
    // is not hidden behind the generic client-facing message.
    console.error("create_organization RPC failed:", error);
    return { ok: false, error: "Unable to create organization." };
  }

  return { ok: true, organizationId: data as string };
}

/**
 * Starts the Supabase OAuth flow for connecting a customer-owned Supabase
 * account. Called by the wizard after organization creation.
 */
export async function connectSupabaseAccount(input: {
  organizationId: string;
  returnTo: string;
}): Promise<{ ok: true; authorizeUrl: string; scopes: string[] } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession();

  if (authError || !session?.access_token) {
    return { ok: false, error: "Unauthenticated" };
  }

  try {
    const result = await startSupabaseOAuth({
      organizationId: input.organizationId,
      userAccessToken: session.access_token,
      returnTo: input.returnTo,
    });
    return { ok: true, authorizeUrl: result.authorizeUrl, scopes: result.scopes };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Unable to start Supabase connection." };
  }
}

/**
 * After the OAuth callback redirects back with `?oauth=select&state=...`,
 * fetch the pending session (list of granted Supabase organizations) so the
 * user can choose one.
 */
export async function getPendingOAuthSession(input: {
  state: string;
}): Promise<{
  ok: true;
  organizationId: string;
  organizations: Array<{ id: string; name: string; slug: string }>;
  expiresAt: string;
} | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession();

  if (authError || !session?.access_token) {
    return { ok: false, error: "Unauthenticated" };
  }

  try {
    const result = await fetchPendingOAuthSession({
      state: input.state,
      userAccessToken: session.access_token,
    });
    return {
      ok: true,
      organizationId: result.organizationId,
      organizations: result.organizations,
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Unable to load pending Supabase session." };
  }
}

/**
 * Finalizes the OAuth connection after the user selects a Supabase
 * organization. Called by the wizard's organization-selection step.
 */
export async function finalizeSupabaseConnection(input: {
  state: string;
  supabaseOrganizationId: string;
  accountName?: string;
}): Promise<{
  ok: true;
  connectionId: string;
  organization: { id: string; name: string; slug: string };
} | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession();

  if (authError || !session?.access_token) {
    return { ok: false, error: "Unauthenticated" };
  }

  try {
    const result = await finalizeSupabaseOAuth({
      state: input.state,
      supabaseOrganizationId: input.supabaseOrganizationId,
      accountName: input.accountName,
      userAccessToken: session.access_token,
    });
    return {
      ok: true,
      connectionId: result.connectionId,
      organization: result.organization,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Unable to finalize Supabase connection." };
  }
}

/**
 * Creates a store (draft) and enqueues a tenant provisioning job. Returns the
 * job id so the client can poll for progress.
 */
export async function provisionTenantStore(input: {
  organizationId: string;
  storeName: string;
  storeSlug: string;
  region: string;
  connectionId: string;
  idempotencyKey: string;
}): Promise<{ ok: true; jobId: string; storeId: string } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Unauthenticated" };
  }

  // Create a draft store.
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({
      organization_id: input.organizationId,
      name: input.storeName,
      slug: input.storeSlug,
      status: "draft",
    })
    .select("id")
    .single();

  if (storeError || !store) {
    return { ok: false, error: "Unable to create store record." };
  }

  // Enqueue the provisioning job via the database RPC. The RPC itself checks
  // ownership and idempotency. It returns the job id.
  const { data: jobId, error: jobError } = await supabase.rpc("enqueue_tenant_provisioning", {
    p_organization_id: input.organizationId,
    p_store_id: store.id,
    p_connection_id: input.connectionId,
    p_idempotency_key: input.idempotencyKey,
    p_project_name: input.storeSlug,
    p_region: input.region,
    p_template_name: "zerocraft-default-commerce",
    p_template_version: "1.0.0",
    p_metadata: {},
  });

  if (jobError || !jobId) {
    return { ok: false, error: "Unable to start provisioning job." };
  }

  return { ok: true, jobId: jobId as string, storeId: store.id };
}

/**
 * Returns the current job status and steps for the client to display progress.
 */
export async function getProvisioningJobStatus(jobId: string): Promise<{
  ok: true;
  job: {
    id: string;
    status: string;
    currentStep: string | null;
    progress: number;
    errorCode: string | null;
    errorMessage: string | null;
  };
  steps: Array<{
    step: string;
    status: string;
    message: string | null;
  }>;
} | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();

  const { data: job, error } = await supabase
    .from("tenant_provisioning_jobs")
    .select("id, status, current_step, progress, error_code, error_message")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    return { ok: false, error: "Job not found." };
  }

  const { data: steps, error: stepsError } = await supabase
    .from("tenant_provisioning_job_steps")
    .select("step, status, message")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  if (stepsError) {
    return { ok: false, error: "Unable to load job steps." };
  }

  return {
    ok: true,
    job: {
      id: job.id,
      status: job.status,
      currentStep: job.current_step,
      progress: job.progress ?? 0,
      errorCode: job.error_code,
      errorMessage: job.error_message,
    },
    steps: (steps ?? []).map((s) => ({
      step: s.step,
      status: s.status,
      message: s.message,
    })),
  };
}

/**
 * Returns the list of allowed regions for tenant project provisioning.
 */
export async function getAllowedRegions(): Promise<string[]> {
  return allowedRegions();
}

/**
 * Retries a failed or cancelled provisioning job (owner only).
 */
export async function retryProvisioningJob(jobId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("retry_tenant_provisioning_job", {
    p_job_id: jobId,
  });

  if (error) {
    return { ok: false, error: error.message ?? "Unable to retry job." };
  }

  return { ok: true };
}

/**
 * Cancels a provisioning job (owner only).
 */
export async function cancelProvisioningJob(jobId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("cancel_tenant_provisioning_job", {
    p_job_id: jobId,
  });

  if (error) {
    return { ok: false, error: error.message ?? "Unable to cancel job." };
  }

  return { ok: true };
}

/**
 * Returns the setup completion status for the active organization.
 * Used by the dashboard overview to surface an incomplete setup wizard.
 */
export type SetupStatus = {
  ok: true;
  complete: boolean;
  storeId: string | null;
  jobId: string | null;
  jobStatus: string | null;
  jobProgress: number;
  setupUrl: string;
} | {
  ok: false;
  error: string;
};

// In-memory cache for getSetupStatus with 5s TTL to prevent redundant
// queries during React Strict Mode double-invocation or HMR remounts.
// Key: userId:organizationId, Value: { status: SetupStatus, expiresAt: number }
const setupStatusCache = new Map<string, { status: SetupStatus; expiresAt: number }>();
const SETUP_STATUS_TTL_MS = 5_000;

function getCacheKey(userId: string, organizationId: string): string {
  return `${userId}:${organizationId}`;
}

function getCachedStatus(userId: string, organizationId: string): SetupStatus | null {
  const key = getCacheKey(userId, organizationId);
  const entry = setupStatusCache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.status;
  }
  if (entry) {
    setupStatusCache.delete(key);
  }
  return null;
}

function setCachedStatus(userId: string, organizationId: string, status: SetupStatus): void {
  const key = getCacheKey(userId, organizationId);
  setupStatusCache.set(key, { status, expiresAt: Date.now() + SETUP_STATUS_TTL_MS });
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Unauthenticated" };
  }

  // Resolve the active organization from the membership cookie / single membership.
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!memberships || memberships.length === 0) {
    return { ok: false, error: "No active organization membership." };
  }

  // Prefer the cookie-selected organization, otherwise the single membership.
  const cookieOrg = (await cookies()).get("maara_active_organization")?.value;
  const organizationId = cookieOrg
    ? memberships.find((m) => m.organization_id === cookieOrg)?.organization_id ??
      memberships[0]!.organization_id
    : memberships.length === 1
      ? memberships[0]!.organization_id
      : memberships[0]!.organization_id;

  // Check cache to avoid redundant queries during rapid remounts (Strict Mode, HMR).
  const cached = getCachedStatus(user.id, organizationId);
  if (cached) {
    return cached;
  }

  // Find the store for this organization.
  const { data: stores } = await supabase
    .from("stores")
    .select("id, slug, status")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1);

  const store = stores?.[0];
  if (!store) {
    const status: SetupStatus = {
      ok: true,
      complete: false,
      storeId: null,
      jobId: null,
      jobStatus: null,
      jobProgress: 0,
      setupUrl: `/onboarding/setup?organizationId=${organizationId}`,
    };
    setCachedStatus(user.id, organizationId, status);
    return status;
  }

  // Find the tenant database and latest provisioning job for this store.
  const { data: databases } = await supabase
    .from("tenant_databases")
    .select("id, lifecycle_status")
    .eq("store_id", store.id)
    .limit(1);

  const database = databases?.[0];
  if (database?.lifecycle_status === "ACTIVE") {
    const status: SetupStatus = {
      ok: true,
      complete: true,
      storeId: store.id,
      jobId: null,
      jobStatus: null,
      jobProgress: 100,
      setupUrl: `/onboarding/setup?organizationId=${organizationId}`,
    };
    setCachedStatus(user.id, organizationId, status);
    return status;
  }

  const { data: jobs } = await supabase
    .from("tenant_provisioning_jobs")
    .select("id, status, progress, error_code, error_message")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const job = jobs?.[0];
  if (!job) {
    const status: SetupStatus = {
      ok: true,
      complete: false,
      storeId: store.id,
      jobId: null,
      jobStatus: null,
      jobProgress: 0,
      setupUrl: `/onboarding/setup?organizationId=${organizationId}`,
    };
    setCachedStatus(user.id, organizationId, status);
    return status;
  }

  const status: SetupStatus = {
    ok: true,
    complete: job.status === "SUCCEEDED",
    storeId: store.id,
    jobId: job.id,
    jobStatus: job.status,
    jobProgress: job.progress ?? 0,
    setupUrl: `/onboarding/setup?organizationId=${organizationId}`,
  };
  setCachedStatus(user.id, organizationId, status);
  return status;
}
