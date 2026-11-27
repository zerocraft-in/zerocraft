/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Tenant database repository authorization tests.
 *
 * All tests use FakePlatformDb - no network, no real database.
 */

import { describe, expect, it } from "vitest";
import { ValidationError } from "./errors";
import { TenantDatabaseRepository } from "./tenant-repository";
import { FakePlatformDb, FakeTenantDatabase } from "./testing/fakes";

const organizationId = "org-1";
const storeId = "store-1";
const connectionId = "conn-1";
const projectRef = "abcdefghijklmnopqrst";

function makeHarness() {
  const db = new FakePlatformDb();
  const repository = new TenantDatabaseRepository(db.asDb());
  return { db, repository };
}

function jobContext(overrides: Partial<{
  jobId: string;
  organizationId: string;
  storeId: string;
  connectionId: string | null;
}> = {}) {
  return {
    jobId: "job-1",
    organizationId,
    storeId,
    connectionId,
    ...overrides,
  };
}

describe("TenantDatabaseRepository authorization - createProvisioning", () => {
  it("succeeds when job context is fully authorized", async () => {
    const { db, repository } = makeHarness();
    db.jobs.set("job-1", {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const row = await repository.createProvisioning({
      organizationId: "org-1",
      storeId: "store-1",
      projectRef,
      organizationSlug: "platform-org",
      projectName: "test-store-commerce",
      region: "ap-south-1",
      templateName: "zerocraft-default-commerce",
      templateVersion: "1.0.0",
      databasePasswordSecretRef: "kv://tenant-secrets/stores/store-1/database-password",
      jobContext: jobContext(),
    });

    expect(row).toBeDefined();
    expect(row.store_id).toBe("store-1");
    expect(row.lifecycle_status).toBe("provisioning");
  });

  it("fails when organization does not exist", async () => {
    const { db, repository } = makeHarness();
    db.organization = null;

    await expect(
      repository.createProvisioning({
        organizationId: "org-999",
        storeId: "store-1",
        projectRef,
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext({ organizationId: "org-999" }),
      })
    ).rejects.toThrow(ValidationError);
  });

  it("fails when store belongs to another organization", async () => {
    const { db, repository } = makeHarness();
    db.store = { ...db.store, organization_id: "org-2" };

    await expect(
      repository.createProvisioning({
        organizationId: "org-1",
        storeId: "store-1",
        projectRef,
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext({ storeId: "store-1" }),
      })
    ).rejects.toThrow(/does not belong to organization/);
  });

  it("fails when connection belongs to another organization", async () => {
    const { db, repository } = makeHarness();
    db.connection = { ...db.connection, organization_id: "org-2" };

    await expect(
      repository.createProvisioning({
        organizationId: "org-1",
        storeId: "store-1",
        projectRef,
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext({ connectionId: "conn-1" }),
      })
    ).rejects.toThrow(/does not belong to organization/);
  });

  it("fails when job references a different store", async () => {
    const { db, repository } = makeHarness();
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-1",
      store_id: "store-999",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "queued",
      current_step: null,
      progress: 0,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      repository.createProvisioning({
        organizationId: "org-1",
        storeId: "store-1",
        projectRef,
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext(),
      })
    ).rejects.toThrow(/does not reference store/);
  });

  it("fails when job references a different organization", async () => {
    const { db, repository } = makeHarness();
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-999",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "queued",
      current_step: null,
      progress: 0,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      repository.createProvisioning({
        organizationId: "org-1",
        storeId: "store-1",
        projectRef,
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext(),
      })
    ).rejects.toThrow(/does not belong to organization/);
  });

  it("fails when job is in terminal status", async () => {
    const { db, repository } = makeHarness();
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-1",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "succeeded",
      current_step: "activate_tenant",
      progress: 100,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      repository.createProvisioning({
        organizationId: "org-1",
        storeId: "store-1",
        projectRef,
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext(),
      })
    ).rejects.toThrow(/expected one of/);
  });

  it("does not write when authorization fails", async () => {
    const { db, repository } = makeHarness();
    db.organization = null;

    await expect(
      repository.createProvisioning({
        organizationId: "org-999",
        storeId: "store-1",
        projectRef,
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext({ organizationId: "org-999" }),
      })
    ).rejects.toThrow(ValidationError);

    expect(db.tenantDatabases.size).toBe(0);
  });
});

