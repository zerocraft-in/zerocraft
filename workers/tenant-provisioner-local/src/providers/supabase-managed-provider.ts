/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Supabase Managed Provider.
 *
 * Creates an independent Supabase project for each store using the
 * platform-owned Supabase organization, installs the canonical commerce
 * template, verifies the resulting database state and only then activates the
 * tenant database registry row.
 *
 * No method in this file performs a network request directly. All Management
 * API traffic goes through the injected ManagementApiPort / transport.
 */

import { createHash } from "crypto";
import {
  ManagementApiRequiredError,
  PublishableKeyMissingError,
  ProjectNotReadyError,
  ProjectStateError,
  ProviderConfigurationError,
  ReauthorizationRequiredError,
  TemplateChecksumError,
  TemplateInstallError,
  TemplateLedgerError,
  TenantDatabaseConflictError,
  TenantInitializationError,
  TenantProjectMissingError,
  ValidationError,
  VerificationError,
} from "../errors";
import {
  ManagementApiClient,
  type ManagementTransport,
} from "../management/client";
import {
  ManagementApiError,
  isManagementApiError,
  isRetryableManagementError,
} from "../management/errors";
import type {
  ManagementApiPort,
  SupabaseApiKey,
  SupabaseProject,
} from "../management/types";
import { redactError, redactFields, redactSecrets } from "../redaction";
import {
  generateDatabasePassword,
  makeDatabasePasswordSecretRef,
  type TenantSecretStore,
} from "../secrets";
import {
  TenantDatabaseRepository,
  type TenantDatabaseRow,
} from "../tenant-repository";
import type { TemplateFile } from "../template-loader";
import type {
  ConnectionRow,
  OrganizationRow,
  ProviderContext,
  StoreRow,
  TenantOwner,
} from "../types";

export interface ManagementTokenProvider {
  getAccessToken(): Promise<string>;
}

export class StaticManagementTokenProvider implements ManagementTokenProvider {
  private readonly token: string;

  constructor(token: string) {
    if (!token || token.trim().length === 0) {
      throw new ProviderConfigurationError(
        "Management API access token is required for managed mode"
      );
    }
    this.token = token.trim();
  }

  async getAccessToken(): Promise<string> {
    return this.token;
  }

  toJSON(): string {
    return "[redacted]";
  }

  toString(): string {
    return "[redacted]";
  }
}

export interface ProviderLogger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export const silentProviderLogger: ProviderLogger = {
  info(): void {},
  warn(): void {},
  error(): void {},
};

export function createConsoleProviderLogger(): ProviderLogger {
  const write = (
    level: "info" | "warn" | "error",
    message: string,
    fields?: Record<string, unknown>
  ): void => {
    const safeMessage = redactSecrets(message);
    const safeFields = redactFields(fields);
    const suffix = safeFields ? ` ${JSON.stringify(safeFields)}` : "";
    console[level](`[tenant-provisioner] ${safeMessage}${suffix}`);
  };

  return {
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
  };
}

export interface SupabaseManagedProviderConfig {
  /** Platform-owned Supabase organization id. Required. */
  organizationId: string;
  /** Optional slug persisted for diagnostics. */
  organizationSlug?: string | null;
  /** Explicit region for every tenant project. Required. */
  region: string;
  /** Explicit compute size for every tenant project. Required. */
  computeSize: string;
  templateName: string;
  templateVersion: string;

  tokenProvider: ManagementTokenProvider;
  secretStore: TenantSecretStore;

  /** Injectable transport for the real client. Tests use a fake transport. */
  transport?: ManagementTransport;
  /** Injectable client factory. Tests may use a fake ManagementApiPort. */
  clientFactory?: (accessToken: string) => ManagementApiPort;

  baseUrl?: string;
  requestTimeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  readinessTimeoutMs?: number;
  readinessPollIntervalMs?: number;

  protectedProjectRefs?: string[];
  allowedRegions?: string[];
  logger?: ProviderLogger;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
}

interface LedgerEntry {
  checksum: string;
  kind: string;
}

interface TenantContextRow {
  central_store_id: string;
  template_version: string | null;
}

interface OwnerRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

