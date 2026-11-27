/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Test fakes.
 *
 * These fakes are only imported by *.test.ts files. They never open a
 * network connection and never touch a real database.
 */

import { createHash } from "crypto";
import type { PlatformDb } from "../db";
import type { ManagementApiPort, SupabaseApiKey, SupabaseOrganization, SupabaseProject, CreateProjectInput } from "../management/types";
import { ManagementApiError } from "../management/errors";
import type { TemplateFile } from "../template-loader";

export interface FakeJob {
  id: string;
  organization_id: string;
  store_id: string;
  connection_id: string | null;
  idempotency_key: string;
  status: string;
  current_step: string | null;
  progress: number;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface FakeJobStep {
  id: number;
  job_id: string;
  step: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface FakeTenantDatabase {
  id: string;
  organization_id: string;
  store_id: string;
  supabase_project_ref: string;
  supabase_organization_slug: string | null;
  project_name: string;
  region: string;
  template_name: string;
  template_version: string;
  database_password_secret_ref: string | null;
  publishable_key: string | null;
  lifecycle_status: string;
}

function now(): string {
  return new Date().toISOString();
}

function normalized(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Minimal in-memory implementation of the platform DB surface the worker and
 * the managed provider use. It understands only the queries in this package.
 */
export class FakePlatformDb {
  readonly queries: Array<{ text: string; params: unknown[] }> = [];
  readonly transactionQueries: Array<{ text: string; params: unknown[] }> = [];
  tenantDatabases = new Map<string, FakeTenantDatabase>();
  jobs = new Map<string, FakeJob>();
  queuedJobIds: string[] = [];
  steps: FakeJobStep[] = [];
  private nextStepId = 1;

  failTransaction = false;

  organization: Record<string, unknown> | null = {
    id: "org-1",
    name: "Test Org",
    slug: "test-org",
    currency: "INR",
    timezone: "Asia/Kolkata",
    country: "IN",
  };
  store: Record<string, unknown> | null = {
    id: "store-1",
    organization_id: "org-1",
    name: "Test Store",
    slug: "test-store",
    status: "draft",
    metadata: {},
  };
  connection: Record<string, unknown> | null = {
    id: "conn-1",
    organization_id: "org-1",
    supabase_organization_id: "sup-org-1",
    supabase_organization_slug: "test-org",
    account_name: "Test Account",
    connection_status: "active",
  };
  owner: Record<string, unknown> | null = {
    user_id: "00000000-0000-4000-8000-000000000001",
    email: "owner@example.com",
    full_name: "Store Owner",
  };
  job: FakeJob | null = {
    id: "job-1",
    organization_id: "org-1",
    store_id: "store-1",
    connection_id: "conn-1",
    idempotency_key: "store-slug",
    status: "queued",
    current_step: null,
    progress: 0,
    error_code: null,
    error_message: null,
    created_at: now(),
    updated_at: now(),
  };

  asDb(): PlatformDb {
    return this as unknown as PlatformDb;
  }

  async query(
    text: string,
    params: unknown[] = []
  ): Promise<{ rows: unknown[]; rowCount: number }> {
    this.queries.push({ text, params });
    const sql = normalized(text);

    if (sql.includes("insert into public.tenant_provisioning_job_steps")) {
      const step: FakeJobStep = {
        id: this.nextStepId++,
        job_id: String(params[0]),
        step: String(params[1]),
        status: String(params[2]),
        message: (params[3] as string | null) ?? null,
        created_at: now(),
        updated_at: now(),
      };
      this.steps.push(step);
      return { rows: [step], rowCount: 1 };
    }

    if (sql.includes("update public.tenant_provisioning_job_steps")) {
      const [jobId, status, message, step] = params as [
        string,
        string,
        string | null,
        string,
      ];
      const matches = this.steps.filter(
        (item) => item.job_id === jobId && item.step === step
      );
      const target = matches[matches.length - 1];
      if (target) {
        target.status = status;
        target.message = message;
        target.updated_at = now();
      }
      return { rows: [], rowCount: target ? 1 : 0 };
    }

    if (sql.includes("select count(*)::int as count")) {
      const [jobId, step] = params as [string, string];
      const count = this.steps.filter(
        (item) => item.job_id === jobId && item.step === step
      ).length;
      return { rows: [{ count }], rowCount: 1 };
    }

    if (sql.includes("update public.tenant_provisioning_jobs")) {
      if (sql.includes("returning id, organization_id")) {
        const jobId = this.queuedJobIds.shift();
        const job = jobId ? this.jobs.get(jobId) : undefined;
        if (!job) return { rows: [], rowCount: 0 };
        job.status = "running";
        job.current_step = "validate_target";
        job.progress = 0;
        job.updated_at = now();
        return { rows: [{ ...job }], rowCount: 1 };
      }

      const jobId = String(params[0]);
      const job = this.jobs.get(jobId) ?? this.job;
      if (!job) return { rows: [], rowCount: 0 };

      if (sql.includes("set status = $2")) {
        job.status = String(params[1]);
        job.progress = Number(params[2]);
        job.error_code = (params[3] as string | null) ?? null;
        job.error_message = (params[4] as string | null) ?? null;
      } else if (sql.includes("set status = 'queued'")) {
        job.status = "queued";
        job.current_step = "wait_healthy";
        job.progress = 0;
        job.error_code = null;
        job.error_message = null;
      }
      job.updated_at = now();
      return { rows: [job], rowCount: 1 };
    }

    if (sql.includes("insert into public.tenant_databases")) {
      const [
        organizationId,
        storeId,
        projectRef,
        organizationSlug,
        projectName,
        region,
        templateName,
        templateVersion,
        secretRef,
      ] = params as [
        string,
        string,
        string,
        string | null,
        string,
        string,
        string,
        string,
        string | null,
      ];

      if (this.tenantDatabases.has(storeId)) {
        return { rows: [], rowCount: 0 };
      }

      const row: FakeTenantDatabase = {
        id: `td-${this.tenantDatabases.size + 1}`,
        organization_id: organizationId,
        store_id: storeId,
        supabase_project_ref: projectRef,
        supabase_organization_slug: organizationSlug,
        project_name: projectName,
        region,
        template_name: templateName,
        template_version: templateVersion,
        database_password_secret_ref: secretRef,
        publishable_key: null,
        lifecycle_status: "provisioning",
      };
      this.tenantDatabases.set(storeId, row);
      return { rows: [row], rowCount: 1 };
    }

    if (sql.includes("update public.tenant_databases")) {
      const storeId = String(params[0]);
      const row = this.tenantDatabases.get(storeId);
      if (!row) {
        return { rows: [], rowCount: 0 };
      }

      // Determine organization_id parameter position based on SQL variant.
      let organizationIdParam: unknown;
      if (sql.includes("set lifecycle_status = 'failed'")) {
        organizationIdParam = params[1];
      } else if (sql.includes("set lifecycle_status = 'active'")) {
        organizationIdParam = params[5];
      } else {
        organizationIdParam = params[8];
      }

      if (String(organizationIdParam) !== row.organization_id) {
        return { rows: [], rowCount: 0 };
      }

      if (sql.includes("set lifecycle_status = 'failed'")) {
        // Check project_ref if provided in the WHERE clause.
        if (params.length > 2) {
          const projectRefParam = params[2];
          if (String(projectRefParam) !== row.supabase_project_ref) {
            return { rows: [], rowCount: 0 };
          }
        }
        if (row.lifecycle_status === "provisioning") {
          row.lifecycle_status = "failed";
        }
        return { rows: [row], rowCount: 1 };
      }

      // Determine projectRef parameter position.
      let projectRefParam: unknown;
      if (sql.includes("set lifecycle_status = 'active'")) {
        projectRefParam = params[1];
      } else {
        projectRefParam = params[1];
      }

      if (String(projectRefParam) !== row.supabase_project_ref) {
        return { rows: [], rowCount: 0 };
      }

      if (sql.includes("set lifecycle_status = 'active'")) {
        row.lifecycle_status = "active";
        row.publishable_key = String(params[2]);
        row.template_name = String(params[3]);
        row.template_version = String(params[4]);
      } else {
        row.supabase_organization_slug = params[2] as string | null;
        row.project_name = String(params[3]);
        row.region = String(params[4]);
        row.template_name = String(params[5]);
        row.template_version = String(params[6]);
        row.database_password_secret_ref =
          (params[7] as string | null) ?? row.database_password_secret_ref;
        row.lifecycle_status = "provisioning";
      }
      return { rows: [row], rowCount: 1 };
    }

    if (sql.includes("from public.tenant_databases")) {
      const storeId = String(params[0]);
      const row = this.tenantDatabases.get(storeId);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }

    if (sql.includes("from public.tenant_provisioning_jobs")) {
      const jobId = String(params[0]);
      const job = this.jobs.get(jobId) ?? this.job;
      return { rows: job ? [job] : [], rowCount: job ? 1 : 0 };
    }

    if (sql.includes("from public.organization_members")) {
      return {
        rows: this.owner ? [this.owner] : [],
        rowCount: this.owner ? 1 : 0,
      };
    }

    if (sql.includes("from public.organizations")) {
      return {
        rows: this.organization ? [this.organization] : [],
        rowCount: this.organization ? 1 : 0,
      };
    }

    if (sql.includes("from public.stores")) {
      return {
        rows: this.store ? [this.store] : [],
        rowCount: this.store ? 1 : 0,
      };
    }

    if (sql.includes("from public.supabase_connections")) {
      return {
        rows: this.connection ? [this.connection] : [],
        rowCount: this.connection ? 1 : 0,
      };
    }

    return { rows: [], rowCount: 0 };
  }

  async queryOne<T = unknown>(
    text: string,
    params: unknown[] = []
  ): Promise<T | null> {
    const result = await this.query(text, params);
    return (result.rows[0] as T) ?? null;
  }

  async transaction<T>(
    fn: (client: { query: FakePlatformDb["query"] }) => Promise<T>
  ): Promise<T> {
    const txQuery = (text: string, params?: unknown[]) => {
      this.transactionQueries.push({ text, params: params ?? [] });
      return this.query(text, params);
    };
    return fn({ query: txQuery });
  }

  async close(): Promise<void> {}
}

export interface FakeManagementOptions {
  projectRef?: string;
  projectName?: string;
  status?: string;
  projects?: SupabaseProject[];
  apiKeys?: SupabaseApiKey[];
  health?: Record<string, unknown>;
  securityRow?: Record<string, unknown>;
}

export function makeProject(
  status = "ACTIVE_HEALTHY",
  projectRef = "abcdefghijklmnopqrst",
  name = "test-store-commerce"
): SupabaseProject {
  return {
    ref: projectRef,
    id: projectRef,
    name,
    organizationId: "sup-org-1",
    region: "ap-south-1",
    status,
  };
}

/**
 * Fake Management API. Every call is recorded. Tests inject failures by
 * pushing errors onto the matching queue.
 */
export class FakeManagementApi implements ManagementApiPort {
  readonly calls: string[] = [];
  readonly appliedMigrations: Array<{
    projectRef: string;
    name: string;
    query: string;
  }> = [];
  readonly queryLog: Array<{ projectRef: string; query: string }> = [];
  readonly createProjectInputs: CreateProjectInput[] = [];
  readonly failures: Record<string, Error[]> = {};

  projects: SupabaseProject[];
  apiKeys: SupabaseApiKey[];
  health: Record<string, unknown>;
  securityRow: Record<string, unknown>;
  tenantContext: Record<string, unknown> | null = null;
  ledger = new Map<string, { checksum: string; kind: string }>();
  private readonly projectRef: string;

  constructor(options: FakeManagementOptions = {}) {
    this.projectRef = options.projectRef ?? "abcdefghijklmnopqrst";
    this.projects = options.projects ?? [];
    this.apiKeys = options.apiKeys ?? [
      { name: "anon", apiKey: "anon-key-value", type: "legacy" },
      { name: "service_role", apiKey: "sb_secret_should_not_be_persisted", type: "legacy" },
    ];
    this.health = options.health ?? {
      initialized: true,
      tables_without_rls: [],
      roles: 5,
      migration_ledger: [],
    };
    this.securityRow = options.securityRow ?? {
      products_select: true,
      orders_select: true,
      customers_select: true,
      inventory_select: true,
      anon_products_select: false,
      products_policies: 1,
    };
  }

  private maybeFail(method: string): void {
    const queue = this.failures[method];
    if (queue && queue.length > 0) {
      throw queue.shift()!;
    }
  }

  async getOrganizations(): Promise<SupabaseOrganization[]> {
    this.calls.push("getOrganizations");
    this.maybeFail("getOrganizations");
    return [{ id: "sup-org-1", name: "Platform Org", slug: "platform-org" }];
  }

  async createProject(input: CreateProjectInput): Promise<SupabaseProject> {
    this.calls.push("createProject");
    this.maybeFail("createProject");
    this.createProjectInputs.push(input);
    const project: SupabaseProject = {
      ref: this.projectRef,
      id: this.projectRef,
      name: input.name,
      organizationId: input.organizationId,
      region: input.region,
      status: "ACTIVE_HEALTHY",
    };
    this.projects = [project];
    return project;
  }

  async getProject(projectRef: string): Promise<SupabaseProject> {
    this.calls.push("getProject");
    this.maybeFail("getProject");
    const project = this.projects.find((item) => item.ref === projectRef);
    if (!project) {
      throw new ManagementApiError(404, "not_found", "Project not found", false);
    }
    return project;
  }

  async listProjects(): Promise<SupabaseProject[]> {
    this.calls.push("listProjects");
    this.maybeFail("listProjects");
    return this.projects;
  }

  async getApiKeys(projectRef: string): Promise<SupabaseApiKey[]> {
    this.calls.push("getApiKeys");
    this.maybeFail("getApiKeys");
    void projectRef;
    return this.apiKeys;
  }

  async applyMigration(
    projectRef: string,
    input: { name: string; query: string }
  ): Promise<void> {
    this.calls.push("applyMigration");
    this.maybeFail(`applyMigration:${input.name}`);
    this.maybeFail("applyMigration");
    this.appliedMigrations.push({ projectRef, ...input });

    if (input.name.endsWith("/init/initialize_tenant")) {
      this.tenantContext = {
        central_store_id: "store-1",
        template_version: "1.0.0",
      };
    }
  }

  async runQuery(projectRef: string, query: string): Promise<unknown> {
    this.calls.push("runQuery");
    this.maybeFail("runQuery");
    this.queryLog.push({ projectRef, query });
    const sql = normalized(query);

    if (sql.startsWith("insert into public.commerce_template_migrations")) {
      const match = query.match(/values\s*\('([^']*)',\s*'([^']*)',\s*'([^']*)'\)/i);
      if (match) {
        this.ledger.set(match[1]!, { checksum: match[2]!, kind: match[3]! });
      }
      return [];
    }

    if (sql.includes("from public.commerce_template_migrations")) {
      return Array.from(this.ledger.entries()).map(([version, value]) => ({
        version,
        checksum: value.checksum,
        kind: value.kind,
      }));
    }

    if (sql.includes("commerce_template_health()")) {
      return [
        {
          health: {
            ...this.health,
            migration_ledger: Array.from(this.ledger.keys()).sort(),
          },
        },
      ];
    }

    if (sql.includes("has_table_privilege")) {
      return [this.securityRow];
    }

    if (sql.includes("from public.tenant_context")) {
      return this.tenantContext ? [{ ...this.tenantContext }] : [];
    }

    return [];
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function fileOf(
  kind: TemplateFile["kind"],
  version: string,
  file: string
): TemplateFile {
  const sql = `select '${kind}:${version}';`;
  return { version, kind, file, checksum: sha256(sql), sql };
}

export function migrationFiles(count = 3): TemplateFile[] {
  return Array.from({ length: count }, (_, index) =>
    fileOf(
      "migration",
      String(index + 1).padStart(3, "0"),
      `migrations/${String(index + 1).padStart(3, "0")}_test.sql`
    )
  );
}

export function seedFiles(count = 2): TemplateFile[] {
  return Array.from({ length: count }, (_, index) =>
    fileOf("seed", `seed-${index + 1}`, `seeds/seed-${index + 1}.sql`)
  );
}

export function verificationFiles(count = 2): TemplateFile[] {
  return Array.from({ length: count }, (_, index) =>
    fileOf("verify", `verify-${index + 1}`, `tests/verify-${index + 1}.sql`)
  );
}
