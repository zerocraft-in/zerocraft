/**
 * Tenant provisioning state machine.
 *
 * Steps (mirrored in tenant_provisioning_job_steps):
 *   validate_target -> ensure_oauth -> create_project -> wait_healthy ->
 *   install_migrations -> install_seeds -> initialize_tenant ->
 *   verify_template -> activate_tenant
 *
 * The job is resumable: applied files are skipped when the Platform DB ledger
 * has an APPLIED row with the same checksum. A checksum mismatch never
 * self-repairs; it fails the job.
 */

import { decryptSecret, encryptSecret, randomPassword, sha256Hex } from "./crypto";
import { eq, inList, PlatformDb } from "./platform-db";
import {
  anonKeyFrom,
  ManagementApi,
  ManagementApiError,
  type SupabaseProject
} from "./management";
import {
  exchangeAuthorizationCode,
  expiryFrom,
  OAuthError,
  refreshAccessToken,
  type OAuthTokens
} from "./oauth";
import { sanitizeError } from "./http";
import { TEMPLATE_BUNDLE, type TemplateFile } from "./template-bundle";

const TEMPLATE = TEMPLATE_BUNDLE;
const DEFAULT_PROTECTED_REFS = ["ftcvyhlzeyqceosdqyxn", "qvjhwxriafgobxknpqtq"];

export interface OrganizationRow {
  id: string;
  name: string;
  currency: string;
  timezone: string;
}

export interface StoreRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  status: string;
}

export interface ConnectionRow {
  id: string;
  organization_id: string;
  supabase_organization_id: string | null;
  supabase_organization_slug: string | null;
  account_name: string | null;
  connection_status: string;
  scopes: string[];
  access_token_expires_at: string | null;
}

export interface TokenRow {
  connection_id: string;
  key_id: string;
  access_token_ciphertext: string;
  access_token_nonce: string;
  refresh_token_ciphertext: string | null;
  refresh_token_nonce: string | null;
}

export interface JobRow {
  id: string;
  organization_id: string;
  store_id: string;
  tenant_database_id: string | null;
  connection_id: string;
  status: string;
  current_step: string | null;
  attempt_count: number;
  max_attempts: number;
  requested_by: string | null;
  metadata: Record<string, unknown>;
}

export interface TenantDatabaseRow {
  id: string;
  organization_id: string;
  store_id: string;
  supabase_project_ref: string;
  supabase_organization_slug: string;
  project_name: string;
  region: string;
  lifecycle_status: string;
  project_url: string | null;
  publishable_key: string | null;
}

export interface TenantMigrationRow {
  id: string;
  tenant_database_id: string;
  template_name: string;
  template_version: string;
  version: string;
  kind: string;
  checksum: string;
  status: string;
}

export interface ProfileRow {
  id: string;
  full_name: string | null;
}

export class ReauthorizationRequiredError extends Error {
  constructor(message = "Supabase authorization expired or was revoked") {
    super(message);
    this.name = "ReauthorizationRequiredError";
  }
}

export class TemplateChecksumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateChecksumError";
  }
}

export class ProjectNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectNotReadyError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

type AppliedFile = Omit<TemplateFile, "kind"> & {
  kind: TemplateFile["kind"] | "init";
};

export function serviceDb(env: Env): PlatformDb {
  return new PlatformDb({
    url: env.SUPABASE_PLATFORM_URL,
    apiKey: env.SUPABASE_PLATFORM_SERVICE_ROLE_KEY
  });
}

export function userDb(env: Env, accessToken: string): PlatformDb {
  return new PlatformDb({
    url: env.SUPABASE_PLATFORM_URL,
    apiKey: env.SUPABASE_PLATFORM_ANON_KEY,
    accessToken
  });
}

export function managementFor(env: Env, accessToken: string): ManagementApi {
  return new ManagementApi(
    accessToken,
    env.SUPABASE_MANAGEMENT_API_URL ?? "https://api.supabase.com"
  );
}

