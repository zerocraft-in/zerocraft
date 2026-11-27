/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Typed Supabase Management API contract and runtime validators.
 */

import { ManagementApiResponseError } from "./errors";

export interface SupabaseOrganization {
  id: string;
  name: string;
  slug: string | null;
}

export interface SupabaseProject {
  ref: string;
  id: string | null;
  name: string;
  organizationId: string | null;
  region: string | null;
  status: string | null;
}

export interface SupabaseApiKey {
  name: string;
  apiKey: string;
  type: string | null;
}

export interface CreateProjectInput {
  name: string;
  organizationId: string;
  organizationSlug: string;
  region: string;
  computeSize: string;
  dbPassword: string;
}

export interface ApplyMigrationInput {
  name: string;
  query: string;
}

export interface ManagementApiPort {
  getOrganizations(): Promise<SupabaseOrganization[]>;
  createProject(input: CreateProjectInput): Promise<SupabaseProject>;
  getProject(projectRef: string): Promise<SupabaseProject>;
  listProjects(): Promise<SupabaseProject[]>;
  getApiKeys(projectRef: string): Promise<SupabaseApiKey[]>;
  applyMigration(projectRef: string, input: ApplyMigrationInput): Promise<void>;
  runQuery(projectRef: string, query: string): Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new ManagementApiResponseError(`Invalid ${field} in Management API response`);
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ManagementApiResponseError(`Missing ${field} in Management API response`);
  }
  return value;
}

function unwrapArray(
  value: unknown,
  key: string
): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value[key])) {
    return value[key] as unknown[];
  }
  throw new ManagementApiResponseError(`Expected an array in Management API response`);
}

export function parseOrganizations(value: unknown): SupabaseOrganization[] {
  return unwrapArray(value, "organizations").map((item) => {
    if (!isRecord(item)) {
      throw new ManagementApiResponseError("Invalid organization in Management API response");
    }
    return {
      id: requiredString(item.id, "organization.id"),
      name: requiredString(item.name, "organization.name"),
      slug: optionalString(item.slug, "organization.slug"),
    };
  });
}

export function parseProject(value: unknown): SupabaseProject {
  if (!isRecord(value)) {
    throw new ManagementApiResponseError("Invalid project in Management API response");
  }
  const ref = requiredString(value.ref, "project.ref");
  if (!/^[a-z]{20}$/.test(ref)) {
    throw new ManagementApiResponseError(
      `Invalid project ref in Management API response: ${ref}`
    );
  }
  return {
    ref,
    id: optionalString(value.id, "project.id"),
    name: requiredString(value.name, "project.name"),
    organizationId: optionalString(value.organization_id, "project.organization_id"),
    region: optionalString(value.region, "project.region"),
    status: optionalString(value.status, "project.status"),
  };
}

export function parseProjects(value: unknown): SupabaseProject[] {
  return unwrapArray(value, "projects").map(parseProject);
}


export function parseApiKeys(value: unknown): SupabaseApiKey[] {
  return unwrapArray(value, "api_keys").map((item) => {
    if (!isRecord(item)) {
      throw new ManagementApiResponseError("Invalid API key in Management API response");
    }
    return {
      name: requiredString(item.name, "api_key.name"),
      apiKey: requiredString(item.api_key, "api_key.api_key"),
      type: optionalString(item.type, "api_key.type"),
    };
  });
}

export function parseQueryResult(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.result)) return value.result;
  if (isRecord(value) && Array.isArray(value.rows)) return value.rows;
  return value;
}
