/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Configuration tests.
 *
 * These tests only mutate process.env inside the test process. They do not
 * read real credentials or start the worker.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig, redactSecret } from "./config";

const ORIGINAL_ENV = { ...process.env };

const REQUIRED = {
  SUPABASE_PLATFORM_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  SUPABASE_PLATFORM_SERVICE_ROLE_KEY: "service-role-key",
};

const MANAGED = {
  ...REQUIRED,
  TENANT_PROVISIONER_PROVIDER_MODE: "managed",
  SUPABASE_MANAGEMENT_ACCESS_TOKEN: "sbp_token_value",
  TENANT_PROVISIONING_ORGANIZATION_ID: "sup-org-1",
  TENANT_PROVISIONING_REGION: "ap-south-1",
  TENANT_PROVISIONING_COMPUTE_SIZE: "micro",
  TENANT_SECRETS_DIR: "C:\\temp\\tenant-secrets",
  TENANT_SECRETS_ENCRYPTION_KEY: "a".repeat(44),
};

function applyEnv(values: Record<string, string | undefined>): void {
  for (const key of [
    "SUPABASE_PLATFORM_URL",
    "SUPABASE_PLATFORM_SERVICE_ROLE_KEY",
    "TENANT_PROVISIONER_PROVIDER_MODE",
    "TENANT_PROVISIONER_ALLOW_MOCK",
    "SUPABASE_MANAGEMENT_ACCESS_TOKEN",
    "SUPABASE_MANAGEMENT_PAT",
    "TENANT_PROVISIONING_ORGANIZATION_ID",
    "TENANT_PROVISIONING_ORGANIZATION_SLUG",
    "TENANT_PROVISIONING_REGION",
    "TENANT_PROVISIONING_COMPUTE_SIZE",
    "TENANT_SECRETS_DIR",
    "TENANT_SECRETS_ENCRYPTION_KEY",
    "TENANT_ALLOWED_REGIONS",
  ]) {
    delete process.env[key];
  }
  Object.assign(process.env, values);
}

beforeEach(() => {
  applyEnv({});
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("loadConfig", () => {
  it("defaults to disabled and never enables provisioning implicitly", () => {
    applyEnv(REQUIRED);
    const config = loadConfig();
    expect(config.providerMode).toBe("disabled");
    expect(config.allowMock).toBe(false);
  });

  it("requires the platform connection variables", () => {
    applyEnv({});
    expect(() => loadConfig()).toThrow(/SUPABASE_PLATFORM_URL/);
  });

  it("rejects an unknown provider mode", () => {
    applyEnv({ ...REQUIRED, TENANT_PROVISIONER_PROVIDER_MODE: "auto" });
    expect(() => loadConfig()).toThrow(/Invalid TENANT_PROVISIONER_PROVIDER_MODE/);
  });

  it("requires allowMock for mock mode", () => {
    applyEnv({ ...REQUIRED, TENANT_PROVISIONER_PROVIDER_MODE: "mock" });
    expect(() => loadConfig()).toThrow(/TENANT_PROVISIONER_ALLOW_MOCK/);
  });

  it("accepts mock mode only with allowMock", () => {
    applyEnv({
      ...REQUIRED,
      TENANT_PROVISIONER_PROVIDER_MODE: "mock",
      TENANT_PROVISIONER_ALLOW_MOCK: "true",
    });
    expect(loadConfig().providerMode).toBe("mock");
  });

  it("fails closed when managed configuration is missing", () => {
    applyEnv({
      ...REQUIRED,
      TENANT_PROVISIONER_PROVIDER_MODE: "managed",
    });
    expect(() => loadConfig()).toThrow(/SUPABASE_MANAGEMENT_ACCESS_TOKEN/);
  });

  it("accepts a complete managed configuration", () => {
    applyEnv(MANAGED);
    const config = loadConfig();
    expect(config.providerMode).toBe("managed");
    expect(config.management.organizationId).toBe("sup-org-1");
    expect(config.management.region).toBe("ap-south-1");
    expect(config.management.computeSize).toBe("micro");
    expect(config.management.baseUrl).toBe("https://api.supabase.com");
  });

  it("rejects a region outside the allowed list", () => {
    applyEnv({
      ...MANAGED,
      TENANT_ALLOWED_REGIONS: "eu-west-1,us-east-1",
    });
    expect(() => loadConfig()).toThrow(/not in TENANT_ALLOWED_REGIONS/);
  });

  it("parses comma-separated protected project refs", () => {
    applyEnv({
      ...MANAGED,
      TENANT_PROTECTED_PROJECT_REFS: "ref1, ref2",
    });
    expect(loadConfig().management.protectedProjectRefs).toEqual([
      "ref1",
      "ref2",
    ]);
  });
});

describe("redactSecret", () => {
  it("never returns a full secret", () => {
    const redacted = redactSecret("super-secret-value");
    expect(redacted).not.toBe("super-secret-value");
    expect(redacted).toContain("****");
  });

  it("handles short and empty values", () => {
    expect(redactSecret("short")).toBe("****");
    expect(redactSecret(undefined)).toBe("");
  });
});
