/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Core provisioning logic.
 *
 * Job lifecycle (matches the check constraints in migration 007):
 *   queued -> running -> succeeded/failed
 *
 * Job steps (mirrored in tenant_provisioning_job_steps):
 *   validate_target -> ensure_oauth -> create_project -> wait_healthy ->
 *   install_migrations -> install_seeds -> initialize_tenant ->
 *   verify_template -> activate_tenant
 *
 * The provider is injected explicitly. This module never constructs a
 * provider and never falls back to MockProvider.
 */

import type { PlatformDb } from "./db";
import {
  ProjectNotReadyError,
  ProjectStateError,
  ProvisioningError,
  ReauthorizationRequiredError,
  TemplateChecksumError,
  ValidationError,
} from "./errors";
import type { ProvisioningProvider } from "./provider";
import { redactError } from "./redaction";
import {
  loadTemplateBundle,
  type TemplateBundle,
  type TemplateFile,
} from "./template-loader";
import type {
  ConnectionRow,
  JobRow,
  OrganizationRow,
  ProviderContext,
  StoreRow,
} from "./types";

export {
  ProjectNotReadyError,
  ProjectStateError,
  ProvisioningError,
  ReauthorizationRequiredError,
  TemplateChecksumError,
  ValidationError,
} from "./errors";
export type {
  ConnectionRow,
  JobRow,
  JobStepRow,
  OrganizationRow,
  ProviderContext,
  StoreRow,
} from "./types";

export const EXPECTED_MIGRATION_COUNT = 15;
export const EXPECTED_SEED_COUNT = 4;
export const EXPECTED_VERIFICATION_COUNT = 3;

export function sanitizeError(error: unknown): string {
  return redactError(error);
}

/**
 * Validate the canonical template bundle before any SQL is applied.
 * Counts are intentionally fixed: a bundle with a different shape must not be
 * installed into a tenant.
 */
export function assertTemplateBundle(bundle: TemplateBundle): void {
  if (bundle.migrations.length !== EXPECTED_MIGRATION_COUNT) {
    throw new TemplateChecksumError(
      `Expected ${EXPECTED_MIGRATION_COUNT} migrations, found ${bundle.migrations.length}`
    );
  }
  if (bundle.seeds.length !== EXPECTED_SEED_COUNT) {
    throw new TemplateChecksumError(
      `Expected ${EXPECTED_SEED_COUNT} seeds, found ${bundle.seeds.length}`
    );
  }
  if (bundle.verification.length !== EXPECTED_VERIFICATION_COUNT) {
    throw new TemplateChecksumError(
      `Expected ${EXPECTED_VERIFICATION_COUNT} verification files, found ${bundle.verification.length}`
    );
  }

  const validateFiles = (files: TemplateFile[]): void => {
    for (const file of files) {
      if (!file.version || !file.file || !file.sql) {
        throw new TemplateChecksumError("Template bundle contains an empty entry");
      }
      if (!/^[a-f0-9]{64}$/.test(file.checksum)) {
        throw new TemplateChecksumError(
          `Template file ${file.file} has an invalid checksum`
        );
      }
    }
  };

  validateFiles(bundle.migrations);
  validateFiles(bundle.seeds);
  validateFiles(bundle.verification);
}

/**
 * Claim the next queued provisioning job atomically.
 * Uses SKIP LOCKED so concurrent workers cannot claim the same job.
 */
export async function claimJob(
  db: PlatformDb,
  workerId: string
): Promise<JobRow | null> {
  void workerId;

  const row = await db.queryOne<JobRow>(
    `
      UPDATE public.tenant_provisioning_jobs
      SET status = 'running',
          current_step = 'validate_target',
          progress = 0,
          updated_at = now()
      WHERE id = (
        SELECT id
        FROM public.tenant_provisioning_jobs
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, organization_id, store_id, connection_id,
                idempotency_key, status, current_step, progress,
                error_code, error_message, created_at, updated_at
    `
  );

  if (!row) return null;

  await recordStep(
    db,
    row.id,
    "validate_target",
    "running",
    "Validating target organization and store"
  );

  return row;
}

async function recordStep(
  db: PlatformDb,
  jobId: string,
  step: string,
  status: "running",
  message: string | null = null
): Promise<void> {
  await db.query(
    `
      INSERT INTO public.tenant_provisioning_job_steps (
        job_id, step, status, message, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, now(), now())
    `,
    [jobId, step, status, message]
  );
}

async function updateLatestStep(
  db: PlatformDb,
  jobId: string,
  step: string,
  status: "succeeded" | "failed",
  message: string | null
): Promise<void> {
  await db.query(
    `
      UPDATE public.tenant_provisioning_job_steps
      SET status = $2,
          message = $3,
          updated_at = now()
      WHERE id = (
        SELECT id
        FROM public.tenant_provisioning_job_steps
        WHERE job_id = $1
          AND step = $4
        ORDER BY created_at DESC
        LIMIT 1
      )
    `,
    [jobId, status, message, step]
  );
}