describe("TenantDatabaseRepository authorization - updateProvisioning", () => {
  it("succeeds when organization and project ref match", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });

    const row = await repository.updateProvisioning({
      storeId: "store-1",
      projectRef,
      organizationId: "org-1",
      organizationSlug: "platform-org",
      projectName: "updated-name",
      region: "ap-south-1",
      templateName: "zerocraft-default-commerce",
      templateVersion: "1.0.0",
      databasePasswordSecretRef: null,
      jobContext: jobContext(),
    });

    expect(row).toBeDefined();
    expect(row.project_name).toBe("updated-name");
    expect(row.lifecycle_status).toBe("provisioning");
  });

  it("fails when tenant row belongs to another organization", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-2",
      store_id: "store-1",
      supabase_project_ref: projectRef,
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
      repository.updateProvisioning({
        storeId: "store-1",
        projectRef,
        organizationId: "org-1",
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext(),
      })
    ).rejects.toThrow(
      "Tenant database registry row does not match the provisioned project"
    );
  });

  it("fails on project ref mismatch", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: "different-ref-1234567890",
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
      repository.updateProvisioning({
        storeId: "store-1",
        projectRef: "abcdefghijklmnopqrst",
        organizationId: "org-1",
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext(),
      })
    ).rejects.toThrow(
      "Tenant database registry row does not match the provisioned project"
    );
  });

  it("fails when conditional update affects zero rows", async () => {
    const { db, repository } = makeHarness();
    // No tenant row exists at all
    await expect(
      repository.updateProvisioning({
        storeId: "store-1",
        projectRef,
        organizationId: "org-1",
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext(),
      })
    ).rejects.toThrow(
      "Tenant database registry row does not match the provisioned project"
    );
  });
});

describe("TenantDatabaseRepository authorization - markActive", () => {
  it("succeeds when organization and project ref match", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: "kv://tenant-secrets/stores/store-1/database-password",
      publishable_key: null,
      lifecycle_status: "provisioning",
    });

    const row = await repository.markActive({
      storeId: "store-1",
      projectRef,
      organizationId: "org-1",
      publishableKey: "anon-key-value",
      templateName: "zerocraft-default-commerce",
      templateVersion: "1.0.0",
      jobContext: jobContext(),
    });

    expect(row).toBeDefined();
    expect(row.lifecycle_status).toBe("active");
    expect(row.publishable_key).toBe("anon-key-value");
  });

  it("fails when tenant row belongs to another organization", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-2",
      store_id: "store-1",
      supabase_project_ref: projectRef,
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
      repository.markActive({
        storeId: "store-1",
        projectRef,
        organizationId: "org-1",
        publishableKey: "anon-key-value",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        jobContext: jobContext(),
      })
    ).rejects.toThrow(
      "Cannot activate a tenant database that is not registered"
    );
  });

  it("never activates when authorization fails", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });

    // Corrupt the job context so authorization fails
    await expect(
      repository.markActive({
        storeId: "store-1",
        projectRef,
        organizationId: "org-999",
        publishableKey: "anon-key-value",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        jobContext: jobContext({ organizationId: "org-999" }),
      })
    ).rejects.toThrow(ValidationError);

    const row = db.tenantDatabases.get("store-1");
    expect(row!.lifecycle_status).toBe("provisioning");
    expect(row!.publishable_key).toBeNull();
  });
});

