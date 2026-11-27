/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Persistence for public.tenant_databases.
 *
 * The repository uses the columns that migration 013 actually creates. It
 * deliberately does not call the broken public.upsert_tenant_database RPC:
 * that function references connection_id, project_url and health_status,
 * which are not columns on the table. The worker connects directly to the
 * platform database as a trusted service role.
 */

import { PoolClient } from "pg";
import type { PlatformDb } from "./db";
import {
  TenantDatabaseConflictError,
  ValidationError,
} from "./errors";

export type TenantLifecycleStatus =
  | "provisioning"
  | "active"
  | "failed"
  | "archived";

export interface TenantDatabaseRow {
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
  lifecycle_status: TenantLifecycleStatus;
}

export interface CreateTenantDatabaseInput {
  organizationId: string;
  storeId: string;
  projectRef: string;
  organizationSlug: string | null;
  projectName: string;
  region: string;
  templateName: string;
  templateVersion: string;
  databasePasswordSecretRef: string | null;
  jobContext?: JobAuthorizationContext;
}

export interface UpdateTenantDatabaseInput {
  storeId: string;
  projectRef: string;
  organizationId: string;
  organizationSlug: string | null;
  projectName: string;
  region: string;
  templateName: string;
  templateVersion: string;
  databasePasswordSecretRef: string | null;
  jobContext?: JobAuthorizationContext;
}

export interface ActivateTenantDatabaseInput {
  storeId: string;
  projectRef: string;
  organizationId: string;
  publishableKey: string;
  templateName: string;
  templateVersion: string;
  jobContext?: JobAuthorizationContext;
}

/**
 * Authorization context derived from the claimed provisioning job.
 * All privileged tenant_database writes must verify that the claimed job,
 * store, organization, and connection belong together before mutating data.
 */
export interface JobAuthorizationContext {
  jobId: string;
  organizationId: string;
  storeId: string;
  connectionId: string | null;
}

/**
 * Minimal client interface usable both by PlatformDb and by a pg PoolClient
 * inside a transaction. Every query inside a transaction must use this
 * interface so authorization reads and writes share the same transaction.
 */
type TxClient = {
  query(text: string, params?: unknown[]): Promise<any>;
  queryOne<T = unknown>(text: string, params?: unknown[]): Promise<T | null>;
};

function asTxClient(client: PoolClient): TxClient {
  return {
    query: (text, params) => client.query(text, params),
    queryOne: async (text, params) => {
      const result = await client.query(text, params);
      return result.rows[0] ?? null;
    },
  };
}

const RETURNING_COLUMNS = `
  id, organization_id, store_id, supabase_project_ref,
  supabase_organization_slug, project_name, region, template_name,
  template_version, database_password_secret_ref, publishable_key,
  lifecycle_status
`;

export class TenantDatabaseRepository {
  constructor(private readonly db: PlatformDb) {}