export function protectedProjectRefs(env: Env): Set<string> {
  const refs = new Set<string>([...DEFAULT_PROTECTED_REFS, ...TEMPLATE.protectedProjects]);

  for (const value of (env.PROTECTED_PROJECT_REFS ?? "").split(",")) {
    const trimmed = value.trim();
    if (trimmed) refs.add(trimmed);
  }

  if (env.PLATFORM_PROJECT_REF) refs.add(env.PLATFORM_PROJECT_REF);

  try {
    const host = new URL(env.SUPABASE_PLATFORM_URL).hostname;
    const match = /^([a-z]{20})\.supabase\.(co|in)$/.exec(host);
    if (match?.[1]) refs.add(match[1]);
  } catch {
    // URL validation happens elsewhere; ignore here.
  }

  return refs;
}

export function assertSafeTarget(env: Env, projectRef: string): void {
  if (!/^[a-z]{20}$/.test(projectRef)) {
    throw new ValidationError("invalid Supabase project ref");
  }
  if (protectedProjectRefs(env).has(projectRef)) {
    throw new ValidationError("refusing to target a protected Zerocraft Platform project");
  }
}

function asString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asArray(meta: Record<string, unknown>, key: string): unknown[] {
  const value = meta[key];
  return Array.isArray(value) ? value : [];
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function projectNameFor(store: StoreRow, meta: Record<string, unknown>): string {
  const requested = asString(meta, "project_name");
  if (requested) return requested;
  const slug = `${store.slug}-commerce`.replace(/[^a-z0-9-]/g, "-").slice(0, 64);
  return slug.replace(/^-+|-+$/g, "") || "commerce";
}

function regionFor(env: Env, meta: Record<string, unknown>): string {
  const region = asString(meta, "region");
  if (!region) throw new ValidationError("region is required in job metadata");

  const allowed = (env.ALLOWED_REGIONS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (allowed.length > 0 && !allowed.includes(region)) {
    throw new ValidationError(`region ${region} is not in the allowed region list`);
  }

  return region;
}

async function markConnectionNeedsReauth(
  db: PlatformDb,
  connectionId: string,
  code: string
): Promise<void> {
  await db.update<ConnectionRow>(
    "supabase_connections",
    { id: eq(connectionId) },
    { connection_status: "needs_reauth", last_error_code: code.slice(0, 64) }
  );

  await db.update(
    "tenant_provisioning_jobs",
    { connection_id: eq(connectionId), status: inList(["QUEUED", "RUNNING"]) },
    { status: "NEEDS_REAUTHORIZATION", error_code: "OAUTH_REAUTHORIZATION_REQUIRED" }
  );
}

export async function persistTokens(
  env: Env,
  db: PlatformDb,
  connectionId: string,
  tokens: OAuthTokens,
  previous?: TokenRow | null
): Promise<void> {
  const keyId = env.OAUTH_ENCRYPTION_KEY_ID;
  const access = await encryptSecret(tokens.access_token, env.OAUTH_TOKEN_ENCRYPTION_KEY, keyId);

  let refreshCiphertext = previous?.refresh_token_ciphertext ?? null;
  let refreshNonce = previous?.refresh_token_nonce ?? null;

  if (tokens.refresh_token) {
    const refresh = await encryptSecret(
      tokens.refresh_token,
      env.OAUTH_TOKEN_ENCRYPTION_KEY,
      keyId
    );
    refreshCiphertext = refresh.ciphertext;
    refreshNonce = refresh.nonce;
  }

  await db.upsert<TokenRow>(
    "supabase_oauth_tokens",
    {
      connection_id: connectionId,
      encryption_version: 1,
      key_id: keyId,
      access_token_ciphertext: access.ciphertext,
      access_token_nonce: access.nonce,
      refresh_token_ciphertext: refreshCiphertext,
      refresh_token_nonce: refreshNonce,
      token_type: tokens.token_type ?? "bearer",
      scope: tokens.scope ?? null,
      rotated_at: new Date().toISOString()
    },
    "connection_id"
  );

  await db.update<ConnectionRow>(
    "supabase_connections",
    { id: eq(connectionId) },
    {
      connection_status: "active",
      access_token_expires_at: expiryFrom(new Date(), tokens),
      last_refreshed_at: new Date().toISOString(),
      last_error_code: null
    }
  );
}

async function ensureAccessToken(
  env: Env,
  db: PlatformDb,
  connection: ConnectionRow
): Promise<string> {
  if (connection.connection_status === "needs_reauth" || connection.connection_status === "revoked") {
    throw new ReauthorizationRequiredError();
  }

  const tokenRow = await db.selectOne<TokenRow>("supabase_oauth_tokens", {
    connection_id: eq(connection.id)
  });

  if (!tokenRow) throw new ReauthorizationRequiredError("no stored token for connection");

  const expiresAt = connection.access_token_expires_at
    ? Date.parse(connection.access_token_expires_at)
    : Number.NaN;

  const usable =
    Number.isFinite(expiresAt) && expiresAt > Date.now() + 120_000;

  if (usable) {
    return decryptSecret(
      {
        ciphertext: tokenRow.access_token_ciphertext,
        nonce: tokenRow.access_token_nonce,
        keyId: tokenRow.key_id
      },
      env.OAUTH_TOKEN_ENCRYPTION_KEY
    );
  }

  if (!tokenRow.refresh_token_ciphertext || !tokenRow.refresh_token_nonce) {
    throw new ReauthorizationRequiredError("access token expired and no refresh token is stored");
  }

  const refreshToken = await decryptSecret(
    {
      ciphertext: tokenRow.refresh_token_ciphertext,
      nonce: tokenRow.refresh_token_nonce,
      keyId: tokenRow.key_id
    },
    env.OAUTH_TOKEN_ENCRYPTION_KEY
  );

  try {
    const tokens = await refreshAccessToken(env, refreshToken);
    await persistTokens(env, db, connection.id, tokens, tokenRow);
    return tokens.access_token;
  } catch (error) {
    await markConnectionNeedsReauth(db, connection.id, "REFRESH_FAILED");
    throw new ReauthorizationRequiredError(
      error instanceof OAuthError ? error.message : "token refresh failed"
    );
  }
}

async function callStep(
  db: PlatformDb,
  jobId: string,
  step: string,
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED",
  message?: string
): Promise<void> {
  await db.rpc("set_tenant_provisioning_step", {
    p_job_id: jobId,
    p_step: step,
    p_status: status,
    p_message: message ?? null
  });
}

async function applyFile(
  env: Env,
  db: PlatformDb,
  api: ManagementApi,
  context: { jobId: string; databaseId: string; projectRef: string; templateVersion: string },
  entry: AppliedFile
): Promise<void> {
  const existing = await db.selectOne<TenantMigrationRow>("tenant_migrations", {
    tenant_database_id: eq(context.databaseId),
    template_name: eq(TEMPLATE.name),
    version: eq(entry.version),
    kind: eq(entry.kind)
  });

  if (existing) {
    if (existing.checksum !== entry.checksum) {
      throw new TemplateChecksumError(
        `checksum mismatch for ${entry.file}: stored ${existing.checksum}, bundle ${entry.checksum}`
      );
    }
    if (existing.status === "APPLIED") return;
  }

  try {
    await api.applyMigration(context.projectRef, {
      query: entry.sql,
      name: `${TEMPLATE.name}/${entry.kind}/${entry.file}`
    });

    await db.rpc("record_tenant_migration", {
      p_job_id: context.jobId,
      p_tenant_database_id: context.databaseId,
      p_template_name: TEMPLATE.name,
      p_template_version: context.templateVersion,
      p_version: entry.version,
      p_kind: entry.kind,
      p_checksum: entry.checksum,
      p_status: "APPLIED",
      p_error_message: null
    });
  } catch (error) {
    await db
      .rpc("record_tenant_migration", {
        p_job_id: context.jobId,
        p_tenant_database_id: context.databaseId,
        p_template_name: TEMPLATE.name,
        p_template_version: context.templateVersion,
        p_version: entry.version,
        p_kind: entry.kind,
        p_checksum: entry.checksum,
        p_status: "FAILED",
        p_error_message: sanitizeError(error)
      })
      .catch(() => undefined);
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealthy(env: Env, api: ManagementApi, ref: string): Promise<void> {
  const interval = Number(env.PROVISIONING_POLL_INTERVAL_MS ?? "5000");
  const maxPolls = Math.max(1, Number(env.PROVISIONING_MAX_POLLS ?? "12"));
  let last = "UNKNOWN";

  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    const project = await api.getProject(ref);
    last = project.status ?? "UNKNOWN";
    if (last === "ACTIVE_HEALTHY") return;
    if (["INACTIVE", "PAUSED", "REMOVING", "GOING_DOWN"].includes(last)) {
      throw new ValidationError(`project entered terminal state ${last}`);
    }
    if (attempt < maxPolls - 1) await sleep(interval);
  }

  throw new ProjectNotReadyError(`project status is ${last} after ${maxPolls} checks`);
}

async function findOrCreateProject(
  env: Env,
  db: PlatformDb,
  api: ManagementApi,
  job: JobRow,
  store: StoreRow,
  connection: ConnectionRow,
  meta: Record<string, unknown>
): Promise<{ database: TenantDatabaseRow; created: SupabaseProject | null }> {
  const existing = await db.selectOne<TenantDatabaseRow>("tenant_databases", {
    store_id: eq(store.id)
  });

  if (existing) {
    assertSafeTarget(env, existing.supabase_project_ref);
    return { database: existing, created: null };
  }

  const projectName = projectNameFor(store, meta);
  const region = regionFor(env, meta);

  if (!connection.supabase_organization_slug) {
    throw new ValidationError("connection has no Supabase organization slug");
  }

  if (!env.TENANT_SECRETS) {
    throw new ValidationError("TENANT_SECRETS secret store is not configured");
  }

  const dbPassword = randomPassword(40);
  let project: SupabaseProject;

  try {
    project = await api.createProject({
      name: projectName,
      organization_slug: connection.supabase_organization_slug,
      db_pass: dbPassword,
      region
    });
  } catch (error) {
    if (error instanceof ManagementApiError && [409, 422].includes(error.status)) {
      const projects = await api.listProjects();
      const match = projects.find(
        (item) =>
          item.name === projectName &&
          (!item.organization_id ||
            item.organization_id === connection.supabase_organization_id)
      );
      if (!match) throw error;
      project = match;
    } else {
      throw error;
    }
  }

  const projectRef = project.id;
  assertSafeTarget(env, projectRef);

  // The database password is required by the Management API but is never
  // stored in the Platform DB. It is written to the secret store and
  // referenced by `database_password_secret_ref`.
  await env.TENANT_SECRETS.put(`tenant/${projectRef}/db_password`, dbPassword);

  const database = await db.rpc<TenantDatabaseRow>("upsert_tenant_database", {
    p_organization_id: job.organization_id,
    p_store_id: job.store_id,
    p_connection_id: job.connection_id,
    p_supabase_project_ref: projectRef,
    p_supabase_organization_slug: connection.supabase_organization_slug,
    p_project_name: projectName,
    p_region: region,
    p_template_name: TEMPLATE.name,
    p_template_version: TEMPLATE.version,
    p_lifecycle_status: "PROVISIONING",
    p_project_url: `https://${projectRef}.supabase.co`,
    p_publishable_key: null,
    p_health_status: "unknown"
  });

  await db.update("tenant_databases", { id: eq(database.id) }, {
    database_password_secret_ref: `kv://tenant-secrets/tenant/${projectRef}/db_password`
  });

  await db.update("tenant_provisioning_jobs", { id: eq(job.id) }, {
    tenant_database_id: database.id
  });

  return { database, created: project };
}

async function executeJob(env: Env, db: PlatformDb, job: JobRow): Promise<void> {
  await callStep(db, job.id, "validate_target", "RUNNING");
  await callStep(db, job.id, "validate_target", "SUCCEEDED");

  const organization = await db.selectOne<OrganizationRow>("organizations", {
    id: eq(job.organization_id)
  });
  const store = await db.selectOne<StoreRow>("stores", { id: eq(job.store_id) });
  const connection = await db.selectOne<ConnectionRow>("supabase_connections", {
    id: eq(job.connection_id)
  });

  if (!organization || !store || !connection) {
    throw new ValidationError("job references a missing organization, store, or connection");
  }

  if (store.status !== "active" && store.status !== "draft") {
    throw new ValidationError(`store is ${store.status}`);
  }

  await callStep(db, job.id, "ensure_oauth", "RUNNING");
  const accessToken = await ensureAccessToken(env, db, connection);
  await callStep(db, job.id, "ensure_oauth", "SUCCEEDED");

  const api = managementFor(env, accessToken);

  await callStep(db, job.id, "create_project", "RUNNING");
  const { database } = await findOrCreateProject(
    env,
    db,
    api,
    job,
    store,
    connection,
    job.metadata ?? {}
  );
  await callStep(db, job.id, "create_project", "SUCCEEDED");

  await callStep(db, job.id, "wait_healthy", "RUNNING");
  await waitForHealthy(env, api, database.supabase_project_ref);
  await callStep(db, job.id, "wait_healthy", "SUCCEEDED");

  const migrateContext = {
    jobId: job.id,
    databaseId: database.id,
    projectRef: database.supabase_project_ref,
    templateVersion: TEMPLATE.version
  };

  await callStep(db, job.id, "install_migrations", "RUNNING");
  for (const migration of TEMPLATE.migrations) {
    await applyFile(env, db, api, migrateContext, migration);
  }
  await callStep(db, job.id, "install_migrations", "SUCCEEDED");

  await callStep(db, job.id, "install_seeds", "RUNNING");
  for (const seed of TEMPLATE.seeds) {
    await applyFile(env, db, api, migrateContext, seed);
  }
  await callStep(db, job.id, "install_seeds", "SUCCEEDED");

  await callStep(db, job.id, "initialize_tenant", "RUNNING");

  if (!job.requested_by) {
    throw new ValidationError("job has no requesting user to designate as tenant owner");
  }

  const profile = await db.selectOne<ProfileRow>("profiles", {
    id: eq(job.requested_by)
  });

  const meta = job.metadata ?? {};
  const payload = {
    organization_id: job.organization_id,
    organization_name: organization.name,
    central_store_id: store.id,
    store_name: store.name,
    store_slug: store.slug,
    currency: store.currency,
    timezone: store.timezone,
    owner_central_user_id: job.requested_by,
    owner_email: asString(meta, "owner_email"),
    owner_display_name: profile?.full_name ?? `${store.name} Owner`,
    taxonomy_version: asString(meta, "taxonomy_version"),
    taxonomy_roots: asArray(meta, "taxonomy_roots"),
    template_version: TEMPLATE.version,
    platform_issuer: asString(meta, "platform_issuer"),
    platform_audience: asString(meta, "platform_audience"),
    platform_jwks_url: asString(meta, "platform_jwks_url")
  };

  const initSql = `select public.initialize_tenant_from_json(${sqlLiteral(
    JSON.stringify(payload)
  )}::jsonb);`;

  await applyFile(env, db, api, migrateContext, {
    version: "tenant_context",
    kind: "init",
    file: "initialize_tenant",
    checksum: await sha256Hex(initSql),
    sql: initSql
  });
  await callStep(db, job.id, "initialize_tenant", "SUCCEEDED");

  await callStep(db, job.id, "verify_template", "RUNNING");
  for (const verification of TEMPLATE.verification) {
    await applyFile(env, db, api, migrateContext, verification);
  }
  await callStep(db, job.id, "verify_template", "SUCCEEDED");

  await callStep(db, job.id, "activate_tenant", "RUNNING");

  const keys = await api.getApiKeys(database.supabase_project_ref);
  const publishableKey = anonKeyFrom(keys);

  await db.rpc("upsert_tenant_database", {
    p_organization_id: job.organization_id,
    p_store_id: job.store_id,
    p_connection_id: job.connection_id,
    p_supabase_project_ref: database.supabase_project_ref,
    p_supabase_organization_slug: database.supabase_organization_slug,
    p_project_name: database.project_name,
    p_region: database.region,
    p_template_name: TEMPLATE.name,
    p_template_version: TEMPLATE.version,
    p_lifecycle_status: "ACTIVE",
    p_project_url: `https://${database.supabase_project_ref}.supabase.co`,
    p_publishable_key: publishableKey,
    p_health_status: "healthy"
  });

  await callStep(db, job.id, "activate_tenant", "SUCCEEDED");

  await db.rpc("finish_tenant_provisioning_job", {
    p_job_id: job.id,
    p_status: "SUCCEEDED",
    p_error_code: null,
    p_error_message: null,
    p_progress: 100
  });
}

function isReauthorizationError(error: unknown): boolean {
  return (
    error instanceof ReauthorizationRequiredError ||
    (error instanceof ManagementApiError && [401, 403].includes(error.status))
  );
}

async function handleFailure(
  env: Env,
  db: PlatformDb,
  job: JobRow,
  error: unknown
): Promise<void> {
  const message = sanitizeError(error);

  if (isReauthorizationError(error)) {
    await markConnectionNeedsReauth(db, job.connection_id, "OAUTH_REAUTHORIZATION_REQUIRED");
    await db.rpc("finish_tenant_provisioning_job", {
      p_job_id: job.id,
      p_status: "NEEDS_REAUTHORIZATION",
      p_error_code: "OAUTH_REAUTHORIZATION_REQUIRED",
      p_error_message: message,
      p_progress: null
    });
    return;
  }

  if (error instanceof ProjectNotReadyError && job.attempt_count < job.max_attempts) {
    await db.update("tenant_provisioning_jobs", { id: eq(job.id) }, {
      status: "QUEUED",
      current_step: "wait_healthy",
      worker_id: null,
      heartbeat_at: null,
      error_code: null,
      error_message: null
    });
    return;
  }

  const code =
    error instanceof TemplateChecksumError
      ? "TEMPLATE_CHECKSUM_MISMATCH"
      : error instanceof ValidationError
        ? "VALIDATION_FAILED"
        : error instanceof ProjectNotReadyError
          ? "PROJECT_NOT_READY"
          : error instanceof ManagementApiError
            ? `MANAGEMENT_API_${error.status}`
            : "PROVISIONING_FAILED";

  await db.rpc("finish_tenant_provisioning_job", {
    p_job_id: job.id,
    p_status: "FAILED",
    p_error_code: code,
    p_error_message: message,
    p_progress: null
  });
}

export interface RunResult {
  jobId: string;
  status: "SUCCEEDED" | "FAILED" | "NEEDS_REAUTHORIZATION" | "REQUEUED" | "SKIPPED";
}

export async function runProvisioningJob(
  env: Env,
  jobId: string,
  workerId = `worker-${crypto.randomUUID()}`
): Promise<RunResult> {
  const db = serviceDb(env);

  const claimed = await db.rpc<JobRow[]>("claim_tenant_provisioning_job_by_id", {
    p_job_id: jobId,
    p_worker_id: workerId
  });

  const job = claimed[0];
  if (!job) return { jobId, status: "SKIPPED" };

  try {
    await executeJob(env, db, job);
    return { jobId, status: "SUCCEEDED" };
  } catch (error) {
    await handleFailure(env, db, job, error);
    if (isReauthorizationError(error)) {
      return { jobId, status: "NEEDS_REAUTHORIZATION" };
    }
    if (error instanceof ProjectNotReadyError && job.attempt_count < job.max_attempts) {
      return { jobId, status: "REQUEUED" };
    }
    return { jobId, status: "FAILED" };
  }
}

export async function claimAndRunOne(env: Env, workerId: string): Promise<RunResult | null> {
  const db = serviceDb(env);
  const claimed = await db.rpc<JobRow[]>("claim_tenant_provisioning_job", {
    p_worker_id: workerId
  });
  const job = claimed[0];
  if (!job) return null;

  try {
    await executeJob(env, db, job);
    return { jobId: job.id, status: "SUCCEEDED" };
  } catch (error) {
    await handleFailure(env, db, job, error);
    if (isReauthorizationError(error)) {
      return { jobId: job.id, status: "NEEDS_REAUTHORIZATION" };
    }
    if (error instanceof ProjectNotReadyError && job.attempt_count < job.max_attempts) {
      return { jobId: job.id, status: "REQUEUED" };
    }
    return { jobId: job.id, status: "FAILED" };
  }
}

/**
 * Refresh connections whose access token expires within 10 minutes.
 * Called from the scheduled handler.
 */
export async function refreshExpiringConnections(env: Env): Promise<number> {
  const db = serviceDb(env);
  const threshold = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const connections = await db.select<ConnectionRow>("supabase_connections", {
    connection_status: eq("active"),
    access_token_expires_at: `lt.${threshold}`,
    limit: "20"
  });

  let refreshed = 0;

  for (const connection of connections) {
    try {
      const tokens = await ensureAccessToken(env, db, connection);
      if (tokens) refreshed += 1;
    } catch {
      // ensureAccessToken already marks the connection when refresh fails.
    }
  }

  return refreshed;
}

/**
 * Register (or update) the embedded template version in the Platform DB.
 * Called on deploy and by POST /admin/template/register.
 */
export async function registerTemplateVersion(env: Env): Promise<{
  version: string;
  checksum: string;
}> {
  const db = serviceDb(env);
  const files = [...TEMPLATE.migrations, ...TEMPLATE.seeds, ...TEMPLATE.verification];
  const manifest = {
    name: TEMPLATE.name,
    version: TEMPLATE.version,
    files: files.map((file) => ({ file: file.file, checksum: file.checksum }))
  };
  const checksum = await sha256Hex(JSON.stringify(manifest));

  await db.upsert(
    "template_versions",
    {
      template_name: TEMPLATE.name,
      version: TEMPLATE.version,
      manifest_checksum: checksum,
      manifest,
      status: "published",
      published_at: new Date().toISOString()
    },
    "template_name,version"
  );

  return { version: TEMPLATE.version, checksum };
}

export async function exchangeAndStorePending(
  env: Env,
  db: PlatformDb,
  input: {
    stateHash: string;
    organizationId: string;
    userId: string;
    code: string;
    codeVerifier: string;
    scopes: string[];
  }
): Promise<{ organizations: Array<{ id: string; name: string; slug: string }> }> {
  const tokens = await exchangeAuthorizationCode(env, input.code, input.codeVerifier);
  const api = managementFor(env, tokens.access_token);
  const organizations = (await api.getOrganizations()).map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug ?? org.id
  }));

  const access = await encryptSecret(
    tokens.access_token,
    env.OAUTH_TOKEN_ENCRYPTION_KEY,
    env.OAUTH_ENCRYPTION_KEY_ID
  );
  const refresh = tokens.refresh_token
    ? await encryptSecret(
        tokens.refresh_token,
        env.OAUTH_TOKEN_ENCRYPTION_KEY,
        env.OAUTH_ENCRYPTION_KEY_ID
      )
    : null;

  await db.upsert(
    "supabase_oauth_pending",
    {
      state_hash: input.stateHash,
      organization_id: input.organizationId,
      created_by: input.userId,
      key_id: env.OAUTH_ENCRYPTION_KEY_ID,
      access_token_ciphertext: access.ciphertext,
      access_token_nonce: access.nonce,
      refresh_token_ciphertext: refresh?.ciphertext ?? null,
      refresh_token_nonce: refresh?.nonce ?? null,
      token_expires_at: expiryFrom(new Date(), tokens),
      scopes: input.scopes,
      supabase_organizations: organizations,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    },
    "state_hash"
  );

  return { organizations };
}