const PROJECT_REF_PATTERN = /^[a-z]{20}$/;
const DEFAULT_READINESS_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_READINESS_POLL_INTERVAL_MS = 5_000;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function assertConfig(config: SupabaseManagedProviderConfig): void {
  const missing: string[] = [];

  if (!isNonEmptyString(config.organizationId)) missing.push("organizationId");
  if (!isNonEmptyString(config.region)) missing.push("region");
  if (!isNonEmptyString(config.computeSize)) missing.push("computeSize");
  if (!isNonEmptyString(config.templateName)) missing.push("templateName");
  if (!isNonEmptyString(config.templateVersion)) missing.push("templateVersion");
  if (!config.tokenProvider || typeof config.tokenProvider.getAccessToken !== "function") {
    missing.push("tokenProvider");
  }
  if (
    !config.secretStore ||
    typeof config.secretStore.put !== "function" ||
    typeof config.secretStore.get !== "function" ||
    typeof config.secretStore.delete !== "function"
  ) {
    missing.push("secretStore");
  }

  if (missing.length > 0) {
    throw new ProviderConfigurationError(
      `Managed provider configuration is incomplete: ${missing.join(", ")}`
    );
  }

  if (config.allowedRegions && config.allowedRegions.length > 0) {
    if (!config.allowedRegions.includes(config.region)) {
      throw new ProviderConfigurationError(
        `Region ${config.region} is not in the allowed region list`
      );
    }
  }
}

function defaultSleep(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rowsFrom(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (isRecord(value) && Array.isArray(value.rows)) {
    return value.rows.filter(isRecord);
  }
  if (isRecord(value) && Array.isArray(value.result)) {
    return value.result.filter(isRecord);
  }
  return [];
}

function firstRow(value: unknown): Record<string, unknown> | null {
  return rowsFrom(value)[0] ?? null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === "string")) return null;
  return value as string[];
}

export class SupabaseManagedProvider {
  readonly name = "supabase-managed";
  readonly isMock = false;

  private readonly config: SupabaseManagedProviderConfig;
  private readonly logger: ProviderLogger;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly now: () => number;
  private readonly protectedRefs: Set<string>;
  private readonly verifiedProjects = new Set<string>();

  private client: ManagementApiPort | null = null;
  private resolvedOrganizationSlug: string | null = null;

  constructor(config: SupabaseManagedProviderConfig) {
    assertConfig(config);

    this.config = config;
    this.logger = config.logger ?? silentProviderLogger;
    this.sleep = config.sleep ?? defaultSleep;
    this.now = config.now ?? Date.now;
    this.protectedRefs = new Set(config.protectedProjectRefs ?? []);
  }

  private requireClient(): ManagementApiPort {
    if (!this.client) throw new ManagementApiRequiredError();
    return this.client;
  }

  private log(
    level: "info" | "warn" | "error",
    message: string,
    fields?: Record<string, unknown>
  ): void {
    this.logger[level](message, redactFields(fields));
  }

  private assertSafeProjectRef(projectRef: string): void {
    if (!PROJECT_REF_PATTERN.test(projectRef)) {
      throw new ValidationError(
        `Supabase returned an invalid project reference: ${projectRef}`
      );
    }
    if (this.protectedRefs.has(projectRef)) {
      throw new ValidationError(
        "Refusing to target a protected Supabase project reference"
      );
    }
  }

  private projectNameFor(
    store: StoreRow,
    meta: Record<string, unknown>
  ): string {
    const requested =
      typeof meta.project_name === "string" && meta.project_name.trim()
        ? meta.project_name
        : `${store.slug}-commerce`;

    const sanitized = requested
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);

    if (!sanitized) {
      throw new ValidationError("Unable to derive a valid tenant project name");
    }

