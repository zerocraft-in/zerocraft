/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Provider factory and secret redaction tests.
 *
 * No provider is ever given a transport that reaches the network.
 */

import { describe, expect, it, vi } from "vitest";
import {
  MockProviderNotAllowedError,
  ProviderConfigurationError,
  ProviderDisabledError,
} from "./errors";
import {
  createProvider,
  MockProvider,
  type ProviderSelection,
} from "./provider";
import {
  StaticManagementTokenProvider,
  SupabaseManagedProvider,
  type SupabaseManagedProviderConfig,
} from "./providers/supabase-managed-provider";
import { redactError, redactSecrets } from "./redaction";
import { InMemoryTenantSecretStore } from "./secrets";
import { FakePlatformDb } from "./testing/fakes";

function managedConfig(
  overrides: Partial<SupabaseManagedProviderConfig> = {}
): SupabaseManagedProviderConfig {
  return {
    organizationId: "sup-org-1",
    region: "ap-south-1",
    computeSize: "micro",
    templateName: "zerocraft-default-commerce",
    templateVersion: "1.0.0",
    tokenProvider: new StaticManagementTokenProvider("sbp_token_value"),
    secretStore: new InMemoryTenantSecretStore(),
    transport: async () => {
      throw new Error("network access is not allowed in this test");
    },
    ...overrides,
  };
}

describe("createProvider", () => {
  it("fails closed when provider mode is disabled", () => {
    expect(() => createProvider()).toThrow(ProviderDisabledError);
    expect(() => createProvider({ mode: "disabled" })).toThrow(
      ProviderDisabledError
    );
  });

  it("rejects MOCK mode in a production runtime", () => {
    expect(() =>
      createProvider({ mode: "mock" }, { runtime: "production", allowMock: true })
    ).toThrow(MockProviderNotAllowedError);
  });

  it("rejects MOCK mode without allowMock even in a test runtime", () => {
    expect(() =>
      createProvider({ mode: "mock" }, { runtime: "test" })
    ).toThrow(MockProviderNotAllowedError);
  });

  it("allows MOCK mode only in a test runtime with allowMock", () => {
    const provider = createProvider(
      { mode: "mock" },
      { runtime: "test", allowMock: true }
    );
    expect(provider).toBeInstanceOf(MockProvider);
    expect(provider.isMock).toBe(true);
  });

  it("rejects managed mode without explicit configuration", () => {
    expect(() => createProvider({ mode: "managed" })).toThrow(
      ProviderConfigurationError
    );
  });

  it("never returns a MockProvider for managed mode", () => {
    const provider = createProvider({
      mode: "managed",
      managed: managedConfig(),
    });

    expect(provider).toBeInstanceOf(SupabaseManagedProvider);
    expect(provider.isMock).toBe(false);
    expect(provider.name).toBe("supabase-managed");
  });

  it("rejects an unknown provider mode", () => {
    expect(() =>
      createProvider({ mode: "auto" } as unknown as ProviderSelection)
    ).toThrow(ProviderConfigurationError);
  });

  it("rejects incomplete managed configuration", () => {
    expect(() =>
      createProvider({
        mode: "managed",
        managed: managedConfig({ organizationId: "" }),
      })
    ).toThrow(/organizationId/);

    expect(() =>
      createProvider({
        mode: "managed",
        managed: managedConfig({ region: "" }),
      })
    ).toThrow(/region/);

    expect(() =>
      createProvider({
        mode: "managed",
        managed: managedConfig({ computeSize: "" }),
      })
    ).toThrow(/computeSize/);
  });

  it("rejects a region outside the allowed list", () => {
    expect(() =>
      createProvider({
        mode: "managed",
        managed: managedConfig({
          region: "eu-west-1",
          allowedRegions: ["ap-south-1"],
        }),
      })
    ).toThrow(/not in the allowed region list/);
  });
});

describe("MockProvider", () => {
  it("never touches the platform database", async () => {
    const provider = new MockProvider();
    const db = new FakePlatformDb();

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
    const ctx = {
      env: { db: db.asDb() },
      jobId: "job-1",
      storeId: "store-1",
      organizationId: "org-1",
      connectionId: "conn-1",
      metadata: {},
    };

    await provider.validateTarget(ctx, organization, store, null);
    await provider.ensureOAuth(ctx, null);
    const project = await provider.createProject(ctx, store, null, {});
    await provider.waitForHealthy(ctx, project.projectRef);
    await provider.installMigrations(ctx, project.projectRef, []);
    await provider.installSeeds(ctx, project.projectRef, []);
    await provider.initializeTenant(ctx, project.projectRef, {});
    await provider.verifyTemplate(ctx, project.projectRef, [], []);
    await provider.activateTenant(ctx, project.projectRef);
    await provider.markFailed!(ctx, new Error("boom"));

    expect(db.queries).toHaveLength(0);
  });
});

describe("redaction", () => {
  it("redacts Supabase tokens, secret keys, JWTs and password fields", () => {
    const message = [
      "token sbp_abcdefgh12345678",
      "secret sb_secret_abcdefgh12345678",
      "jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop",
      "Authorization: Bearer abc.def.ghi",
      'password="hunter2"',
    ].join(" ");

    const redacted = redactSecrets(message);

    expect(redacted).not.toContain("sbp_abcdefgh12345678");
    expect(redacted).not.toContain("sb_secret_abcdefgh12345678");
    expect(redacted).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(redacted).not.toContain("hunter2");
    expect(redacted).toContain("[redacted");
  });

  it("redacts an Error message", () => {
    const redacted = redactError(new Error("failed with sbp_abcdefgh12345678"));
    expect(redacted).not.toContain("sbp_abcdefgh12345678");
  });

  it("redacts the token provider when serialized", () => {
    const tokenProvider = new StaticManagementTokenProvider("sbp_abcdefgh12345678");
    expect(JSON.stringify({ tokenProvider })).not.toContain(
      "sbp_abcdefgh12345678"
    );
    expect(String(tokenProvider)).toBe("[redacted]");
  });

  it("rejects an empty management token", () => {
    expect(() => new StaticManagementTokenProvider("  ")).toThrow(
      ProviderConfigurationError
    );
  });
});

describe("provider logging", () => {
  it("passes redacted fields to the logger", async () => {
    const info = vi.fn();
    const provider = new SupabaseManagedProvider(
      managedConfig({
        logger: { info, warn: vi.fn(), error: vi.fn() },
      })
    );

    const db = new FakePlatformDb();
    const ctx = {
      env: { db: db.asDb() },
      jobId: "job-1",
      storeId: "store-1",
      organizationId: "org-1",
      connectionId: "conn-1",
      metadata: {},
    };

    await provider.validateTarget(
      ctx,
      {
        id: "org-1",
        name: "Test Org",
        slug: "test-org",
        currency: "INR",
        timezone: "Asia/Kolkata",
        country: "IN",
      },
      {
        id: "store-1",
        organization_id: "org-1",
        name: "Test Store",
        slug: "test-store",
        status: "draft",
        metadata: {},
      },
      {
        id: "conn-1",
        organization_id: "org-1",
        supabase_organization_id: "sup-org-1",
        supabase_organization_slug: "test-org",
        account_name: "Test Account",
        connection_status: "active",
      }
    );

    expect(info).toHaveBeenCalled();
    for (const call of info.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("sbp_");
    }
  });
});
