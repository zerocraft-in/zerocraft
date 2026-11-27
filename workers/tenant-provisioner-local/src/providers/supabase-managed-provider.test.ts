/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * SupabaseManagedProvider lifecycle tests.
 *
 * All Management API traffic goes to FakeManagementApi. All platform queries
 * go to FakePlatformDb. No test opens a network connection or touches a real
 * database.
 */

import { describe, expect, it } from "vitest";
import {
  PublishableKeyMissingError,
  ProjectNotReadyError,
  ProjectStateError,
  ReauthorizationRequiredError,
  TemplateChecksumError,
  TemplateInstallError,
  TenantDatabaseConflictError,
  TenantProjectMissingError,
  ValidationError,
  VerificationError,
} from "../errors";
import { ManagementApiClient } from "../management/client";
import { ManagementApiError } from "../management/errors";
import {
  StaticManagementTokenProvider,
  SupabaseManagedProvider,
  type SupabaseManagedProviderConfig,
} from "./supabase-managed-provider";
import { InMemoryTenantSecretStore, makeDatabasePasswordSecretRef } from "../secrets";
import type { ProviderContext } from "../types";
import {
  FakeManagementApi,
  FakePlatformDb,
  makeProject,
  migrationFiles,
  seedFiles,
  verificationFiles,
} from "../testing/fakes";

const PROJECT_REF = "abcdefghijklmnopqrst";
const SECRET_REF = makeDatabasePasswordSecretRef("store-1");

interface Harness {
  db: FakePlatformDb;
  api: FakeManagementApi;
  secretStore: InMemoryTenantSecretStore;
  provider: SupabaseManagedProvider;
  ctx: ProviderContext;
  clock: { value: number };
}

function harness(
  overrides: Partial<SupabaseManagedProviderConfig> = {},
  api = new FakeManagementApi()
): Harness {
  const db = new FakePlatformDb();
  const secretStore = new InMemoryTenantSecretStore();
  const clock = { value: 1_000 };

  const provider = new SupabaseManagedProvider({
    organizationId: "sup-org-1",
    organizationSlug: "platform-org",
    region: "ap-south-1",
    computeSize: "micro",
    templateName: "zerocraft-default-commerce",
    templateVersion: "1.0.0",
    tokenProvider: new StaticManagementTokenProvider("sbp_test_token"),
    secretStore,
    clientFactory: () => api,
    protectedProjectRefs: ["ftcvyhlzeyqceosdqyxn", "qvjhwxriafgobxknpqtq"],
    sleep: async (milliseconds) => {
      clock.value += milliseconds;
    },
    now: () => clock.value,
    ...overrides,
  });

  const ctx: ProviderContext = {
    env: { db: db.asDb() },
    jobId: "job-1",
    storeId: "store-1",
    organizationId: "org-1",
    connectionId: "conn-1",
    metadata: {},
  };

  return { db, api, secretStore, provider, ctx, clock };
}

const organization = {
  id: "org-1",
  name: "Test Org",
  slug: "test-org",
  currency: "INR",
  timezone: "Asia/Kolkata",
  country: "IN",
};

const store = {
  id: "store-1",
  organization_id: "org-1",
  name: "Test Store",
  slug: "test-store",
  status: "draft",
  metadata: {},
};

const connection = {
  id: "conn-1",
  organization_id: "org-1",
  supabase_organization_id: "sup-org-1",
  supabase_organization_slug: "test-org",
  account_name: "Test Account",
  connection_status: "active",
};

async function runLifecycle(h: Harness): Promise<void> {
  const migrations = migrationFiles(2);
  const seeds = seedFiles(1);
  const verification = verificationFiles(1);

  await h.provider.validateTarget(h.ctx, organization, store, connection);
  await h.provider.ensureOAuth(h.ctx, connection);
  const project = await h.provider.createProject(
    h.ctx,
    store,
    connection,
    h.ctx.metadata
  );
  await h.provider.waitForHealthy(h.ctx, project.projectRef);
  await h.provider.installMigrations(h.ctx, project.projectRef, migrations);
  await h.provider.installSeeds(h.ctx, project.projectRef, seeds);
  await h.provider.initializeTenant(h.ctx, project.projectRef, h.ctx.metadata);
  await h.provider.verifyTemplate(
    h.ctx,
    project.projectRef,
    verification,
    migrations
  );
  await h.provider.activateTenant(h.ctx, project.projectRef);
}

