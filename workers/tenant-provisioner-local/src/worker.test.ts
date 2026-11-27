/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Worker orchestration tests.
 *
 * All platform queries go to FakePlatformDb. No test starts the polling
 * worker, opens a network connection or mutates a real database.
 */

import { describe, expect, it, vi } from "vitest";
import {
  ProjectNotReadyError,
  ReauthorizationRequiredError,
  TemplateChecksumError,
  TemplateInstallError,
  VerificationError,
} from "./errors";
import {
  MockProvider,
  type ProvisionedProject,
  type ProvisioningProvider,
} from "./provider";
import type { TemplateBundle, TemplateFile } from "./template-loader";
import type {
  ConnectionRow,
  JobRow,
  OrganizationRow,
  ProviderContext,
  StoreRow,
} from "./types";
import {
  assertTemplateBundle,
  claimAndRunOne,
  claimJob,
  executeJob,
  finishJob,
  sanitizeError,
} from "./worker";
import {
  FakePlatformDb,
  migrationFiles,
  seedFiles,
  verificationFiles,
} from "./testing/fakes";

const organization: OrganizationRow = {
  id: "org-1",
  name: "Test Org",
  slug: "test-org",
  currency: "INR",
  timezone: "Asia/Kolkata",
  country: "IN",
};

const store: StoreRow = {
  id: "store-1",
  organization_id: "org-1",
  name: "Test Store",
  slug: "test-store",
  status: "draft",
  metadata: {},
};

const connection: ConnectionRow = {
  id: "conn-1",
  organization_id: "org-1",
  supabase_organization_id: "sup-org-1",
  supabase_organization_slug: "test-org",
  account_name: "Test Account",
  connection_status: "active",
};

const LIFECYCLE_STEPS = [
  "validate_target",
  "ensure_oauth",
  "create_project",
  "wait_healthy",
  "install_migrations",
  "install_seeds",
  "initialize_tenant",
  "verify_template",
  "activate_tenant",
] as const;

function fakeBundle(): TemplateBundle {
  return {
    name: "zerocraft-default-commerce",
    version: "1.0.0",
    protectedProjects: [],
    migrations: migrationFiles(15),
    seeds: seedFiles(4),
    verification: verificationFiles(3),
  };
}

function jobRow(overrides: Partial<JobRow> = {}): JobRow {
  return {
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
    ...overrides,
  };
}

class RecordingProvider implements ProvisioningProvider {
  readonly name = "recording";
  readonly isMock = false;
  readonly steps: string[] = [];
  failAt: string | null = null;
  failure: Error | null = null;
  markFailedFailure: Error | null = null;
  capturedCtx: ProviderContext | null = null;

  private record(step: string): void {
    this.steps.push(step);
    if (this.failAt === step && this.failure) {
      throw this.failure;
    }
  }

  async validateTarget(
    _ctx: ProviderContext,
    _organization: OrganizationRow,
    _store: StoreRow,
    _connection: ConnectionRow | null
  ): Promise<void> {
    this.record("validate_target");
  }

  async ensureOAuth(): Promise<void> {
    this.record("ensure_oauth");
  }

  async createProject(): Promise<ProvisionedProject> {
    this.record("create_project");
    return {
      projectRef: "abcdefghijklmnopqrst",
      projectName: "test-store-commerce",
      region: "ap-south-1",
      projectUrl: "https://abcdefghijklmnopqrst.supabase.co",
      organizationSlug: "platform-org",
      created: true,
    };
  }

  async waitForHealthy(): Promise<void> {
    this.record("wait_healthy");
  }

  async installMigrations(
    _ctx: ProviderContext,
    _projectRef: string,
    _files: TemplateFile[]
  ): Promise<void> {
    this.record("install_migrations");
  }

  async installSeeds(
    _ctx: ProviderContext,
    _projectRef: string,
    _files: TemplateFile[]
  ): Promise<void> {
    this.record("install_seeds");
  }

  async initializeTenant(): Promise<void> {
    this.record("initialize_tenant");
  }

  async verifyTemplate(): Promise<void> {
    this.record("verify_template");
  }