    return sanitized;
  }

  private async resolveOwner(
    ctx: ProviderContext,
    meta: Record<string, unknown>
  ): Promise<TenantOwner> {
    const metaUserId = meta.owner_central_user_id;
    if (isNonEmptyString(metaUserId)) {
      return {
        centralUserId: metaUserId,
        email:
          typeof meta.owner_email === "string" ? meta.owner_email : null,
        displayName:
          typeof meta.owner_display_name === "string"
            ? meta.owner_display_name
            : "Store Owner",
      };
    }

    const owner = await ctx.env.db.queryOne<OwnerRow>(
      `
        SELECT om.user_id, pu.email, pu.full_name
        FROM public.organization_members om
        JOIN public.organization_roles r ON r.id = om.role_id
        JOIN public.platform_users pu ON pu.id = om.user_id
        WHERE om.organization_id = $1
          AND om.status = 'active'
          AND r.key = 'owner'
        ORDER BY om.joined_at ASC NULLS LAST
        LIMIT 1
      `,
      [ctx.organizationId]
    );

    if (!owner) {
      throw new ValidationError(
        "No active organization owner was found for tenant initialization"
      );
    }

    return {
      centralUserId: owner.user_id,
      email: owner.email,
      displayName: owner.full_name ?? "Store Owner",
    };
  }

  private async readLedger(projectRef: string): Promise<Map<string, LedgerEntry>> {
    const client = this.requireClient();
    const ledger = new Map<string, LedgerEntry>();

    let result: unknown;
    try {
      result = await client.runQuery(
        projectRef,
        "select version, checksum, kind from public.commerce_template_migrations"
      );
    } catch (error) {
      if (
        isManagementApiError(error) &&
        (error.code === "42P01" ||
          /does not exist/i.test(error.message) ||
          /relation .*commerce_template_migrations/i.test(error.message))
      ) {
        return ledger;
      }
      throw new TemplateLedgerError(
        `Unable to read the tenant template ledger: ${redactError(error)}`
      );
    }

    for (const row of rowsFrom(result)) {
      const version = row.version;
      const checksum = row.checksum;
      const kind = row.kind;
      if (
        typeof version !== "string" ||
        typeof checksum !== "string" ||
        typeof kind !== "string"
      ) {
        throw new TemplateLedgerError(
          "Tenant template ledger returned an invalid row"
        );
      }
      ledger.set(version, { checksum, kind });
    }

    return ledger;
  }

  private async recordLedger(
    projectRef: string,
    version: string,
    checksum: string,
    kind: string
  ): Promise<void> {
    const client = this.requireClient();
    const sql = `
      INSERT INTO public.commerce_template_migrations (version, checksum, kind)
      VALUES (${sqlLiteral(version)}, ${sqlLiteral(checksum)}, ${sqlLiteral(kind)})
      ON CONFLICT (version) DO UPDATE
      SET checksum = excluded.checksum,
          kind = excluded.kind,
          applied_at = now()
    `;

    try {
      await client.runQuery(projectRef, sql);
    } catch (error) {
      throw new TemplateLedgerError(
        `Unable to record ${kind} ${version} in the tenant template ledger: ${redactError(error)}`
      );
    }
  }

  private async applyFile(
    projectRef: string,
    file: TemplateFile,
    ledger: Map<string, LedgerEntry>,
    record: boolean
  ): Promise<void> {
    const client = this.requireClient();
    const checksum = sha256Hex(file.sql);

    if (file.checksum !== checksum) {
      throw new TemplateChecksumError(
        `Checksum mismatch for ${file.file}: manifest ${file.checksum}, bundle ${checksum}`
      );
    }

    const ledgerKey =
      file.kind === "migration" ? file.version : `${file.kind}:${file.file}`;
    const existing = ledger.get(ledgerKey);

    if (existing) {
      if (existing.checksum !== checksum) {
        throw new TemplateChecksumError(
          `Checksum mismatch for already-applied ${file.file}`
        );
      }
      this.log("info", "Skipping already-applied template file", {
        file: file.file,
        kind: file.kind,
      });
      return;
    }

    this.log("info", "Applying template file", {
      file: file.file,
      kind: file.kind,
    });

    await client.applyMigration(projectRef, {
      name: `${this.config.templateName}/${file.kind}/${file.file}`,
      query: file.sql,
    });

    if (record) {
      await this.recordLedger(projectRef, ledgerKey, checksum, file.kind);
      ledger.set(ledgerKey, { checksum, kind: file.kind });
    }
  }

  async validateTarget(
    ctx: ProviderContext,
    organization: OrganizationRow,
    store: StoreRow,
    connection: ConnectionRow | null
  ): Promise<void> {
    if (!organization || !store) {
      throw new ValidationError("Missing organization or store");
    }
    if (organization.id !== ctx.organizationId) {
      throw new ValidationError("Job organization does not match the loaded organization");
    }
    if (store.id !== ctx.storeId) {
      throw new ValidationError("Job store does not match the loaded store");
    }
    if (store.organization_id !== organization.id) {
      throw new ValidationError("Store does not belong to the job organization");
    }
    if (store.status !== "draft" && store.status !== "active") {
      throw new ValidationError(
        `Store is ${store.status}, expected 'draft' or 'active'`
      );
    }

    if (!connection) {
      throw new ValidationError("Managed provisioning requires a Supabase connection");
    }
    if (connection.organization_id !== organization.id) {
      throw new ValidationError(
        "Supabase connection does not belong to the job organization"
      );
    }
    if (connection.connection_status === "revoked") {
      throw new ReauthorizationRequiredError("Supabase connection is revoked");
    }

    this.projectNameFor(store, ctx.metadata);

    const repository = new TenantDatabaseRepository(ctx.env.db);
    const existing = await repository.findByStore(store.id);
    if (existing) {
      this.assertSafeProjectRef(existing.supabase_project_ref);
      if (existing.organization_id !== ctx.organizationId) {
        throw new TenantDatabaseConflictError(
          "Tenant database registry row belongs to a different organization"
        );
      }
    }

    this.log("info", "Validated provisioning target", {
      organizationId: organization.id,
      storeId: store.id,
      region: this.config.region,
      computeSize: this.config.computeSize,
    });
  }

  async ensureOAuth(
    _ctx: ProviderContext,
    connection: ConnectionRow | null
  ): Promise<void> {
    if (!connection) {
      throw new ReauthorizationRequiredError(
        "Managed provisioning requires a Supabase connection"
      );
    }
    if (connection.connection_status !== "active") {
      throw new ReauthorizationRequiredError(
        "Supabase connection is not active; reauthorization is required"
      );
    }

    let accessToken: string;
    try {
      accessToken = (await this.config.tokenProvider.getAccessToken()).trim();
    } catch (error) {
      throw new ReauthorizationRequiredError(
        `Unable to obtain a Management API token: ${redactError(error)}`
      );
    }

    if (!accessToken) {
      throw new ReauthorizationRequiredError(
        "Management API token provider returned an empty token"
      );
    }

    this.client = this.config.clientFactory
      ? this.config.clientFactory(accessToken)
      : new ManagementApiClient({
          accessToken,
          baseUrl: this.config.baseUrl,
          transport: this.config.transport,
          timeoutMs: this.config.requestTimeoutMs,
          maxRetries: this.config.maxRetries,
          retryBaseDelayMs: this.config.retryBaseDelayMs,
          retryMaxDelayMs: this.config.retryMaxDelayMs,
          sleep: this.sleep,
        });

    let organizations;
    try {
      organizations = await this.client.getOrganizations();
    } catch (error) {
      if (
        isManagementApiError(error) &&
        (error.status === 401 || error.status === 403)
      ) {
        throw new ReauthorizationRequiredError(
          "Management API rejected the tenant provisioning token"
        );
      }
      throw new ReauthorizationRequiredError(
        `Unable to verify Management API access: ${redactError(error)}`
      );
    }

    const organization = organizations.find(
      (item) => item.id === this.config.organizationId
    );
    if (!organization) {
      throw new ReauthorizationRequiredError(
        "The provisioning token cannot access the configured Supabase organization"
      );
    }

    if (!organization.slug || organization.slug.trim().length === 0) {
      throw new ReauthorizationRequiredError(
        `Configured organization ${this.config.organizationId} has no slug; cannot create tenant projects`
      );
    }

    this.resolvedOrganizationSlug = organization.slug;

    this.log("info", "Management API client ready", {
      organizationId: this.config.organizationId,
      organizationSlug: this.resolvedOrganizationSlug,
    });
  }

  private async reconcileExistingProject(projectRef: string): Promise<SupabaseProject> {
    const client = this.requireClient();

    try {
      const project = await client.getProject(projectRef);
      if (project.ref !== projectRef) {
        throw new TenantProjectMissingError(
          "Management API returned a different project reference"
        );
      }
      if (
        project.organizationId !== null &&
        project.organizationId !== this.config.organizationId
      ) {
        throw new ValidationError(
          "Registered tenant project belongs to a different Supabase organization"
        );
      }
      return project;
    } catch (error) {
      if (isManagementApiError(error)) {
        if (error.status === 404) {
          throw new TenantProjectMissingError(
            "The registered tenant project no longer exists; refusing to create a duplicate"
          );
        }
        if (error.status === 401 || error.status === 403) {
          throw new ReauthorizationRequiredError(
            "Management API rejected the stored credentials"
          );
        }
      }
      throw error;
    }
  }

  private findProjectByName(
    projects: SupabaseProject[],
    projectName: string
  ): SupabaseProject | null {
    const sameName = projects.filter((project) => project.name === projectName);
    if (sameName.length === 0) return null;

    const inOrganization = sameName.filter(
      (project) =>
        project.organizationId === null ||
        project.organizationId === this.config.organizationId
    );

    if (inOrganization.length > 1) {
      throw new ValidationError(
        "Multiple Supabase projects match the tenant project name; refusing to choose one"
      );
    }

    if (inOrganization.length === 1) {
      return inOrganization[0]!;
    }

    throw new ValidationError(
      "A Supabase project with this name already exists in a different organization"
    );
  }

  private async persistFoundProject(
    ctx: ProviderContext,
    store: StoreRow,
    project: SupabaseProject,
    projectName: string
  ): Promise<TenantDatabaseRow> {
    this.assertSafeProjectRef(project.ref);
    if (
      project.organizationId !== null &&
      project.organizationId !== this.config.organizationId
    ) {
      throw new ValidationError(
        "Reconciled project belongs to a different Supabase organization"
      );
    }

    const secretRef = makeDatabasePasswordSecretRef(store.id);
    let databasePasswordSecretRef: string | null = null;
    try {
      if (await this.config.secretStore.get(secretRef)) {
        databasePasswordSecretRef = secretRef;
      }
    } catch (error) {
      throw new TenantDatabaseConflictError(
        `Unable to inspect the tenant secret store: ${redactError(error)}`
      );
    }

    const repository = new TenantDatabaseRepository(ctx.env.db);
    return repository.createProvisioning({
      organizationId: ctx.organizationId,
      storeId: store.id,
      projectRef: project.ref,
      organizationSlug: this.config.organizationSlug ?? null,
      projectName,
      region: this.config.region,
      templateName: this.config.templateName,
      templateVersion: this.config.templateVersion,
      databasePasswordSecretRef,
      jobContext: ctx,
    });
  }

  async createProject(
    ctx: ProviderContext,
    store: StoreRow,
    _connection: ConnectionRow | null,
    meta: Record<string, unknown>
  ): Promise<{
    projectRef: string;
    projectName: string;
    region: string;
    projectUrl: string;
    organizationSlug: string | null;
    created: boolean;
  }> {
    const client = this.requireClient();
    const repository = new TenantDatabaseRepository(ctx.env.db);
    const projectName = this.projectNameFor(store, meta);

    const existing = await repository.findByStore(store.id);
    if (existing) {
      this.assertSafeProjectRef(existing.supabase_project_ref);
      await this.reconcileExistingProject(existing.supabase_project_ref);

      let secretRef = existing.database_password_secret_ref;
      if (!secretRef) {
        const candidate = makeDatabasePasswordSecretRef(store.id);
        if (await this.config.secretStore.get(candidate)) secretRef = candidate;
      }

      const updated = await repository.updateProvisioning({
        storeId: store.id,
        projectRef: existing.supabase_project_ref,
        organizationId: ctx.organizationId,
        organizationSlug: this.config.organizationSlug ?? existing.supabase_organization_slug,
        projectName: existing.project_name,
        region: this.config.region,
        templateName: this.config.templateName,
        templateVersion: this.config.templateVersion,
        databasePasswordSecretRef: secretRef,
        jobContext: ctx,
      });

      this.log("info", "Reconciled existing tenant project", {
        projectRef: updated.supabase_project_ref,
      });

      return {
        projectRef: updated.supabase_project_ref,
        projectName: updated.project_name,
        region: updated.region,
        projectUrl: `https://${updated.supabase_project_ref}.supabase.co`,
        organizationSlug: updated.supabase_organization_slug,
        created: false,
      };
    }

    const projects = await client.listProjects();
    const found = this.findProjectByName(projects, projectName);
    if (found) {
      const database = await this.persistFoundProject(ctx, store, found, projectName);
      this.log("info", "Reconciled unregistered tenant project", {
        projectRef: database.supabase_project_ref,
      });
      return {
        projectRef: database.supabase_project_ref,
        projectName: database.project_name,
        region: database.region,
        projectUrl: `https://${database.supabase_project_ref}.supabase.co`,
        organizationSlug: database.supabase_organization_slug,
        created: false,
      };
    }

    const secretRef = makeDatabasePasswordSecretRef(store.id);
    const dbPassword = generateDatabasePassword();

    // Store the secret before creating the project so a retry never needs to
    // recover a plaintext password from anywhere.
    await this.config.secretStore.put(secretRef, dbPassword);

    let project: SupabaseProject;
    try {
      project = await client.createProject({
        name: projectName,
        organizationId: this.config.organizationId,
        organizationSlug: this.resolvedOrganizationSlug!,
        region: this.config.region,
        computeSize: this.config.computeSize,
        dbPassword,
      });
    } catch (error) {
      if (
        isManagementApiError(error) &&
        (error.status === 409 || error.status === 422)
      ) {
        const reconciled = this.findProjectByName(
          await client.listProjects(),
          projectName
        );
        if (!reconciled) {
          await this.config.secretStore.delete(secretRef).catch(() => undefined);
          throw error;
        }
        const database = await this.persistFoundProject(
          ctx,
          store,
          reconciled,
          projectName
        );
        return {
          projectRef: database.supabase_project_ref,
          projectName: database.project_name,
          region: database.region,
          projectUrl: `https://${database.supabase_project_ref}.supabase.co`,
          organizationSlug: database.supabase_organization_slug,
          created: false,
        };
      }

      await this.config.secretStore.delete(secretRef).catch(() => undefined);
      throw error;
    }

    this.assertSafeProjectRef(project.ref);
    if (
      project.organizationId !== null &&
      project.organizationId !== this.config.organizationId
    ) {
      throw new ValidationError(
        "Supabase created the project in a different organization"
      );
    }

    const database = await repository.createProvisioning({
      organizationId: ctx.organizationId,
      storeId: store.id,
      projectRef: project.ref,
      organizationSlug: this.config.organizationSlug ?? null,
      projectName,
      region: this.config.region,
      templateName: this.config.templateName,
      templateVersion: this.config.templateVersion,
      databasePasswordSecretRef: secretRef,
      jobContext: ctx,
    });

    this.log("info", "Created tenant project", {
      projectRef: database.supabase_project_ref,
      region: database.region,
    });

    return {
      projectRef: database.supabase_project_ref,
      projectName: database.project_name,
      region: database.region,
      projectUrl: `https://${database.supabase_project_ref}.supabase.co`,
      organizationSlug: database.supabase_organization_slug,
      created: true,
    };
  }

  async waitForHealthy(
    _ctx: ProviderContext,
    projectRef: string
  ): Promise<void> {
    const client = this.requireClient();
    const timeoutMs =
      this.config.readinessTimeoutMs ?? DEFAULT_READINESS_TIMEOUT_MS;
    const intervalMs =
      this.config.readinessPollIntervalMs ?? DEFAULT_READINESS_POLL_INTERVAL_MS;
    const deadline = this.now() + timeoutMs;
    let lastStatus = "UNKNOWN";

    while (true) {
      const project = await client.getProject(projectRef);
      lastStatus = project.status ?? "UNKNOWN";

      if (lastStatus === "ACTIVE_HEALTHY") {
        this.log("info", "Tenant project is healthy", { projectRef });
        return;
      }

      if (
        ["INACTIVE", "PAUSED", "REMOVING", "GOING_DOWN", "FAILED"].includes(
          lastStatus
        )
      ) {
        throw new ProjectStateError(
          `Tenant project entered terminal state ${lastStatus}`
        );
      }

      const remaining = deadline - this.now();
      if (remaining <= 0) {
        throw new ProjectNotReadyError(
          `Tenant project status is ${lastStatus} after ${timeoutMs}ms`
        );
      }

      await this.sleep(Math.min(intervalMs, remaining));
    }
  }

  async installMigrations(
    ctx: ProviderContext,
    projectRef: string,
    migrationFiles: TemplateFile[]
  ): Promise<void> {
    if (migrationFiles.length === 0) {
      throw new TemplateInstallError("No migration files were provided");
    }

    const ledger = await this.readLedger(projectRef);
    for (const file of migrationFiles) {
      try {
        await this.applyFile(projectRef, file, ledger, true);
      } catch (error) {
        if (
          error instanceof TemplateChecksumError ||
          error instanceof TemplateLedgerError
        ) {
          throw error;
        }
        throw new TemplateInstallError(
          `Failed to apply migration ${file.file}`,
          isRetryableManagementError(error)
        );
      }
    }

    this.log("info", "Installed all template migrations", {
      projectRef,
      count: migrationFiles.length,
      storeId: ctx.storeId,
    });
  }

  async installSeeds(
    ctx: ProviderContext,
    projectRef: string,
    seedFiles: TemplateFile[]
  ): Promise<void> {
    if (seedFiles.length === 0) {
      throw new TemplateInstallError("No seed files were provided");
    }

    const ledger = await this.readLedger(projectRef);
    for (const file of seedFiles) {
      try {
        await this.applyFile(projectRef, file, ledger, true);
      } catch (error) {
        if (
          error instanceof TemplateChecksumError ||
          error instanceof TemplateLedgerError
        ) {
          throw error;
        }
        throw new TemplateInstallError(
          `Failed to apply seed ${file.file}`,
          isRetryableManagementError(error)
        );
      }
    }

    this.log("info", "Installed all template seeds", {
      projectRef,
      count: seedFiles.length,
      storeId: ctx.storeId,
    });
  }

  private async isTenantInitialized(
    projectRef: string
  ): Promise<boolean> {
    const client = this.requireClient();
    let result: unknown;
    try {
      result = await client.runQuery(
        projectRef,
        "select central_store_id, template_version from public.tenant_context where id = 1"
      );
    } catch (error) {
      throw new TenantInitializationError(
        `Unable to read tenant context: ${redactError(error)}`,
        isRetryableManagementError(error)
      );
    }

    const row = firstRow(result);
    if (!row) return false;

    const centralStoreId = row.central_store_id;
    if (typeof centralStoreId !== "string") {
      throw new TenantInitializationError(
        "Tenant context exists but has no central_store_id"
      );
    }

    return centralStoreId.length > 0;
  }

  async initializeTenant(
    ctx: ProviderContext,
    projectRef: string,
    meta: Record<string, unknown>
  ): Promise<void> {
    const client = this.requireClient();

    if (await this.isTenantInitialized(projectRef)) {
      const existing = await client.runQuery(
        projectRef,
        "select central_store_id from public.tenant_context where id = 1"
      );
      const row = firstRow(existing);
      if (row && row.central_store_id !== ctx.storeId) {
        throw new TenantInitializationError(
          "Tenant is already initialized for a different central store"
        );
      }
      this.log("info", "Tenant already initialized; skipping", { projectRef });
      return;
    }

    const organization = await ctx.env.db.queryOne<OrganizationRow>(
      `
        SELECT id, name, slug, currency, timezone, country
        FROM public.organizations
        WHERE id = $1
      `,
      [ctx.organizationId]
    );
    const store = await ctx.env.db.queryOne<StoreRow>(
      `
        SELECT id, organization_id, name, slug, status, metadata
        FROM public.stores
        WHERE id = $1
      `,
      [ctx.storeId]
    );

    if (!organization || !store) {
      throw new TenantInitializationError(
        "Organization or store disappeared before tenant initialization"
      );
    }

    const owner = await this.resolveOwner(ctx, meta);
    const taxonomyRoots = Array.isArray(meta.taxonomy_roots)
      ? meta.taxonomy_roots
      : [];
    const optionalString = (value: unknown): string | null =>
      typeof value === "string" && value.length > 0 ? value : null;

    const payload = {
      organization_id: organization.id,
      organization_name: organization.name,
      central_store_id: store.id,
      store_name: store.name,
      store_slug: store.slug,
      currency: organization.currency,
      timezone: organization.timezone,
      owner_central_user_id: owner.centralUserId,
      owner_email: owner.email,
      owner_display_name: owner.displayName,
      taxonomy_version: optionalString(meta.taxonomy_version),
      taxonomy_roots: taxonomyRoots,
      template_version: this.config.templateVersion,
      platform_issuer: optionalString(meta.platform_issuer),
      platform_audience: optionalString(meta.platform_audience),
      platform_jwks_url: optionalString(meta.platform_jwks_url),
    };

    const sql = `select public.initialize_tenant_from_json(${sqlLiteral(
      JSON.stringify(payload)
    )}::jsonb);`;

    try {
      await client.applyMigration(projectRef, {
        name: `${this.config.templateName}/init/initialize_tenant`,
        query: sql,
      });
    } catch (error) {
      throw new TenantInitializationError(
        `Tenant initialization failed: ${redactError(error)}`,
        isRetryableManagementError(error)
      );
    }

    this.log("info", "Initialized tenant context", {
      projectRef,
      storeId: ctx.storeId,
    });
  }

  private async readHealth(
    projectRef: string
  ): Promise<Record<string, unknown>> {
    const client = this.requireClient();
    let result: unknown;
    try {
      result = await client.runQuery(
        projectRef,
        "select public.commerce_template_health() as health"
      );
    } catch (error) {
      throw new VerificationError(
        `Unable to read tenant health: ${redactError(error)}`
      );
    }

    const row = firstRow(result);
    if (!row) {
      throw new VerificationError("Tenant health query returned no rows");
    }

    const candidate = row.health ?? row.commerce_template_health ?? row;
    if (typeof candidate === "string") {
      try {
        const parsed = JSON.parse(candidate) as unknown;
        if (isRecord(parsed)) return parsed;
      } catch {
        // Fall through to the error below.
      }
    }

    if (!isRecord(candidate)) {
      throw new VerificationError("Tenant health query returned an invalid payload");
    }

    return candidate;
  }

  private async verifyDataApiSecurity(projectRef: string): Promise<void> {
    const client = this.requireClient();
    const sql = `
      select
        has_table_privilege('authenticated', 'public.products', 'SELECT') as products_select,
        has_table_privilege('authenticated', 'public.orders', 'SELECT') as orders_select,
        has_table_privilege('authenticated', 'public.customers', 'SELECT') as customers_select,
        has_table_privilege('authenticated', 'public.inventory_items', 'SELECT') as inventory_select,
        has_table_privilege('anon', 'public.products', 'SELECT') as anon_products_select,
        (
          select count(*)
          from pg_policies
          where schemaname = 'public'
            and tablename = 'products'
            and 'authenticated' = any(roles)
        ) as products_policies
    `;

    let result: unknown;
    try {
      result = await client.runQuery(projectRef, sql);
    } catch (error) {
      throw new VerificationError(
        `Unable to verify Data API security: ${redactError(error)}`
      );
    }

    const row = firstRow(result);
    if (!row) {
      throw new VerificationError("Data API security query returned no rows");
    }

    const required = [
      "products_select",
      "orders_select",
      "customers_select",
      "inventory_select",
    ];
    for (const key of required) {
      if (!asBoolean(row[key])) {
        throw new VerificationError(
          `Authenticated role is missing SELECT privilege on ${key.replace(
            "_select",
            ""
          )}`
        );
      }
    }

    if (asBoolean(row.anon_products_select)) {
      throw new VerificationError(
        "Anon role must not have SELECT privilege on commerce tables"
      );
    }

    const policyCount = asNumber(row.products_policies);
    if (policyCount === null || policyCount < 1) {
      throw new VerificationError(
        "No authenticated RLS policy exists for the products table"
      );
    }
  }

  async verifyTemplate(
    _ctx: ProviderContext,
    projectRef: string,
    verificationFiles: TemplateFile[],
    migrationFiles: TemplateFile[]
  ): Promise<void> {
    const client = this.requireClient();

    if (verificationFiles.length === 0) {
      throw new VerificationError("No verification files were provided");
    }

    for (const file of verificationFiles) {
      const checksum = sha256Hex(file.sql);
      if (file.checksum !== checksum) {
        throw new TemplateChecksumError(
          `Checksum mismatch for verification ${file.file}`
        );
      }

      try {
        await client.applyMigration(projectRef, {
          name: `${this.config.templateName}/verify/${file.file}`,
          query: file.sql,
        });
      } catch (error) {
        throw new VerificationError(
          `Verification file ${file.file} failed: ${redactError(error)}`
        );
      }
    }

    const health = await this.readHealth(projectRef);
    if (health.initialized !== true) {
      throw new VerificationError("Tenant context is not initialized");
    }

    const tablesWithoutRls = asStringArray(health.tables_without_rls);
    if (tablesWithoutRls === null) {
      throw new VerificationError(
        "Tenant health did not report tables_without_rls"
      );
    }
    if (tablesWithoutRls.length > 0) {
      throw new VerificationError(
        `Tables without RLS: ${tablesWithoutRls.join(", ")}`
      );
    }

    const roles = asNumber(health.roles);
    if (roles === null || roles < 5) {
      throw new VerificationError("Default tenant roles are missing");
    }

    const migrationLedger = asStringArray(health.migration_ledger);
    if (migrationLedger === null) {
      throw new VerificationError(
        "Tenant health did not report the migration ledger"
      );
    }

    for (const migration of migrationFiles) {
      if (!migrationLedger.includes(migration.version)) {
        throw new VerificationError(
          `Migration ${migration.version} is missing from the tenant ledger`
        );
      }
    }

    await this.verifyDataApiSecurity(projectRef);

    this.verifiedProjects.add(projectRef);
    this.log("info", "Verified tenant template and database state", {
      projectRef,
    });
  }

  private selectPublishableKey(keys: SupabaseApiKey[]): string | null {
    const candidates = keys.filter((key) => {
      const name = key.name.toLowerCase();
      const type = (key.type ?? "").toLowerCase();
      if (
        name.includes("service_role") ||
        name.includes("secret") ||
        type.includes("secret") ||
        key.apiKey.startsWith("sb_secret_")
      ) {
        return false;
      }
      return (
        name === "anon" ||
        name === "anon key" ||
        name === "publishable" ||
        type === "publishable" ||
        key.apiKey.startsWith("sb_publishable_")
      );
    });

    const publishable = candidates.find(
      (key) =>
        key.name.toLowerCase() === "publishable" ||
        (key.type ?? "").toLowerCase() === "publishable" ||
        key.apiKey.startsWith("sb_publishable_")
    );
    if (publishable) return publishable.apiKey;

    return candidates[0]?.apiKey ?? null;
  }

  async activateTenant(
    ctx: ProviderContext,
    projectRef: string
  ): Promise<void> {
    if (!this.verifiedProjects.has(projectRef)) {
      throw new VerificationError(
        "Activation blocked: template verification has not succeeded"
      );
    }

    const client = this.requireClient();
    let keys: SupabaseApiKey[];
    try {
      keys = await client.getApiKeys(projectRef);
    } catch (error) {
      throw new VerificationError(
        `Unable to retrieve tenant API keys: ${redactError(error)}`
      );
    }

    const publishableKey = this.selectPublishableKey(keys);
    if (!publishableKey) {
      throw new PublishableKeyMissingError();
    }

    const repository = new TenantDatabaseRepository(ctx.env.db);
    await repository.markActive({
      storeId: ctx.storeId,
      projectRef,
      organizationId: ctx.organizationId,
      publishableKey,
      templateName: this.config.templateName,
      templateVersion: this.config.templateVersion,
      jobContext: ctx,
    });

    this.log("info", "Activated tenant database", {
      projectRef,
      storeId: ctx.storeId,
    });
  }

  async markFailed(ctx: ProviderContext, error: unknown): Promise<void> {
    const repository = new TenantDatabaseRepository(ctx.env.db);
    await repository.markFailed(ctx.storeId, {
      organizationId: ctx.organizationId,
      projectRef: ctx.projectRef,
      jobContext: ctx,
    });
    this.log("warn", "Marked tenant database provisioning as failed", {
      storeId: ctx.storeId,
      error: redactError(error),
    });
  }
}