export async function completeStep(
  db: PlatformDb,
  jobId: string,
  step: string,
  message?: string
): Promise<void> {
  await updateLatestStep(db, jobId, step, "succeeded", message ?? null);
}

export async function failStep(
  db: PlatformDb,
  jobId: string,
  step: string,
  message: string
): Promise<void> {
  await updateLatestStep(db, jobId, step, "failed", message);
}

async function runStep<T>(
  db: PlatformDb,
  jobId: string,
  step: string,
  fn: () => Promise<T>
): Promise<T> {
  await recordStep(db, jobId, step, "running");
  try {
    const result = await fn();
    await completeStep(db, jobId, step);
    return result;
  } catch (error) {
    await failStep(db, jobId, step, sanitizeError(error));
    throw error;
  }
}

/**
 * Mark the job terminal. Status values must match the lowercase check
 * constraint in migration 007.
 */
export async function finishJob(
  db: PlatformDb,
  jobId: string,
  status: "succeeded" | "failed" | "needs_reauthorization",
  progress: number,
  errorCode: string | null,
  errorMessage: string | null
): Promise<void> {
  await db.query(
    `
      UPDATE public.tenant_provisioning_jobs
      SET status = $2,
          progress = $3,
          error_code = $4,
          error_message = $5,
          updated_at = now()
      WHERE id = $1
    `,
    [jobId, status, progress, errorCode, errorMessage]
  );
}

async function countStepAttempts(
  db: PlatformDb,
  jobId: string,
  step: string
): Promise<number> {
  const row = await db.queryOne<{ count: string | number }>(
    `
      SELECT count(*)::int AS count
      FROM public.tenant_provisioning_job_steps
      WHERE job_id = $1
        AND step = $2
    `,
    [jobId, step]
  );

  if (!row) return 0;
  const parsed = Number(row.count);
  return Number.isFinite(parsed) ? parsed : 0;
}

function contextFor(
  env: { db: PlatformDb },
  job: JobRow,
  metadata: Record<string, unknown> = {}
): ProviderContext {
  return {
    env,
    jobId: job.id,
    storeId: job.store_id,
    organizationId: job.organization_id,
    connectionId: job.connection_id,
    metadata,
  };
}

export interface ExecuteJobOptions {
  provider: ProvisioningProvider;
  allowMock?: boolean;
  templateBundle?: TemplateBundle;
  maxAttempts?: number;
}

/**
 * Execute a provisioning job end-to-end using an injected provider.
 *
 * Mock is rejected before any database mutation unless allowMock is set. Even
 * then, MockProvider methods themselves never touch the platform database.
 *
 * Returns the terminal status of the job. All database writes (including
 * markFailed and finishJob) happen inside this function so that the provider
 * context (which carries the resolved projectRef) is available to markFailed.
 */