export async function finalizePendingConnection(
  env: Env,
  db: PlatformDb,
  input: {
    stateHash: string;
    organizationId: string;
    supabaseOrganizationId: string;
    accountName?: string;
  }
): Promise<{ connectionId: string; organization: { id: string; name: string; slug: string } }> {
  const pending = await db.selectOne<{
    state_hash: string;
    organization_id: string;
    created_by: string;
    key_id: string;
    access_token_ciphertext: string;
    access_token_nonce: string;
    refresh_token_ciphertext: string | null;
    refresh_token_nonce: string | null;
    token_expires_at: string | null;
    scopes: string[];
    supabase_organizations: Array<{ id: string; name: string; slug: string }>;
    expires_at: string;
  }>("supabase_oauth_pending", { state_hash: eq(input.stateHash) });

  if (!pending) throw new ValidationError("OAuth session not found or already completed");
  if (pending.organization_id !== input.organizationId) {
    throw new ValidationError("OAuth session does not belong to this organization");
  }
  if (Date.parse(pending.expires_at) < Date.now()) {
    throw new ReauthorizationRequiredError("OAuth session expired");
  }

  const organization = pending.supabase_organizations.find(
    (item) => item.id === input.supabaseOrganizationId
  );
  if (!organization) throw new ValidationError("selected Supabase organization was not granted");

  const connectionRows = await db.upsert<ConnectionRow>(
    "supabase_connections",
    {
      organization_id: input.organizationId,
      supabase_organization_id: organization.id,
      supabase_organization_slug: organization.slug,
      account_name: input.accountName ?? organization.name,
      connection_status: "active",
      scopes: pending.scopes,
      access_token_expires_at: pending.token_expires_at,
      last_verified_at: new Date().toISOString(),
      created_by: pending.created_by
    },
    "organization_id,supabase_organization_id"
  );

  const connection = connectionRows[0];
  if (!connection) throw new Error("failed to persist connection");

  await db.upsert<TokenRow>(
    "supabase_oauth_tokens",
    {
      connection_id: connection.id,
      encryption_version: 1,
      key_id: pending.key_id,
      access_token_ciphertext: pending.access_token_ciphertext,
      access_token_nonce: pending.access_token_nonce,
      refresh_token_ciphertext: pending.refresh_token_ciphertext,
      refresh_token_nonce: pending.refresh_token_nonce
    },
    "connection_id"
  );

  await db.delete("supabase_oauth_pending", { state_hash: eq(input.stateHash) });

  await db.rpc("log_platform_event", {
    p_organization_id: input.organizationId,
    p_action: "oauth.connection.connected",
    p_entity_type: "supabase_connection",
    p_entity_id: connection.id,
    p_metadata: {
      supabase_organization_id: organization.id,
      supabase_organization_slug: organization.slug
    }
  });

  return { connectionId: connection.id, organization };
}