  /**
   * Validate that the claimed job context is internally consistent and that
   * the referenced organization, store, and connection all belong together.
   * All queries are parameterized and run as the service role.
   */
  async authorizeJobContext(
    ctx: JobAuthorizationContext,
    client: TxClient
  ): Promise<void> {
    const organization = await client.queryOne<{ id: string }>(
      `SELECT id FROM public.organizations WHERE id = $1`,
      [ctx.organizationId]
    );
    if (!organization) {
      throw new ValidationError(
        `Organization ${ctx.organizationId} does not exist`
      );
    }

    const store = await client.queryOne<{ id: string; organization_id: string }>(
      `SELECT id, organization_id FROM public.stores WHERE id = $1`,
      [ctx.storeId]
    );
    if (!store) {
      throw new ValidationError(`Store ${ctx.storeId} does not exist`);
    }
    if (store.organization_id !== ctx.organizationId) {
      throw new ValidationError(
        `Store ${ctx.storeId} does not belong to organization ${ctx.organizationId}`
      );
    }

    if (ctx.connectionId) {
      const connection = await client.queryOne<{
        id: string;
        organization_id: string;
      }>(
        `SELECT id, organization_id FROM public.supabase_connections WHERE id = $1`,
        [ctx.connectionId]
      );
      if (!connection) {
        throw new ValidationError(
          `Supabase connection ${ctx.connectionId} does not exist`
        );
      }
      if (connection.organization_id !== ctx.organizationId) {
        throw new ValidationError(
          `Supabase connection ${ctx.connectionId} does not belong to organization ${ctx.organizationId}`
        );
      }
    }

    const job = await client.queryOne<{
      id: string;
      organization_id: string;
      store_id: string;
      connection_id: string | null;
      status: string;
    }>(
      `SELECT id, organization_id, store_id, connection_id, status
       FROM public.tenant_provisioning_jobs
       WHERE id = $1
       FOR UPDATE`,
      [ctx.jobId]
    );
    if (!job) {
      throw new ValidationError(`Provisioning job ${ctx.jobId} does not exist`);
    }
    if (job.organization_id !== ctx.organizationId) {
      throw new ValidationError(
        `Job ${ctx.jobId} does not belong to organization ${ctx.organizationId}`
      );
    }
    if (job.store_id !== ctx.storeId) {
      throw new ValidationError(
        `Job ${ctx.jobId} does not reference store ${ctx.storeId}`
      );
    }
    if (job.connection_id !== ctx.connectionId) {
      throw new ValidationError(
        `Job ${ctx.jobId} does not reference connection ${ctx.connectionId}`
      );
    }
    const allowedStatuses = ["queued", "running"];
    if (!allowedStatuses.includes(job.status)) {
      throw new ValidationError(
        `Job ${ctx.jobId} is in status ${job.status}, expected one of ${allowedStatuses.join(", ")}`
      );
    }
  }

  async findByStore(storeId: string): Promise<TenantDatabaseRow | null> {
    return this.db.queryOne<TenantDatabaseRow>(
      `
        SELECT ${RETURNING_COLUMNS}
        FROM public.tenant_databases
        WHERE store_id = $1
        LIMIT 1
      `,
      [storeId]
    );
  }