describe("SupabaseManagedProvider lifecycle", () => {
  it("provisions, verifies and activates a tenant in order", async () => {
    const h = harness();

    await runLifecycle(h);

    const row = h.db.tenantDatabases.get("store-1");
    expect(row).toBeDefined();
    expect(row!.lifecycle_status).toBe("active");
    expect(row!.supabase_project_ref).toBe(PROJECT_REF);
    expect(row!.region).toBe("ap-south-1");
    expect(row!.template_name).toBe("zerocraft-default-commerce");
    expect(row!.template_version).toBe("1.0.0");
    expect(row!.database_password_secret_ref).toBe(SECRET_REF);
    expect(row!.publishable_key).toBe("anon-key-value");

    // The service role key must never be persisted anywhere.
    expect(JSON.stringify(row)).not.toContain("sb_secret");

    // The password handed to the API is the one stored in the secret store.
    const password = await h.secretStore.get(SECRET_REF);
    expect(password).toBeTruthy();
    expect(h.api.createProjectInputs[0]!.dbPassword).toBe(password);

    expect(h.api.calls).toContain("createProject");
    expect(h.api.calls).toContain("getApiKeys");
  });

  it("requires OAuth before the Management API can be used", async () => {
    const h = harness();
    await expect(h.provider.createProject(h.ctx, store, connection, {})).rejects.toThrow(
      /Management API client is not available/
    );
  });

  it("rejects a revoked connection", async () => {
    const h = harness();
    await expect(
      h.provider.ensureOAuth(h.ctx, {
        ...connection,
        connection_status: "revoked",
      })
    ).rejects.toBeInstanceOf(ReauthorizationRequiredError);
  });

  it("rejects a store in an invalid status", async () => {
    const h = harness();
    await expect(
      h.provider.validateTarget(
        h.ctx,
        organization,
        { ...store, status: "archived" },
        connection
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a connection from another organization", async () => {
    const h = harness();
    await expect(
      h.provider.validateTarget(
        h.ctx,
        organization,
        store,
        { ...connection, organization_id: "org-2" }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("project creation", () => {
  it("creates a project with explicit organization, region and compute size", async () => {
    const h = harness();
    await h.provider.validateTarget(h.ctx, organization, store, connection);
    await h.provider.ensureOAuth(h.ctx, connection);
    const project = await h.provider.createProject(h.ctx, store, connection, {});

    expect(project.created).toBe(true);
    expect(project.projectRef).toBe(PROJECT_REF);
    expect(h.api.createProjectInputs[0]).toMatchObject({
      organizationId: "sup-org-1",
      organizationSlug: "platform-org",
      region: "ap-south-1",
      computeSize: "micro",
    });
  });

  it("surfaces a creation failure and does not persist a tenant row", async () => {
    const api = new FakeManagementApi();
    api.failures.createProject = [
      new ManagementApiError(500, "server_error", "project creation failed", true),
    ];
    const h = harness({}, api);

    await h.provider.validateTarget(h.ctx, organization, store, connection);
    await h.provider.ensureOAuth(h.ctx, connection);

    await expect(
      h.provider.createProject(h.ctx, store, connection, {})
    ).rejects.toBeInstanceOf(ManagementApiError);

    expect(h.db.tenantDatabases.size).toBe(0);
    await expect(h.secretStore.get(SECRET_REF)).resolves.toBeNull();
  });

  it("reconciles an existing registered project instead of creating a duplicate", async () => {
    const h = harness();
    h.api.projects = [makeProject("ACTIVE_HEALTHY")];
    h.db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: PROJECT_REF,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: SECRET_REF,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });
    await h.secretStore.put(SECRET_REF, "existing-password");

    await h.provider.validateTarget(h.ctx, organization, store, connection);
    await h.provider.ensureOAuth(h.ctx, connection);
    const project = await h.provider.createProject(h.ctx, store, connection, {});

    expect(project.created).toBe(false);
    expect(h.api.calls).not.toContain("createProject");
    expect(h.api.calls).toContain("getProject");
    expect(h.db.tenantDatabases.get("store-1")!.lifecycle_status).toBe(
      "provisioning"
    );
  });

  it("refuses to recreate a registered project that no longer exists", async () => {
    const h = harness();
    h.db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: PROJECT_REF,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: SECRET_REF,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });
    h.api.projects = [];

    await h.provider.validateTarget(h.ctx, organization, store, connection);
    await h.provider.ensureOAuth(h.ctx, connection);

    await expect(
      h.provider.createProject(h.ctx, store, connection, {})
    ).rejects.toBeInstanceOf(TenantProjectMissingError);
    expect(h.api.calls).not.toContain("createProject");
  });

  it("reconciles an unregistered project with a matching name", async () => {
    const h = harness();
    h.api.projects = [makeProject("ACTIVE_HEALTHY")];
    await h.provider.validateTarget(h.ctx, organization, store, connection);
    await h.provider.ensureOAuth(h.ctx, connection);

    const project = await h.provider.createProject(h.ctx, store, connection, {});

    expect(project.created).toBe(false);
    expect(h.api.calls).not.toContain("createProject");
    expect(h.db.tenantDatabases.get("store-1")!.supabase_project_ref).toBe(
      PROJECT_REF
    );
  });

  it("reconciles after a 409 conflict from the create call", async () => {
    const api = new FakeManagementApi();
    api.createProject = async () => {
      api.projects = [makeProject("ACTIVE_HEALTHY")];
      throw new ManagementApiError(409, "conflict", "already exists", false);
    };
    const h = harness({}, api);

    await h.provider.validateTarget(h.ctx, organization, store, connection);
    await h.provider.ensureOAuth(h.ctx, connection);
    const project = await h.provider.createProject(h.ctx, store, connection, {});

    expect(project.created).toBe(false);
    expect(h.db.tenantDatabases.get("store-1")!.supabase_project_ref).toBe(
      PROJECT_REF
    );
  });

  it("refuses a protected project reference", async () => {
    const h = harness();
    h.db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: "ftcvyhlzeyqceosdqyxn",
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });

    await expect(
      h.provider.validateTarget(h.ctx, organization, store, connection)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a registered project owned by another organization", async () => {
    const h = harness();
    h.db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-2",
      store_id: "store-1",
      supabase_project_ref: PROJECT_REF,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });

    await expect(
      h.provider.validateTarget(h.ctx, organization, store, connection)
    ).rejects.toBeInstanceOf(TenantDatabaseConflictError);
  });
});

describe("organization slug resolution", () => {
  it("resolves organization ID to slug via GET /v1/organizations and uses it in createProject", async () => {
    const h = harness();
    await h.provider.validateTarget(h.ctx, organization, store, connection);
    await h.provider.ensureOAuth(h.ctx, connection);
    const project = await h.provider.createProject(h.ctx, store, connection, {});

    expect(project.created).toBe(true);
    expect(h.api.calls).toContain("getOrganizations");
    expect(h.api.createProjectInputs[0]!.organizationSlug).toBe("platform-org");
    expect(h.api.createProjectInputs[0]!.organizationId).toBe("sup-org-1");
  });

  it("fails closed when the organization has no slug", async () => {
    const api = new FakeManagementApi();
    api.getOrganizations = async () => [
      { id: "sup-org-1", name: "Platform Org", slug: "" },
    ];
    const h = harness({}, api);

    await h.provider.validateTarget(h.ctx, organization, store, connection);
    await expect(
      h.provider.ensureOAuth(h.ctx, connection)
    ).rejects.toThrow(/has no slug/);
  });

  it("fails closed when the configured organization ID is not found", async () => {
    const api = new FakeManagementApi();
    api.getOrganizations = async () => [
      { id: "different-org", name: "Different Org", slug: "different-org" },
    ];
    const h = harness({}, api);

    await h.provider.validateTarget(h.ctx, organization, store, connection);
    await expect(
      h.provider.ensureOAuth(h.ctx, connection)
    ).rejects.toThrow(/cannot access the configured Supabase organization/);
  });
});

describe("readiness", () => {
  it("waits until the project is ACTIVE_HEALTHY", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.projects = [makeProject("COMING_UP")];

    const original = h.api.getProject.bind(h.api);
    let calls = 0;
    h.api.getProject = async (ref: string) => {
      calls += 1;
      if (calls >= 3) h.api.projects[0]!.status = "ACTIVE_HEALTHY";
      return original(ref);
    };

    await h.provider.waitForHealthy(h.ctx, PROJECT_REF);
    expect(calls).toBe(3);
  });

  it("times out with a bounded readiness budget", async () => {
    const h = harness({
      readinessTimeoutMs: 20,
      readinessPollIntervalMs: 5,
    });
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.projects = [makeProject("COMING_UP")];

    await expect(
      h.provider.waitForHealthy(h.ctx, PROJECT_REF)
    ).rejects.toBeInstanceOf(ProjectNotReadyError);
  });

  it("fails fast on a terminal project state", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.projects = [makeProject("FAILED")];

    await expect(
      h.provider.waitForHealthy(h.ctx, PROJECT_REF)
    ).rejects.toBeInstanceOf(ProjectStateError);
  });
});