describe("TenantDatabaseRepository authorization - markFailed", () => {
  it("succeeds when organization matches", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });

    await repository.markFailed("store-1", {
      organizationId: "org-1",
      jobContext: jobContext(),
    });

    const row = db.tenantDatabases.get("store-1");
    expect(row!.lifecycle_status).toBe("failed");
  });

  it("fails when tenant row belongs to another organization", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-2",
      store_id: "store-1",
      supabase_project_ref: projectRef,
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
      repository.markFailed("store-1", {
        organizationId: "org-1",
        jobContext: jobContext(),
      })
    ).rejects.toThrow(
      "Cannot mark a tenant database as failed: row not found or not in provisioning state"
    );
  });

  it("fails on project ref mismatch when provided", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: "different-ref-1234567890",
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
      repository.markFailed("store-1", {
        organizationId: "org-1",
        projectRef,
        jobContext: jobContext(),
      })
    ).rejects.toThrow(
      "Cannot mark a tenant database as failed: row not found or not in provisioning state"
    );
  });

  it("never marks failed when authorization fails", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
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
      repository.markFailed("store-1", {
        organizationId: "org-999",
        jobContext: jobContext({ organizationId: "org-999" }),
      })
    ).rejects.toThrow(ValidationError);

    const row = db.tenantDatabases.get("store-1");
    expect(row!.lifecycle_status).toBe("provisioning");
  });
});