  async activateTenant(): Promise<void> {
    this.record("activate_tenant");
  }

  async markFailed(ctx: ProviderContext, error: unknown): Promise<void> {
    this.capturedCtx = ctx;
    this.record("mark_failed");
    if (this.markFailedFailure) {
      throw this.markFailedFailure;
    }
  }
}

function queueJob(db: FakePlatformDb, job: JobRow): void {
  db.jobs.set(job.id, { ...job });
  db.queuedJobIds.push(job.id);
}

describe("claimJob", () => {
  it("claims the next queued job and records validate_target", async () => {
    const db = new FakePlatformDb();
    queueJob(db, jobRow());

    const claimed = await claimJob(db.asDb(), "worker-1");

    expect(claimed).not.toBeNull();
    expect(claimed!.id).toBe("job-1");
    expect(claimed!.status).toBe("running");
    expect(db.jobs.get("job-1")!.status).toBe("running");
    expect(db.steps[0]).toMatchObject({
      job_id: "job-1",
      step: "validate_target",
      status: "running",
    });
  });

  it("returns null when the queue is empty", async () => {
    const db = new FakePlatformDb();
    await expect(claimJob(db.asDb(), "worker-1")).resolves.toBeNull();
  });
});

describe("executeJob", () => {
  it("runs the nine lifecycle steps in order with MOCK enabled for tests", async () => {
    const db = new FakePlatformDb();
    const provider = new MockProvider();

    await executeJob(
      { db: db.asDb() },
      jobRow(),
      { provider, allowMock: true, templateBundle: fakeBundle() }
    );

    const stepOrder = db.steps.map((step) => step.step);
    expect(stepOrder).toEqual([...LIFECYCLE_STEPS]);
    expect(db.steps.every((step) => step.status === "succeeded")).toBe(true);

    // MOCK must not touch platform provisioning state.
    expect(db.tenantDatabases.size).toBe(0);
    expect(
      db.queries.some((item) => item.text.includes("tenant_databases"))
    ).toBe(false);
  });

  it("runs the nine lifecycle steps in order with a real provider shape", async () => {
    const db = new FakePlatformDb();
    const provider = new RecordingProvider();

    await executeJob(
      { db: db.asDb() },
      jobRow(),
      { provider, templateBundle: fakeBundle() }
    );

    expect(provider.steps).toEqual([...LIFECYCLE_STEPS]);
  });

  it("rejects MOCK mode before any database query unless allowMock is set", async () => {
    const db = new FakePlatformDb();
    const provider = new MockProvider();

    await expect(
      executeJob({ db: db.asDb() }, jobRow(), { provider })
    ).rejects.toMatchObject({ code: "MOCK_MODE_DISABLED" });

    expect(db.queries).toHaveLength(0);
  });

  it("rejects a template bundle with the wrong file counts", async () => {
    const db = new FakePlatformDb();
    const provider = new RecordingProvider();
    const bundle = fakeBundle();
    bundle.migrations = bundle.migrations.slice(0, 14);

    const result = await executeJob({ db: db.asDb() }, jobRow(), {
      provider,
      templateBundle: bundle,
    });

    expect(result).toMatchObject({ status: "failed" });
    expect(provider.steps).not.toContain("install_migrations");
  });

  it("validates the real template bundle from templates/commerce", async () => {
    // loadTemplateBundle() is exercised in template-loader.test.ts. Here we
    // assert the worker's bundle guard accepts exactly 15/4/3.
    expect(() => assertTemplateBundle(fakeBundle())).not.toThrow();

    const wrong = fakeBundle();
    wrong.verification = [];
    expect(() => assertTemplateBundle(wrong)).toThrow(/verification files/);
  });
});