describe("template installation", () => {
  it("applies every migration in manifest order and records the ledger", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    const migrations = migrationFiles(3);

    await h.provider.installMigrations(h.ctx, PROJECT_REF, migrations);

    const applied = h.api.appliedMigrations
      .filter((item) => item.name.includes("/migration/"))
      .map((item) => item.name);
    expect(applied).toEqual([
      "zerocraft-default-commerce/migration/migrations/001_test.sql",
      "zerocraft-default-commerce/migration/migrations/002_test.sql",
      "zerocraft-default-commerce/migration/migrations/003_test.sql",
    ]);
    expect(Array.from(h.api.ledger.keys())).toEqual(["001", "002", "003"]);
  });

  it("skips a file that is already in the tenant ledger", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    const migrations = migrationFiles(2);
    await h.provider.installMigrations(h.ctx, PROJECT_REF, migrations);

    const before = h.api.appliedMigrations.length;
    await h.provider.installMigrations(h.ctx, PROJECT_REF, migrations);
    expect(h.api.appliedMigrations.length).toBe(before);
  });

  it("rejects a checksum mismatch before applying SQL", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    const migrations = migrationFiles(1);
    migrations[0] = { ...migrations[0]!, checksum: "0".repeat(64) };

    await expect(
      h.provider.installMigrations(h.ctx, PROJECT_REF, migrations)
    ).rejects.toBeInstanceOf(TemplateChecksumError);
    expect(h.api.appliedMigrations).toHaveLength(0);
  });

  it("fails the migration step when the API rejects a migration", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.failures[
      "applyMigration:zerocraft-default-commerce/migration/migrations/001_test.sql"
    ] = [new ManagementApiError(400, "syntax_error", "bad sql", false)];

    await expect(
      h.provider.installMigrations(h.ctx, PROJECT_REF, migrationFiles(2))
    ).rejects.toBeInstanceOf(TemplateInstallError);
  });

  it("fails the seed step when the API rejects a seed", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.failures[
      "applyMigration:zerocraft-default-commerce/seed/seeds/seed-1.sql"
    ] = [new ManagementApiError(400, "seed_failed", "bad seed", false)];

    await expect(
      h.provider.installSeeds(h.ctx, PROJECT_REF, seedFiles(1))
    ).rejects.toBeInstanceOf(TemplateInstallError);
  });

  it("rejects an empty migration bundle", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    await expect(
      h.provider.installMigrations(h.ctx, PROJECT_REF, [])
    ).rejects.toBeInstanceOf(TemplateInstallError);
  });
});