export async function executeJob(
  env: { db: PlatformDb },
  job: JobRow,
  options: ExecuteJobOptions
): Promise<{
  status: "succeeded" | "failed" | "needs_reauthorization" | "requeued";
}> {
  const { db } = env;
  const provider = options.provider;

  if (provider.isMock && options.allowMock !== true) {
    throw new ProvisioningError(
      "MOCK_MODE_DISABLED",
      "MOCK mode cannot execute real provisioning jobs. Use allowMock: true only in isolated unit tests.",
      false
    );
  }

  // Declared outside try/catch so markFailed can access ctx.projectRef
  // even when an error occurs after create_project has set it.
  let ctx!: ProviderContext;

  try {
    const loaded = await runStep(db, job.id, "validate_target", async () => {
      const organization = await db.queryOne<OrganizationRow>(
        `
          SELECT id, name, slug, currency, timezone, country
          FROM public.organizations
          WHERE id = $1
        `,
        [job.organization_id]
      );

      const store = await db.queryOne<StoreRow>(
        `
          SELECT id, organization_id, name, slug, status, metadata
          FROM public.stores
          WHERE id = $1
        `,
        [job.store_id]
      );

      const connection = job.connection_id
        ? await db.queryOne<ConnectionRow>(
            `
              SELECT id, organization_id, supabase_organization_id,
                     supabase_organization_slug, account_name, connection_status
              FROM public.supabase_connections
              WHERE id = $1
            `,
            [job.connection_id]
          )
        : null;

      if (!organization || !store) {
        throw new ValidationError(
          "Job references a missing organization or store"
        );
      }
      if (job.connection_id && !connection) {
        throw new ValidationError("Job references a missing Supabase connection");
      }
      if (!connection && !provider.isMock) {
        throw new ValidationError(
          "Managed provisioning requires a Supabase connection"
        );
      }

      const metadata =
        store.metadata && typeof store.metadata === "object"
          ? store.metadata
          : {};
      const ctx = contextFor(env, job, metadata);
      await provider.validateTarget(ctx, organization, store, connection);

      return { organization, store, connection, ctx };
    });

    const { organization, store, connection } = loaded;
    ctx = loaded.ctx;

    await runStep(db, job.id, "ensure_oauth", async () => {
      await provider.ensureOAuth(ctx, connection);
    });

    const project = await runStep(db, job.id, "create_project", async () => {
      return provider.createProject(ctx, store, connection, ctx.metadata);
    });

    ctx.projectRef = project.projectRef;

    await runStep(db, job.id, "wait_healthy", async () => {
      await provider.waitForHealthy(ctx, project.projectRef);
    });

    const templateBundle: TemplateBundle =
      options.templateBundle ?? loadTemplateBundle();
    assertTemplateBundle(templateBundle);

    await runStep(db, job.id, "install_migrations", async () => {
      await provider.installMigrations(
        ctx,
        project.projectRef,
        templateBundle.migrations
      );
    });

    await runStep(db, job.id, "install_seeds", async () => {
      await provider.installSeeds(ctx, project.projectRef, templateBundle.seeds);
    });

    await runStep(db, job.id, "initialize_tenant", async () => {
      await provider.initializeTenant(ctx, project.projectRef, ctx.metadata);
    });

    await runStep(db, job.id, "verify_template", async () => {
      await provider.verifyTemplate(
        ctx,
        project.projectRef,
        templateBundle.verification,
        templateBundle.migrations
      );
    });

    await runStep(db, job.id, "activate_tenant", async () => {
      await provider.activateTenant(ctx, project.projectRef);
    });

    await finishJob(db, job.id, "succeeded", 100, null, null);
    void organization;
    return { status: "succeeded" };
  } catch (error) {
    const message = sanitizeError(error);

    if (error instanceof ReauthorizationRequiredError) {
      await finishJob(
        db,
        job.id,
        "needs_reauthorization",
        0,
        "OAUTH_REAUTHORIZATION_REQUIRED",
        message
      );
      return { status: "needs_reauthorization" };
    }

    if (error instanceof ProjectNotReadyError) {
      const attempts = await countStepAttempts(db, job.id, "wait_healthy");
      const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
      if (attempts < maxAttempts) {
        await db.query(
          `
            UPDATE public.tenant_provisioning_jobs
            SET status = 'queued',
                current_step = 'wait_healthy',
                progress = 0,
                error_code = null,
                error_message = null,
                updated_at = now()
            WHERE id = $1
          `,
          [job.id]
        );
        return { status: "requeued" };
      }
    }

    // ctx is in scope here because it was declared in the try block above.
    // If create_project succeeded, ctx.projectRef is set; otherwise undefined.
    let tenantRecordError: unknown = undefined;
    try {
      await options.provider.markFailed?.(ctx, error);
    } catch (markErr) {
      tenantRecordError = markErr;
    }

    const code =
      error instanceof TemplateChecksumError
        ? "TEMPLATE_CHECKSUM_MISMATCH"
        : error instanceof ValidationError
          ? "VALIDATION_FAILED"
          : error instanceof ProjectNotReadyError
            ? "PROJECT_NOT_READY"
            : error instanceof ProjectStateError
              ? "PROJECT_TERMINAL_STATE"
              : (error as { code?: string }).code
                ? `PROVISIONING_${(error as { code: string }).code}`
                : "PROVISIONING_FAILED";

    await finishJob(db, job.id, "failed", 0, code, message);

    if (tenantRecordError) {
      const combined = new AggregateError(
        [error as Error, tenantRecordError as Error],
        `Provisioning failed for job ${job.id} and tenant record update also failed`
      );
      console.error(
        `Worker error: Provisioning failed: ${sanitizeError(
          (error as Error).message ?? String(error)
        )} | Tenant record update failed: ${sanitizeError(
          (tenantRecordError as Error).message ?? String(tenantRecordError)
        )} | Combined: ${sanitizeError(combined.message)}`
      );
    }

    return { status: "failed" };
  }
}

export interface ClaimAndRunOptions {
  provider: ProvisioningProvider;
  templateBundle?: TemplateBundle;
  maxAttempts?: number;
}

export interface ClaimAndRunResult {
  jobId: string;
  status: "succeeded" | "failed" | "needs_reauthorization" | "requeued";
}

/**
 * Claim and run the next queued job.
 *
 * Mock is rejected unconditionally here: the polling loop is production code.
 */
export async function claimAndRunOne(
  env: { db: PlatformDb },
  workerId: string,
  options: ClaimAndRunOptions
): Promise<ClaimAndRunResult | null> {
  const db = env.db;

  if (options.provider.isMock) {
    throw new ProvisioningError(
      "MOCK_MODE_DISABLED",
      "MOCK mode cannot claim or run real queue jobs.",
      false
    );
  }

  const job = await claimJob(db, workerId);
  if (!job) return null;

  const result = await executeJob(env, job, options);

  return {
    jobId: job.id,
    status: result.status,
  };
}
