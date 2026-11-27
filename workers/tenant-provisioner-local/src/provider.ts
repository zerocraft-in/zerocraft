/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Provider architecture for tenant provisioning.
 *
 * Selection is explicit and fail-closed:
 *   disabled -> throws (the default)
 *   mock     -> only with runtime "test" AND allowMock: true
 *   managed  -> requires a complete managed configuration
 *
 * Managed mode never falls back to MockProvider. A production runtime rejects
 * MockProvider even when it is requested explicitly.
 */

import {
  MockProviderNotAllowedError,
  ProviderConfigurationError,
  ProviderDisabledError,
  ReauthorizationRequiredError,
  ValidationError,
} from "./errors";
import {
  SupabaseManagedProvider,
  type SupabaseManagedProviderConfig,
} from "./providers/supabase-managed-provider";
import type { TemplateFile } from "./template-loader";
import type {
  ConnectionRow,
  OrganizationRow,
  ProviderContext,
  StoreRow,
} from "./types";

export interface ProvisionedProject {
  projectRef: string;
  projectName: string;
  region: string;
  projectUrl: string;
  organizationSlug: string | null;
  created: boolean;
}

/**
 * Interface implemented by every provisioning provider. Each method maps to
 * one of the nine lifecycle steps in tenant_provisioning_job_steps.
 */
export interface ProvisioningProvider {
  readonly name: string;
  readonly isMock: boolean;

  validateTarget(
    ctx: ProviderContext,
    organization: OrganizationRow,
    store: StoreRow,
    connection: ConnectionRow | null
  ): Promise<void>;

  ensureOAuth(
    ctx: ProviderContext,
    connection: ConnectionRow | null
  ): Promise<void>;

  createProject(
    ctx: ProviderContext,
    store: StoreRow,
    connection: ConnectionRow | null,
    meta: Record<string, unknown>
  ): Promise<ProvisionedProject>;

  waitForHealthy(ctx: ProviderContext, projectRef: string): Promise<void>;

  installMigrations(
    ctx: ProviderContext,
    projectRef: string,
    migrationFiles: TemplateFile[]
  ): Promise<void>;

  installSeeds(
    ctx: ProviderContext,
    projectRef: string,
    seedFiles: TemplateFile[]
  ): Promise<void>;

  initializeTenant(
    ctx: ProviderContext,
    projectRef: string,
    meta: Record<string, unknown>
  ): Promise<void>;

  verifyTemplate(
    ctx: ProviderContext,
    projectRef: string,
    verificationFiles: TemplateFile[],
    migrationFiles: TemplateFile[]
  ): Promise<void>;

  activateTenant(ctx: ProviderContext, projectRef: string): Promise<void>;

  /**
   * Optional terminal-failure hook. A failed or partially completed job must
   * never activate the tenant; managed mode marks a provisioning row failed.
   */
  markFailed?(ctx: ProviderContext, error: unknown): Promise<void>;
}

/**
 * MOCK provider for isolated tests.
 *
 * It never calls an external API, never creates a hosted project, never
 * requires credentials and never touches the platform database.
 */
export class MockProvider implements ProvisioningProvider {
  readonly name = "mock";
  readonly isMock = true;

  async validateTarget(
    _ctx: ProviderContext,
    organization: OrganizationRow,
    store: StoreRow,
    connection: ConnectionRow | null
  ): Promise<void> {
    if (!organization || !store) {
      throw new ValidationError("Missing organization or store");
    }
    if (store.status !== "draft" && store.status !== "active") {
      throw new ValidationError(
        `Store is ${store.status}, expected 'draft' or 'active'`
      );
    }
    if (connection && connection.connection_status === "revoked") {
      throw new ReauthorizationRequiredError("Connection is revoked");
    }
  }

  async ensureOAuth(
    _ctx: ProviderContext,
    _connection: ConnectionRow | null
  ): Promise<void> {
    // MOCK: OAuth acceptance is simulated. No external API call is made.
  }

  async createProject(
    _ctx: ProviderContext,
    store: StoreRow,
    _connection: ConnectionRow | null,
    meta: Record<string, unknown>
  ): Promise<ProvisionedProject> {
    const projectRef = `mock-${store.slug}`;
    return {
      projectRef,
      projectName:
        typeof meta.project_name === "string" ? meta.project_name : store.name,
      region:
        typeof meta.region === "string" ? meta.region : "mock-region",
      projectUrl: `https://${projectRef}.supabase.co`,
      organizationSlug: null,
      created: true,
    };
  }

  async waitForHealthy(
    _ctx: ProviderContext,
    _projectRef: string
  ): Promise<void> {
    // MOCK: projects are immediately healthy.
  }

  async installMigrations(
    _ctx: ProviderContext,
    _projectRef: string,
    _migrationFiles: TemplateFile[]
  ): Promise<void> {
    // MOCK: no SQL is executed.
  }

  async installSeeds(
    _ctx: ProviderContext,
    _projectRef: string,
    _seedFiles: TemplateFile[]
  ): Promise<void> {
    // MOCK: no SQL is executed.
  }

  async initializeTenant(
    _ctx: ProviderContext,
    _projectRef: string,
    _meta: Record<string, unknown>
  ): Promise<void> {
    // MOCK: no tenant initialization is performed.
  }

  async verifyTemplate(
    _ctx: ProviderContext,
    _projectRef: string,
    _verificationFiles: TemplateFile[],
    _migrationFiles: TemplateFile[]
  ): Promise<void> {
    // MOCK: verification is simulated.
  }

  async activateTenant(
    _ctx: ProviderContext,
    _projectRef: string
  ): Promise<void> {
    // MOCK: no platform state is changed.
  }

  async markFailed(
    _ctx: ProviderContext,
    _error: unknown
  ): Promise<void> {
    // MOCK: no platform state is changed.
  }
}

export type ProviderMode = "disabled" | "mock" | "managed";

export interface ProviderSelection {
  mode: ProviderMode;
  managed?: SupabaseManagedProviderConfig;
}

export interface ProviderFactoryOptions {
  /**
   * "production" is the default. Mock is only permitted when the caller
   * explicitly declares a test runtime and sets allowMock.
   */
  runtime?: "production" | "test";
  allowMock?: boolean;
}

export function createProvider(
  selection: ProviderSelection = { mode: "disabled" },
  options: ProviderFactoryOptions = {}
): ProvisioningProvider {
  const runtime = options.runtime ?? "production";

  if (selection.mode === "disabled") {
    throw new ProviderDisabledError();
  }

  if (selection.mode === "mock") {
    if (runtime !== "test") {
      throw new MockProviderNotAllowedError(
        "MockProvider cannot be created in a production runtime"
      );
    }
    if (options.allowMock !== true) {
      throw new MockProviderNotAllowedError(
        "MockProvider requires allowMock: true and is test-only"
      );
    }
    return new MockProvider();
  }

  if (selection.mode === "managed") {
    if (!selection.managed) {
      throw new ProviderConfigurationError(
        "Managed provider mode requires an explicit managed configuration"
      );
    }
    return new SupabaseManagedProvider(selection.managed);
  }

  throw new ProviderConfigurationError(
    `Unknown provider mode: ${String((selection as { mode?: unknown }).mode)}`
  );
}