describe("tenant initialization", () => {
  it("initializes the tenant with the owner resolved from the platform", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);

    await h.provider.initializeTenant(h.ctx, PROJECT_REF, {});

    const init = h.api.appliedMigrations.find((item) =>
      item.name.endsWith("/init/initialize_tenant")
    );
    expect(init).toBeDefined();

    const match = init!.query.match(/initialize_tenant_from_json\('(.*)'::jsonb\)/s);
    expect(match).toBeTruthy();
    const payload = JSON.parse(match![1]!.replace(/''/g, "'"));
    expect(payload.central_store_id).toBe("store-1");
    expect(payload.organization_id).toBe("org-1");
    expect(payload.currency).toBe("INR");
    expect(payload.timezone).toBe("Asia/Kolkata");
    expect(payload.owner_central_user_id).toBe(
      "00000000-0000-4000-8000-000000000001"
    );
    expect(payload.template_version).toBe("1.0.0");
  });

  it("uses owner metadata when provided", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);

    await h.provider.initializeTenant(h.ctx, PROJECT_REF, {
      owner_central_user_id: "00000000-0000-4000-8000-000000000099",
      owner_email: "owner@test.dev",
      owner_display_name: "Owner Name",
    });

    const init = h.api.appliedMigrations.find((item) =>
      item.name.endsWith("/init/initialize_tenant")
    )!;
    expect(init.query).toContain("00000000-0000-4000-8000-000000000099");
    expect(h.db.queries.some((item) =>
      item.text.includes("organization_members")
    )).toBe(false);
  });

  it("refuses to reinitialize a tenant for a different central store", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.tenantContext = {
      central_store_id: "store-999",
      template_version: "1.0.0",
    };

    await expect(
      h.provider.initializeTenant(h.ctx, PROJECT_REF, {})
    ).rejects.toThrow(/different central store/);
  });

  it("fails when no owner exists", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.db.owner = null;

    await expect(
      h.provider.initializeTenant(h.ctx, PROJECT_REF, {})
    ).rejects.toThrow(/No active organization owner/);
  });
});