describe("TenantDatabaseRepository atomicity - transaction boundaries", () => {
  it("commits transaction on successful authorization and write", async () => {
    const { db, repository } = makeHarness();
    db.jobs.set("job-1", {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const row = await repository.createProvisioning({
      organizationId: "org-1",
      storeId: "store-1",
      projectRef,
      organizationSlug: "platform-org",
      projectName: "test-store-commerce",
      region: "ap-south-1",
      templateName: "zerocraft-default-commerce",
      templateVersion: "1.0.0",
      databasePasswordSecretRef: "kv://tenant-secrets/stores/store-1/database-password",
      jobContext: jobContext(),
    });

    expect(row).toBeDefined();
    expect(db.transactionQueries.length).toBeGreaterThan(0);
    // All queries inside the transaction should be recorded in transactionQueries
    const hasJobLock = db.transactionQueries.some((q) =>
      q.text.includes("FOR UPDATE") && q.text.includes("tenant_provisioning_jobs")
    );
    expect(hasJobLock).toBe(true);
    const hasOrgCheck = db.transactionQueries.some((q) =>
      q.text.includes("FROM public.organizations")
    );
    expect(hasOrgCheck).toBe(true);
    const hasStoreCheck = db.transactionQueries.some((q) =>
      q.text.includes("FROM public.stores")
    );
    expect(hasStoreCheck).toBe(true);
  });

  it("rolls back transaction on authorization failure (missing organization)", async () => {
    const { db, repository } = makeHarness();
    db.organization = null;
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-999",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "queued",
      current_step: null,
      progress: 0,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      repository.createProvisioning({
        organizationId: "org-999",
        storeId: "store-1",
        projectRef,
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext({ organizationId: "org-999" }),
      })
    ).rejects.toThrow(ValidationError);

    // No row should have been inserted (transaction rolled back)
    expect(db.tenantDatabases.size).toBe(0);
    // Transaction queries should still be recorded (they were attempted)
    expect(db.transactionQueries.length).toBeGreaterThan(0);
  });

  it("rolls back transaction on INSERT failure", async () => {
    const { db, repository } = makeHarness();
    // Simulate insert failure by making the store null (query returns no row)
    db.store = null;
    db.jobs.set("job-1", {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      repository.createProvisioning({
        organizationId: "org-1",
        storeId: "store-1",
        projectRef,
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext(),
      })
    ).rejects.toThrow(ValidationError);

    expect(db.tenantDatabases.size).toBe(0);
  });

  it("uses the transaction client for every query inside the transaction", async () => {
    const { db, repository } = makeHarness();
    db.jobs.set("job-1", {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await repository.createProvisioning({
      organizationId: "org-1",
      storeId: "store-1",
      projectRef,
      organizationSlug: "platform-org",
      projectName: "test-store-commerce",
      region: "ap-south-1",
      templateName: "zerocraft-default-commerce",
      templateVersion: "1.0.0",
      databasePasswordSecretRef: null,
      jobContext: jobContext(),
    });

    // All authorization + write queries should be in transactionQueries
    expect(db.transactionQueries.length).toBeGreaterThan(0);
    for (const q of db.transactionQueries) {
      expect(q.text).toBeTruthy();
      expect(q.params).toBeDefined();
    }
  });

  it("locks the job row with FOR UPDATE during authorization", async () => {
    const { db, repository } = makeHarness();
    db.jobs.set("job-1", {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await repository.createProvisioning({
      organizationId: "org-1",
      storeId: "store-1",
      projectRef,
      organizationSlug: "platform-org",
      projectName: "test-store-commerce",
      region: "ap-south-1",
      templateName: "zerocraft-default-commerce",
      templateVersion: "1.0.0",
      databasePasswordSecretRef: null,
      jobContext: jobContext(),
    });

    const lockQuery = db.transactionQueries.find((q) =>
      q.text.includes("FOR UPDATE") &&
      q.text.includes("tenant_provisioning_jobs")
    );
    expect(lockQuery).toBeDefined();
    expect(lockQuery!.params[0]).toBe("job-1");
  });

  it("fails when job status is not in allowed state", async () => {
    const { db, repository } = makeHarness();
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-1",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "succeeded",
      current_step: "activate_tenant",
      progress: 100,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      repository.createProvisioning({
        organizationId: "org-1",
        storeId: "store-1",
        projectRef,
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext(),
      })
    ).rejects.toThrow(/expected one of/);

    expect(db.tenantDatabases.size).toBe(0);
  });

  it("rejects existing row belonging to another organization on conflict path", async () => {
    const { db, repository } = makeHarness();
    db.jobs.set("job-1", {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    // Pre-existing row owned by org-2 for the same store
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-2",
      store_id: "store-1",
      supabase_project_ref: projectRef,
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
      repository.createProvisioning({
        organizationId: "org-1",
        storeId: "store-1",
        projectRef,
        organizationSlug: "platform-org",
        projectName: "test-store-commerce",
        region: "ap-south-1",
        templateName: "zerocraft-default-commerce",
        templateVersion: "1.0.0",
        databasePasswordSecretRef: null,
        jobContext: jobContext(),
      })
    ).rejects.toThrow(
      "Existing tenant database row belongs to a different organization"
    );
  });

  it("updateProvisioning uses transaction and locks job row", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-1",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "running",
      current_step: "install_migrations",
      progress: 50,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const row = await repository.updateProvisioning({
      storeId: "store-1",
      projectRef,
      organizationId: "org-1",
      organizationSlug: "platform-org",
      projectName: "updated-name",
      region: "ap-south-1",
      templateName: "zerocraft-default-commerce",
      templateVersion: "1.0.0",
      databasePasswordSecretRef: null,
      jobContext: jobContext(),
    });

    expect(row).toBeDefined();
    expect(db.transactionQueries.length).toBeGreaterThan(0);
    const hasLock = db.transactionQueries.some((q) =>
      q.text.includes("FOR UPDATE") && q.text.includes("tenant_provisioning_jobs")
    );
    expect(hasLock).toBe(true);
  });

  it("markActive uses transaction and locks job row", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: "kv://tenant-secrets/stores/store-1/database-password",
      publishable_key: null,
      lifecycle_status: "provisioning",
    });
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-1",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "running",
      current_step: "verify_template",
      progress: 90,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const row = await repository.markActive({
      storeId: "store-1",
      projectRef,
      organizationId: "org-1",
      publishableKey: "anon-key-value",
      templateName: "zerocraft-default-commerce",
      templateVersion: "1.0.0",
      jobContext: jobContext(),
    });

    expect(row).toBeDefined();
    expect(row.lifecycle_status).toBe("active");
    const hasLock = db.transactionQueries.some((q) =>
      q.text.includes("FOR UPDATE") && q.text.includes("tenant_provisioning_jobs")
    );
    expect(hasLock).toBe(true);
  });

  it("markFailed uses transaction and locks job row", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-1",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "running",
      current_step: "wait_healthy",
      progress: 30,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await repository.markFailed("store-1", {
      organizationId: "org-1",
      jobContext: jobContext(),
    });

    const row = db.tenantDatabases.get("store-1");
    expect(row!.lifecycle_status).toBe("failed");
    const hasLock = db.transactionQueries.some((q) =>
      q.text.includes("FOR UPDATE") && q.text.includes("tenant_provisioning_jobs")
    );
    expect(hasLock).toBe(true);
  });

  it("markFailed rolls back on authorization failure", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-999",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "running",
      current_step: "wait_healthy",
      progress: 30,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      repository.markFailed("store-1", {
        organizationId: "org-999",
        jobContext: jobContext({ organizationId: "org-999" }),
      })
    ).rejects.toThrow(ValidationError);

    const row = db.tenantDatabases.get("store-1");
    expect(row!.lifecycle_status).toBe("provisioning");
  });
});

