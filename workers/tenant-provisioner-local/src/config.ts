/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Configuration loading and validation.
 *
 * Provider selection is explicit:
 *   TENANT_PROVISIONER_PROVIDER_MODE = disabled | mock | managed
 *
 * Managed mode requires every value below to be present. Missing values fail
 * closed. Secret values are never logged by this module.
 */

import { SecretStoreError } from "./errors";

export type TenantProviderMode = "disabled" | "mock" | "managed";

export interface ManagementConfig {
  accessToken: string | null;
  organizationId: string | null;
  organizationSlug: string | null;
  region: string | null;
  computeSize: string | null;
  baseUrl: string;
  requestTimeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  readinessTimeoutMs: number;
  readinessPollIntervalMs: number;
  allowedRegions: string[];
  protectedProjectRefs: string[];
}

export interface SecretKeyRingConfig {
  activeKeyId: string;
  legacyKeyId: string | null;
  keyCount: number;
}

export interface WorkerConfig {
  platformUrl: string;
  serviceRoleKey: string;
  workerId: string;
  pollIntervalMs: number;
  maxPolls: number;
  logLevel: string;
  providerMode: TenantProviderMode;
  allowMock: boolean;
  management: ManagementConfig;
  secretsDir: string | null;
  secretsEncryptionKey: string | null;
  secretsActiveKeyId: string | null;
  secretsLegacyKeyId: string | null;
  secretKeyRing: SecretKeyRingConfig | null;
  tenantDbHost: string;
  tenantDbPort: number;
  tenantDbUser: string;
  tenantDbPassword: string;
  tenantDbName: string;
}