describe("verification and activation", () => {
  it("blocks activation until verification has succeeded", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);

    await expect(
      h.provider.activateTenant(h.ctx, PROJECT_REF)
    ).rejects.toBeInstanceOf(VerificationError);
    expect(h.api.calls).not.toContain("getApiKeys");
  });

  it("verifies health, RLS coverage, roles, ledger and Data API grants", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    const migrations = migrationFiles(2);
    await h.provider.installMigrations(h.ctx, PROJECT_REF, migrations);

    await expect(
      h.provider.verifyTemplate(
        h.ctx,
        PROJECT_REF,
        verificationFiles(1),
        migrations
      )
    ).resolves.toBeUndefined();

    const securityQuery = h.api.queryLog.find((item) =>
      item.query.includes("has_table_privilege")
    );
    expect(securityQuery).toBeDefined();
  });

  it("fails verification when the tenant is not initialized", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.health.initialized = false;

    await expect(
      h.provider.verifyTemplate(h.ctx, PROJECT_REF, verificationFiles(1), [])
    ).rejects.toBeInstanceOf(VerificationError);
  });

  it("fails verification when a table is missing RLS", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.health.tables_without_rls = ["orders"];

    await expect(
      h.provider.verifyTemplate(h.ctx, PROJECT_REF, verificationFiles(1), [])
    ).rejects.toThrow(/Tables without RLS: orders/);
  });

  it("fails verification when a migration is missing from the ledger", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);

    await expect(
      h.provider.verifyTemplate(
        h.ctx,
        PROJECT_REF,
        verificationFiles(1),
        migrationFiles(2)
      )
    ).rejects.toThrow(/missing from the tenant ledger/);
  });

  it("fails verification when anon has table access", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.securityRow.anon_products_select = true;

    await expect(
      h.provider.verifyTemplate(h.ctx, PROJECT_REF, verificationFiles(1), [])
    ).rejects.toThrow(/Anon role must not have SELECT/);
  });

  it("fails verification when authenticated lacks a grant", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.securityRow.orders_select = false;

    await expect(
      h.provider.verifyTemplate(h.ctx, PROJECT_REF, verificationFiles(1), [])
    ).rejects.toThrow(/missing SELECT privilege on orders/);
  });

  it("fails verification when the products RLS policy is missing", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.securityRow.products_policies = 0;

    await expect(
      h.provider.verifyTemplate(h.ctx, PROJECT_REF, verificationFiles(1), [])
    ).rejects.toThrow(/No authenticated RLS policy/);
  });

  it("does not activate when a verification file fails", async () => {
    const h = harness();
    await h.provider.ensureOAuth(h.ctx, connection);
    h.api.failures[
      "applyMigration:zerocraft-default-commerce/verify/tests/verify-1.sql"
    ] = [new ManagementApiError(400, "verify_failed", "check failed", false)];

    await expect(
      h.provider.verifyTemplate(h.ctx, PROJECT_REF, verificationFiles(1), [])
    ).rejects.toBeInstanceOf(VerificationError);

    await expect(
      h.provider.activateTenant(h.ctx, PROJECT_REF)
    ).rejects.toBeInstanceOf(VerificationError);
  });

  it("persists only the publishable key on activation", async () => {
    const h = harness();
    await runLifecycle(h);

    const row = h.db.tenantDatabases.get("store-1")!;
    expect(row.publishable_key).toBe("anon-key-value");
    expect(JSON.stringify(row)).not.toContain("service_role");
  });

  it("refuses to activate when no publishable key is available", async () => {
    const api = new FakeManagementApi({
      apiKeys: [
        { name: "service_role", apiKey: "sb_secret_only", type: "legacy" },
      ],
    });
    const h = harness({}, api);
    await runLifecycle(h).catch(() => undefined);

    // Run the steps again explicitly so the verification guard is satisfied.
    const migrations = migrationFiles(2);
    await h.provider.ensureOAuth(h.ctx, connection);
    await h.provider.installMigrations(h.ctx, PROJECT_REF, migrations);
    await h.provider.verifyTemplate(h.ctx, PROJECT_REF, verificationFiles(1), migrations);

    await expect(
      h.provider.activateTenant(h.ctx, PROJECT_REF)
    ).rejects.toBeInstanceOf(PublishableKeyMissingError);
  });

  it("marks a provisioning row failed without activating it", async () => {
    const h = harness();
    h.db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: PROJECT_REF,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: SECRET_REF,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });

    await h.provider.markFailed!(h.ctx, new Error("boom"));

    expect(h.db.tenantDatabases.get("store-1")!.lifecycle_status).toBe("failed");
    expect(h.db.tenantDatabases.get("store-1")!.publishable_key).toBeNull();
  });
});