  async createProvisioning(
    input: CreateTenantDatabaseInput
  ): Promise<TenantDatabaseRow> {
    return this.db.transaction(async (poolClient) => {
      const tx = asTxClient(poolClient);

      if (input.jobContext) {
        await tx.queryOne(
          `SELECT id FROM public.tenant_provisioning_jobs
           WHERE id = $1
           FOR UPDATE`,
          [input.jobContext.jobId]
        );
        await this.authorizeJobContext(input.jobContext, tx);
      }

      const result = await tx.query(
        `
        INSERT INTO public.tenant_databases (
          organization_id,
          store_id,
          supabase_project_ref,
          supabase_organization_slug,
          project_name,
          region,
          template_name,
          template_version,
          database_password_secret_ref,
          publishable_key,
          lifecycle_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, 'provisioning')
        ON CONFLICT (store_id) DO NOTHING
        RETURNING ${RETURNING_COLUMNS}
        `,
        [
          input.organizationId,
          input.storeId,
          input.projectRef,
          input.organizationSlug,
          input.projectName,
          input.region,
          input.templateName,
          input.templateVersion,
          input.databasePasswordSecretRef,
        ]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Conflict: a row already exists for this store. Verify ownership before
      // taking the update path. Never silently accept a row from another org.
      const existing = await tx.queryOne<TenantDatabaseRow>(
        `
        SELECT ${RETURNING_COLUMNS}
        FROM public.tenant_databases
        WHERE store_id = $1
        `,
        [input.storeId]
      );

      if (!existing) {
        throw new TenantDatabaseConflictError(
          "Unable to persist the tenant database registry row"
        );
      }

      if (existing.organization_id !== input.organizationId) {
        throw new TenantDatabaseConflictError(
          "Existing tenant database row belongs to a different organization"
        );
      }

      if (existing.supabase_project_ref !== input.projectRef) {
        throw new TenantDatabaseConflictError(
          "A different Supabase project is already registered for this store"
        );
      }

      return this.updateProvisioningOnTx(tx, input);
    });
  }

  /**
   * Internal update path used within an existing transaction. Does NOT start
   * its own transaction to avoid nested transactions.
   */
  private async updateProvisioningOnTx(
    tx: TxClient,
    input: UpdateTenantDatabaseInput
  ): Promise<TenantDatabaseRow> {
    const row = await tx.queryOne<TenantDatabaseRow>(
      `
        UPDATE public.tenant_databases
        SET supabase_organization_slug = $3,
            project_name = $4,
            region = $5,
            template_name = $6,
            template_version = $7,
            database_password_secret_ref = COALESCE(
              $8,
              database_password_secret_ref
            ),
            lifecycle_status = 'provisioning',
            updated_at = now()
        WHERE store_id = $1
          AND supabase_project_ref = $2
          AND organization_id = $9
        RETURNING ${RETURNING_COLUMNS}
      `,
      [
        input.storeId,
        input.projectRef,
        input.organizationSlug,
        input.projectName,
        input.region,
        input.templateName,
        input.templateVersion,
        input.databasePasswordSecretRef,
        input.organizationId,
      ]
    );

    if (!row) {
      throw new TenantDatabaseConflictError(
        "Tenant database registry row does not match the provisioned project"
      );
    }

    return row;
  }

  async updateProvisioning(
    input: UpdateTenantDatabaseInput
  ): Promise<TenantDatabaseRow> {
    return this.db.transaction(async (poolClient) => {
      const tx = asTxClient(poolClient);

      if (input.jobContext) {
        await tx.queryOne(
          `SELECT id FROM public.tenant_provisioning_jobs
           WHERE id = $1
           FOR UPDATE`,
          [input.jobContext.jobId]
        );
        await this.authorizeJobContext(input.jobContext, tx);
      }

      return this.updateProvisioningOnTx(tx, input);
    });
  }

  async markActive(
    input: ActivateTenantDatabaseInput
  ): Promise<TenantDatabaseRow> {
    return this.db.transaction(async (poolClient) => {
      const tx = asTxClient(poolClient);

      if (input.jobContext) {
        await tx.queryOne(
          `SELECT id FROM public.tenant_provisioning_jobs
           WHERE id = $1
           FOR UPDATE`,
          [input.jobContext.jobId]
        );
        await this.authorizeJobContext(input.jobContext, tx);
      }

      const row = await tx.queryOne<TenantDatabaseRow>(
        `
        UPDATE public.tenant_databases
        SET lifecycle_status = 'active',
            publishable_key = $3,
            template_name = $4,
            template_version = $5,
            updated_at = now()
        WHERE store_id = $1
          AND supabase_project_ref = $2
          AND organization_id = $6
        RETURNING ${RETURNING_COLUMNS}
      `,
        [
          input.storeId,
          input.projectRef,
          input.publishableKey,
          input.templateName,
          input.templateVersion,
          input.organizationId,
        ]
      );

      if (!row) {
        throw new TenantDatabaseConflictError(
          "Cannot activate a tenant database that is not registered"
        );
      }

      return row;
    });
  }

  async markFailed(
    storeId: string,
    options: {
      organizationId: string;
      projectRef?: string;
      jobContext?: JobAuthorizationContext;
    }
  ): Promise<void> {
    return this.db.transaction(async (poolClient) => {
      const tx = asTxClient(poolClient);

      if (options.jobContext) {
        await tx.queryOne(
          `SELECT id FROM public.tenant_provisioning_jobs
           WHERE id = $1
           FOR UPDATE`,
          [options.jobContext.jobId]
        );
        await this.authorizeJobContext(options.jobContext, tx);
      }

      const params: unknown[] = [storeId, options.organizationId];
      let projectRefPredicate = "";
      if (options.projectRef) {
        params.push(options.projectRef);
        projectRefPredicate = `AND supabase_project_ref = $${params.length}`;
      }

      const result = await tx.query(
        `
        UPDATE public.tenant_databases
        SET lifecycle_status = 'failed',
            updated_at = now()
        WHERE store_id = $1
          AND organization_id = $2
          ${projectRefPredicate}
          AND lifecycle_status = 'provisioning'
      `,
        params
      );

      if (result.rowCount === 0) {
        throw new TenantDatabaseConflictError(
          "Cannot mark a tenant database as failed: row not found or not in provisioning state"
        );
      }
    });
  }
}
