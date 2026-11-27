/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Main entry point.
 *
 * Claims and processes tenant provisioning jobs from the platform database.
 *
 * Provider selection is explicit and fail-closed:
 *   TENANT_PROVISIONER_PROVIDER_MODE = disabled | mock | managed
 *
 * The entry point always runs with runtime "production". MockProvider is
 * therefore rejected here even when it is requested explicitly.
 *
 * Environment variables:
 *   SUPABASE_PLATFORM_URL      - Platform PostgreSQL connection URL (required)
 *   SUPABASE_PLATFORM_SERVICE_ROLE_KEY - Service role key (required)
 *   TENANT_PROVISIONER_PROVIDER_MODE - disabled | mock | managed (default: disabled)
 *   TENANT_PROVISIONER_ALLOW_MOCK - must be "true" for mock mode
 *   SUPABASE_MANAGEMENT_ACCESS_TOKEN - Management API token (managed mode)
 *   TENANT_PROVISIONING_ORGANIZATION_ID - Platform-owned Supabase org (managed)
 *   TENANT_PROVISIONING_REGION - Explicit tenant region (managed)
 *   TENANT_PROVISIONING_COMPUTE_SIZE - Explicit tenant compute size (managed)
 *   TENANT_SECRETS_DIR / TENANT_SECRETS_ENCRYPTION_KEY - Tenant secret store
 *   WORKER_ID                  - Unique worker identifier (default: tenant-provisioner-local-1)
 *   TENANT_PROVISIONER_POLL_INTERVAL_MS - Poll interval (default: 5000)
 *   TENANT_PROVISIONER_MAX_POLLS   - Max polls before idle exit (default: 12)
 *   LOG_LEVEL                    - Log level: debug, info, warn, error (default: info)
 */

import { PlatformDb } from "./db";
import { loadConfig, redactSecret } from "./config";
import {
  ProviderDisabledError,
  MockProviderNotAllowedError,
  ProviderConfigurationError,
} from "./errors";
import {
  createProvider,
  type ProvisioningProvider,
} from "./provider";
import {
  createConsoleProviderLogger,
  StaticManagementTokenProvider,
  type SupabaseManagedProviderConfig,
} from "./providers/supabase-managed-provider";
import { redactSecrets } from "./redaction";
import {
  EncryptedFileTenantSecretStore,
  makeSingleKeyRing,
  parseKeyRingFromEnv,
} from "./secrets";
import { claimAndRunOne } from "./worker";

function safePlatformUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.password) url.password = "****";
    return url.toString();
  } catch {
    return redactSecrets(value);
  }
}