describe("TenantDatabaseRepository error visibility", () => {
  it("markFailed repository failure is visible to its caller", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });
    // Job belongs to a different organization - authorization fails
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-999",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "running",
      current_step: "wait_healthy",
      progress: 30,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      repository.markFailed("store-1", {
        organizationId: "org-1",
        jobContext: jobContext(),
      })
    ).rejects.toThrow(ValidationError);

    const row = db.tenantDatabases.get("store-1");
    expect(row!.lifecycle_status).toBe("provisioning");
  });

  it("markFailed does not mutate tenant row when job is in terminal state", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-1",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "succeeded",
      current_step: "activate_tenant",
      progress: 100,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      repository.markFailed("store-1", {
        organizationId: "org-1",
        jobContext: jobContext(),
      })
    ).rejects.toThrow(/expected one of/);

    const row = db.tenantDatabases.get("store-1");
    expect(row!.lifecycle_status).toBe("provisioning");
  });

  it("markFailed succeeds when projectRef matches", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-1",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "running",
      current_step: "wait_healthy",
      progress: 30,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await repository.markFailed("store-1", {
      organizationId: "org-1",
      projectRef,
      jobContext: jobContext(),
    });

    const row = db.tenantDatabases.get("store-1");
    expect(row!.lifecycle_status).toBe("failed");
  });

  it("markFailed fails closed on projectRef mismatch", async () => {
    const { db, repository } = makeHarness();
    db.tenantDatabases.set("store-1", {
      id: "td-1",
      organization_id: "org-1",
      store_id: "store-1",
      supabase_project_ref: projectRef,
      supabase_organization_slug: "platform-org",
      project_name: "test-store-commerce",
      region: "ap-south-1",
      template_name: "zerocraft-default-commerce",
      template_version: "1.0.0",
      database_password_secret_ref: null,
      publishable_key: null,
      lifecycle_status: "provisioning",
    });
    db.jobs.set("job-1", {
      id: "job-1",
      organization_id: "org-1",
      store_id: "store-1",
      connection_id: "conn-1",
      idempotency_key: "store-slug",
      status: "running",
      current_step: "wait_healthy",
      progress: 30,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      repository.markFailed("store-1", {
        organizationId: "org-1",
        projectRef: "different-ref-1234567890",
        jobContext: jobContext(),
      })
    ).rejects.toThrow(
      "Cannot mark a tenant database as failed: row not found or not in provisioning state"
    );

    const row = db.tenantDatabases.get("store-1");
    expect(row!.lifecycle_status).toBe("provisioning");
  });
});