describe("Management API retry integration", () => {
  it("retries HTTP 429 through the real client with an injected transport", async () => {
    const responses = [
      {
        status: 429,
        ok: false,
        headers: { get: () => "0" },
        text: async () => JSON.stringify({ message: "rate limited" }),
      },
      {
        status: 200,
        ok: true,
        headers: { get: () => null },
        text: async () =>
          JSON.stringify({
            ref: PROJECT_REF,
            id: PROJECT_REF,
            name: "test-store-commerce",
            organization_id: "sup-org-1",
            region: "ap-south-1",
            status: "ACTIVE_HEALTHY",
          }),
      },
    ];

    const organizationsResponse = {
      status: 200,
      ok: true,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify([
          { id: "sup-org-1", name: "Platform Org", slug: "platform-org" },
        ]),
    };

    let index = 0;
    const transport = async (url: string) => {
      if (url.endsWith("/v1/organizations")) {
        return organizationsResponse;
      }
      return responses[Math.min(index++, responses.length - 1)]!;
    };

    const h = harness({
      clientFactory: (accessToken) =>
        new ManagementApiClient({
          accessToken,
          transport,
          maxRetries: 2,
          retryBaseDelayMs: 1,
          retryMaxDelayMs: 1,
          sleep: async () => undefined,
        }),
    });

    await h.provider.ensureOAuth(h.ctx, connection);
    await expect(h.provider.waitForHealthy(h.ctx, PROJECT_REF)).resolves.toBeUndefined();
    expect(index).toBe(2);
  });
});