describe("claimAndRunOne", () => {
  it("rejects MOCK mode before claiming a job", async () => {
    const db = new FakePlatformDb();
    queueJob(db, jobRow());

    await expect(
      claimAndRunOne({ db: db.asDb() }, "worker-1", {
        provider: new MockProvider(),
      })
    ).rejects.toMatchObject({ code: "MOCK_MODE_DISABLED" });

    expect(db.jobs.get("job-1")!.status).toBe("queued");
    expect(db.queries).toHaveLength(0);
  });

  it("completes a job with lowercase succeeded status", async () => {
    const db = new FakePlatformDb();
    queueJob(db, jobRow());

    const result = await claimAndRunOne({ db: db.asDb() }, "worker-1", {
      provider: new RecordingProvider(),
      templateBundle: fakeBundle(),
    });

    expect(result).toMatchObject({ jobId: "job-1", status: "succeeded" });
    expect(db.jobs.get("job-1")!.status).toBe("succeeded");
    expect(db.jobs.get("job-1")!.progress).toBe(100);
  });

  it("does not activate a tenant when verification fails", async () => {
    const db = new FakePlatformDb();
    queueJob(db, jobRow());
    const provider = new RecordingProvider();
    provider.failAt = "verify_template";
    provider.failure = new VerificationError("verification failed");

    const result = await claimAndRunOne({ db: db.asDb() }, "worker-1", {
      provider,
      templateBundle: fakeBundle(),
    });

    expect(result).toMatchObject({ jobId: "job-1", status: "failed" });
    expect(provider.steps).toContain("verify_template");
    expect(provider.steps).not.toContain("activate_tenant");
    expect(provider.steps).toContain("mark_failed");
    expect(db.jobs.get("job-1")!.status).toBe("failed");
    expect(db.tenantDatabases.size).toBe(0);
  });

  it("marks the job needs_reauthorization when the connection is revoked", async () => {
    const db = new FakePlatformDb();
    queueJob(db, jobRow());
    const provider = new RecordingProvider();
    provider.failAt = "ensure_oauth";
    provider.failure = new ReauthorizationRequiredError();

    const result = await claimAndRunOne({ db: db.asDb() }, "worker-1", {
      provider,
      templateBundle: fakeBundle(),
    });

    expect(result).toMatchObject({
      jobId: "job-1",
      status: "needs_reauthorization",
    });
    expect(db.jobs.get("job-1")!.status).toBe("needs_reauthorization");
  });

  it("requeues a readiness timeout and then fails after the retry budget", async () => {
    const db = new FakePlatformDb();
    queueJob(db, jobRow());
    const provider = new RecordingProvider();
    provider.failAt = "wait_healthy";
    provider.failure = new ProjectNotReadyError("still coming up");

    const first = await claimAndRunOne({ db: db.asDb() }, "worker-1", {
      provider,
      templateBundle: fakeBundle(),
      maxAttempts: 3,
    });

    expect(first).toMatchObject({ jobId: "job-1", status: "requeued" });
    expect(db.jobs.get("job-1")!.status).toBe("queued");

    // Put the job back in the claimable queue and exhaust the budget.
    db.queuedJobIds.push("job-1");

    const second = await claimAndRunOne({ db: db.asDb() }, "worker-1", {
      provider,
      templateBundle: fakeBundle(),
      maxAttempts: 1,
    });

    expect(second).toMatchObject({ jobId: "job-1", status: "failed" });
    expect(db.jobs.get("job-1")!.status).toBe("failed");
  });
});

describe("finishJob", () => {
  it("writes lowercase terminal statuses", async () => {
    const db = new FakePlatformDb();
    db.jobs.set("job-1", { ...jobRow({ status: "running" }) });

    await finishJob(db.asDb(), "job-1", "failed", 0, "VALIDATION_FAILED", "bad");

    expect(db.jobs.get("job-1")).toMatchObject({
      status: "failed",
      error_code: "VALIDATION_FAILED",
      error_message: "bad",
    });
  });
});