function numberFrom(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function csv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseProviderMode(value: string | undefined): TenantProviderMode {
  const mode = (value ?? "disabled").trim().toLowerCase();
  if (mode === "disabled" || mode === "mock" || mode === "managed") {
    return mode;
  }
  throw new Error(
    `Invalid TENANT_PROVISIONER_PROVIDER_MODE: expected disabled, mock or managed`
  );
}

export function loadConfig(): WorkerConfig {
  const required: Record<string, string> = {
    SUPABASE_PLATFORM_URL: process.env.SUPABASE_PLATFORM_URL ?? "",
    SUPABASE_PLATFORM_SERVICE_ROLE_KEY:
      process.env.SUPABASE_PLATFORM_SERVICE_ROLE_KEY ?? "",
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const providerMode = parseProviderMode(
    process.env.TENANT_PROVISIONER_PROVIDER_MODE
  );
  const allowMock =
    (process.env.TENANT_PROVISIONER_ALLOW_MOCK ?? "").toLowerCase() === "true";

  const management: ManagementConfig = {
    accessToken:
      process.env.SUPABASE_MANAGEMENT_ACCESS_TOKEN ??
      process.env.SUPABASE_MANAGEMENT_PAT ??
      null,
    organizationId:
      process.env.TENANT_PROVISIONING_ORGANIZATION_ID ?? null,
    organizationSlug:
      process.env.TENANT_PROVISIONING_ORGANIZATION_SLUG ?? null,
    region: process.env.TENANT_PROVISIONING_REGION ?? null,
    computeSize: process.env.TENANT_PROVISIONING_COMPUTE_SIZE ?? null,
    baseUrl:
      process.env.TENANT_MANAGEMENT_API_BASE_URL ?? "https://api.supabase.com",
    requestTimeoutMs: numberFrom(
      process.env.TENANT_MANAGEMENT_REQUEST_TIMEOUT_MS,
      15_000
    ),
    maxRetries: numberFrom(process.env.TENANT_MANAGEMENT_MAX_RETRIES, 2),
    retryBaseDelayMs: numberFrom(
      process.env.TENANT_MANAGEMENT_RETRY_BASE_DELAY_MS,
      250
    ),
    retryMaxDelayMs: numberFrom(
      process.env.TENANT_MANAGEMENT_RETRY_MAX_DELAY_MS,
      5_000
    ),
    readinessTimeoutMs: numberFrom(
      process.env.TENANT_PROVISIONING_READINESS_TIMEOUT_MS,
      600_000
    ),
    readinessPollIntervalMs: numberFrom(
      process.env.TENANT_PROVISIONING_READINESS_POLL_INTERVAL_MS,
      5_000
    ),
    allowedRegions: csv(process.env.TENANT_ALLOWED_REGIONS),
    protectedProjectRefs: csv(process.env.TENANT_PROTECTED_PROJECT_REFS),
  };

  // Key ring configuration: either the new multi-key format or the
  // backward-compatible single-key format.
  let secretKeyRing: SecretKeyRingConfig | null = null;

  if (providerMode === "mock" && !allowMock) {
    throw new Error(
      "Mock provider mode requires TENANT_PROVISIONER_ALLOW_MOCK=true"
    );
  }

  if (providerMode === "managed") {
    const managedRequired: Record<string, string | null> = {
      SUPABASE_MANAGEMENT_ACCESS_TOKEN: management.accessToken,
      TENANT_PROVISIONING_ORGANIZATION_ID: management.organizationId,
      TENANT_PROVISIONING_REGION: management.region,
      TENANT_PROVISIONING_COMPUTE_SIZE: management.computeSize,
      TENANT_SECRETS_DIR: process.env.TENANT_SECRETS_DIR ?? null,
    };

    for (const [key, value] of Object.entries(managedRequired)) {
      if (!value || !value.trim()) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }

    // Key ring configuration: either the new multi-key format or the
    // backward-compatible single-key format.
    const activeKeyId = process.env.TENANT_SECRETS_ACTIVE_KEY_ID ?? null;
    const legacyKeyId =
      process.env.TENANT_SECRETS_LEGACY_KEY_ID ?? null;
    const singleKey =
      process.env.TENANT_SECRETS_ENCRYPTION_KEY ?? null;

    if (activeKeyId) {
      // Multi-key mode: count TENANT_SECRETS_KEY_<keyId> entries.
      const keyPrefix = "TENANT_SECRETS_KEY_";
      let keyCount = 0;
      for (const envKey of Object.keys(process.env)) {
        if (envKey.startsWith(keyPrefix)) {
          keyCount += 1;
        }
      }

      // Validate that the active key ID corresponds to a present key entry.
      if (keyCount === 0) {
        throw new SecretStoreError(
          "TENANT_SECRETS_ACTIVE_KEY_ID is set but no TENANT_SECRETS_KEY_* entries were found"
        );
      }

      secretKeyRing = {
        activeKeyId: activeKeyId.trim(),
        legacyKeyId: legacyKeyId ? legacyKeyId.trim() : null,
        keyCount,
      };
    } else if (singleKey) {
      // Backward-compatible single-key mode.
      secretKeyRing = {
        activeKeyId: "legacy",
        legacyKeyId: "legacy",
        keyCount: 1,
      };
    } else {
      throw new SecretStoreError(
        "Managed provider mode requires either TENANT_SECRETS_ACTIVE_KEY_ID with TENANT_SECRETS_KEY_* entries, or TENANT_SECRETS_ENCRYPTION_KEY"
      );
    }

    if (
      management.allowedRegions.length > 0 &&
      management.region &&
      !management.allowedRegions.includes(management.region)
    ) {
      throw new Error(
        `TENANT_PROVISIONING_REGION is not in TENANT_ALLOWED_REGIONS`
      );
    }
  }

  return {
    platformUrl: process.env.SUPABASE_PLATFORM_URL!,
    serviceRoleKey: process.env.SUPABASE_PLATFORM_SERVICE_ROLE_KEY!,
    workerId: process.env.WORKER_ID ?? "tenant-provisioner-local-1",
    pollIntervalMs: numberFrom(
      process.env.TENANT_PROVISIONER_POLL_INTERVAL_MS,
      5000
    ),
    maxPolls: numberFrom(process.env.TENANT_PROVISIONER_MAX_POLLS, 12),
    logLevel: process.env.LOG_LEVEL ?? "info",
    providerMode,
    allowMock,
    management,
    secretsDir: process.env.TENANT_SECRETS_DIR ?? null,
    secretsEncryptionKey: process.env.TENANT_SECRETS_ENCRYPTION_KEY ?? null,
    secretsActiveKeyId: process.env.TENANT_SECRETS_ACTIVE_KEY_ID ?? null,
    secretsLegacyKeyId: process.env.TENANT_SECRETS_LEGACY_KEY_ID ?? null,
    secretKeyRing,
    tenantDbHost: process.env.TENANT_DB_HOST ?? "127.0.0.1",
    tenantDbPort: numberFrom(process.env.TENANT_DB_PORT, 54322),
    tenantDbUser: process.env.TENANT_DB_USER ?? "postgres",
    tenantDbPassword: process.env.TENANT_DB_PASSWORD ?? "postgres",
    tenantDbName: process.env.TENANT_DB_NAME ?? "postgres",
  };
}

export function redactSecret(value: string | undefined): string {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return value.slice(0, 4) + "****" + value.slice(-4);
}
