/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Shared row and context types.
 *
 * These interfaces mirror the actual platform schema created by migrations
 * 001-013. Do not add columns here that the migrations do not create.
 */

import type { PlatformDb } from "./db";

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  country: string;
}

export interface StoreRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  status: string;
  metadata: Record<string, unknown>;
}

export interface ConnectionRow {
  id: string;
  organization_id: string;
  supabase_organization_id: string | null;
  supabase_organization_slug: string | null;
  account_name: string | null;
  connection_status: string;
}

export interface JobRow {
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

export interface JobStepRow {
  step: string;
  status: string;
  message: string | null;
}

export interface ProviderContext {
  env: { db: PlatformDb };
  jobId: string;
  storeId: string;
  organizationId: string;
  connectionId: string | null;
  projectRef?: string;
  metadata: Record<string, unknown>;
}

export interface TenantOwner {
  centralUserId: string;
  email: string | null;
  displayName: string;
}