function buildProvider(config: ReturnType<typeof loadConfig>): ProvisioningProvider {
  if (config.providerMode === "disabled") {
    throw new ProviderDisabledError(
      "Tenant provisioning is disabled. Set TENANT_PROVISIONER_PROVIDER_MODE to enable it."
    );
  }

  if (config.providerMode === "mock") {
    // createProvider rejects this because runtime is production.
    return createProvider(
      { mode: "mock" },
      { runtime: "production", allowMock: false }
    );
  }

  const management = config.management;
  if (
    !management.accessToken ||
    !management.organizationId ||
    !management.region ||
    !management.computeSize
  ) {
    throw new ProviderConfigurationError(
      "Managed provider mode is missing required configuration"
    );
  }

  if (!config.secretsDir) {
    throw new ProviderConfigurationError(
      "Managed provider mode requires TENANT_SECRETS_DIR"
    );
  }

  // Build the key ring. Prefer the new multi-key configuration; fall back to
  // the backward-compatible single-key format.
  let keyRing: ReturnType<typeof parseKeyRingFromEnv> | ReturnType<
    typeof makeSingleKeyRing
  >;
  if (config.secretsActiveKeyId) {
    keyRing = parseKeyRingFromEnv();
  } else if (config.secretsEncryptionKey) {
    keyRing = makeSingleKeyRing(config.secretsEncryptionKey);
  } else {
    throw new ProviderConfigurationError(
      "Managed provider mode requires TENANT_SECRETS_ACTIVE_KEY_ID or TENANT_SECRETS_ENCRYPTION_KEY"
    );
  }

  const secretStore = new EncryptedFileTenantSecretStore(
    config.secretsDir,
    keyRing.entries,
    {
      activeKeyId: keyRing.activeKeyId,
      legacyKeyId: keyRing.legacyKeyId,
    }
  );

  const managed: SupabaseManagedProviderConfig = {
    organizationId: management.organizationId,
    organizationSlug: management.organizationSlug,
    region: management.region,
    computeSize: management.computeSize,
    templateName: "zerocraft-default-commerce",
    templateVersion: "1.0.0",
    tokenProvider: new StaticManagementTokenProvider(management.accessToken),
    secretStore,
    baseUrl: management.baseUrl,
    requestTimeoutMs: management.requestTimeoutMs,
    maxRetries: management.maxRetries,
    retryBaseDelayMs: management.retryBaseDelayMs,
    retryMaxDelayMs: management.retryMaxDelayMs,
    readinessTimeoutMs: management.readinessTimeoutMs,
    readinessPollIntervalMs: management.readinessPollIntervalMs,
    protectedProjectRefs: management.protectedProjectRefs,
    allowedRegions:
      management.allowedRegions.length > 0
        ? management.allowedRegions
        : undefined,
    logger: createConsoleProviderLogger(),
  };

  return createProvider(
    { mode: "managed", managed },
    { runtime: "production", allowMock: false }
  );
}

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error(`Configuration error: ${redactSecrets((error as Error).message)}`);
    process.exit(1);
  }

  let provider: ProvisioningProvider;
  try {
    provider = buildProvider(config);
  } catch (error) {
    if (
      error instanceof ProviderDisabledError ||
      error instanceof MockProviderNotAllowedError ||
      error instanceof ProviderConfigurationError
    ) {
      console.error(`Provider error: ${redactSecrets((error as Error).message)}`);
      process.exit(error instanceof ProviderDisabledError ? 0 : 1);
    }
    throw error;
  }

  console.log(`[${new Date().toISOString()}] Tenant Provisioner Worker starting...`);
  console.log(`[${new Date().toISOString()}] Worker ID: ${config.workerId}`);
  console.log(`[${new Date().toISOString()}] Provider: ${provider.name}`);
  console.log(`[${new Date().toISOString()}] Platform URL: ${safePlatformUrl(config.platformUrl)}`);
  console.log(
    `[${new Date().toISOString()}] Service Role Key: ${redactSecret(config.serviceRoleKey)}`
  );
  console.log(`[${new Date().toISOString()}] Poll interval: ${config.pollIntervalMs}ms`);
  console.log(`[${new Date().toISOString()}] Max polls: ${config.maxPolls}`);

  const platformUrl = new URL(config.platformUrl);
  const db = new PlatformDb({
    host: platformUrl.hostname,
    port: Number(platformUrl.port || "5432"),
    user: platformUrl.username || "postgres",
    password: platformUrl.password || config.serviceRoleKey,
    database: platformUrl.pathname.replace(/^\//, "") || "postgres",
  });

  try {
    let polls = 0;
    while (polls < config.maxPolls) {
      polls++;
      const result = await claimAndRunOne({ db }, config.workerId, {
        provider,
      });

      if (result) {
        console.log(
          `[${new Date().toISOString()}] Job ${result.jobId}: ${result.status}`
        );
        polls = 0;
      } else if (polls < config.maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
      }
    }

    if (polls >= config.maxPolls) {
      console.log(
        `[${new Date().toISOString()}] No jobs found after ${config.maxPolls} polls. Exiting.`
      );
    }
  } catch (error) {
    console.error(
      `Worker error: ${redactSecrets((error as Error).message)}`,
      redactSecrets((error as Error).stack ?? "")
    );
    process.exit(1);
  } finally {
    await db.close();
  }

  console.log(`[${new Date().toISOString()}] Tenant Provisioner Worker stopped.`);
}

main().catch((error) => {
  console.error(`Fatal error: ${redactSecrets((error as Error).message)}`);
  process.exit(1);
});