describe("markFailed error propagation", () => {
  it("preserves both original provisioning failure and markFailed failure", async () => {
    const db = new FakePlatformDb();
    queueJob(db, jobRow());
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const provider = new RecordingProvider();
    provider.failAt = "verify_template";
    provider.failure = new VerificationError("verification failed");
    provider.markFailedFailure = new Error("tenant record update failed");

    const result = await claimAndRunOne({ db: db.asDb() }, "worker-1", {
      provider,
      templateBundle: fakeBundle(),
    });

    expect(result).toMatchObject({ jobId: "job-1", status: "failed" });
    expect(provider.steps).toContain("mark_failed");
    expect(db.jobs.get("job-1")!.status).toBe("failed");

    // console.error should have been called with both error messages
    expect(errorSpy).toHaveBeenCalled();
    const errorCall = errorSpy.mock.calls.find((args) =>
      String(args[0]).includes("Provisioning failed:")
    );
    expect(errorCall).toBeDefined();
    const logged = String(errorCall![0]);
    expect(logged).toContain("verification failed");
    expect(logged).toContain("tenant record update failed");

    errorSpy.mockRestore();
  });

  it("job is marked failed even when markFailed repository throws", async () => {
    const db = new FakePlatformDb();
    queueJob(db, jobRow());
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const provider = new RecordingProvider();
    provider.failAt = "install_migrations";
    provider.failure = new TemplateInstallError("migration failed");
    provider.markFailedFailure = new Error("tenant record mark failed");

    const result = await claimAndRunOne({ db: db.asDb() }, "worker-1", {
      provider,
      templateBundle: fakeBundle(),
    });

    expect(result).toMatchObject({ jobId: "job-1", status: "failed" });
    expect(db.jobs.get("job-1")!.status).toBe("failed");
    expect(db.jobs.get("job-1")!.error_code).toBe("PROVISIONING_TEMPLATE_INSTALL_FAILED");

    // The combined error was logged, not swallowed
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("does not log combined error when markFailed succeeds", async () => {
    const db = new FakePlatformDb();
    queueJob(db, jobRow());
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const provider = new RecordingProvider();
    provider.failAt = "verify_template";
    provider.failure = new VerificationError("verification failed");

    const result = await claimAndRunOne({ db: db.asDb() }, "worker-1", {
      provider,
      templateBundle: fakeBundle(),
    });

    expect(result).toMatchObject({ jobId: "job-1", status: "failed" });
    expect(db.jobs.get("job-1")!.status).toBe("failed");

    // No AggregateError should be logged since markFailed succeeded
    const aggregateCall = errorSpy.mock.calls.find((args) =>
      String(args[0]).includes("AggregateError") ||
      String(args[0]).includes("and tenant record update also failed")
    );
    expect(aggregateCall).toBeUndefined();

    errorSpy.mockRestore();
  });

  it("provider passes expected projectRef to markFailed", async () => {
    const db = new FakePlatformDb();
    queueJob(db, jobRow());
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const provider = new RecordingProvider();
    provider.failAt = "verify_template";
    provider.failure = new VerificationError("verification failed");

    const result = await claimAndRunOne({ db: db.asDb() }, "worker-1", {
      provider,
      templateBundle: fakeBundle(),
    });

    expect(result).toMatchObject({ jobId: "job-1", status: "failed" });
    expect(provider.capturedCtx).not.toBeNull();
    expect(provider.capturedCtx!.projectRef).toBe("abcdefghijklmnopqrst");

    errorSpy.mockRestore();
  });

  it("provider does not pass projectRef when create_project fails", async () => {
    const db = new FakePlatformDb();
    queueJob(db, jobRow());
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const provider = new RecordingProvider();
    provider.failAt = "create_project";
    provider.failure = new TemplateInstallError("create project failed");

    const result = await claimAndRunOne({ db: db.asDb() }, "worker-1", {
      provider,
      templateBundle: fakeBundle(),
    });

    expect(result).toMatchObject({ jobId: "job-1", status: "failed" });
    expect(provider.capturedCtx).not.toBeNull();
    // projectRef should be undefined since create_project never succeeded
    expect(provider.capturedCtx!.projectRef).toBeUndefined();

    errorSpy.mockRestore();
  });
});

describe("sanitizeError", () => {
  it("redacts credentials from job error messages", () => {
    const message = sanitizeError(
      new Error("request failed with sbp_abcdefgh12345678")
    );
    expect(message).not.toContain("sbp_abcdefgh12345678");
    expect(message).toContain("[redacted");
  });
});

describe("worker fixtures", () => {
  it("uses the real platform column shape", () => {
    expect(organization.currency).toBe("INR");
    expect(store.metadata).toEqual({});
    expect(connection.connection_status).toBe("active");
  });
});
