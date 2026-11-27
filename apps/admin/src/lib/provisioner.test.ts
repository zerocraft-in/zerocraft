import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ProvisionerError,
  startSupabaseOAuth,
  getPendingOAuthSession,
  finalizeSupabaseOAuth,
  startProvisioningJob,
} from "./provisioner";

const originalEnv = {
  TENANT_PROVISIONER_URL: process.env.TENANT_PROVISIONER_URL,
  TENANT_PROVISIONER_SHARED_SECRET: process.env.TENANT_PROVISIONER_SHARED_SECRET,
};

afterEach(() => {
  process.env.TENANT_PROVISIONER_URL = originalEnv.TENANT_PROVISIONER_URL;
  process.env.TENANT_PROVISIONER_SHARED_SECRET = originalEnv.TENANT_PROVISIONER_SHARED_SECRET;
  vi.restoreAllMocks();
});

function setProvisionerEnv(sharedSecret: string) {
  process.env.TENANT_PROVISIONER_URL = "http://localhost:8787";
  process.env.TENANT_PROVISIONER_SHARED_SECRET = sharedSecret;
}

function unsetProvisionerEnv() {
  process.env.TENANT_PROVISIONER_URL = "http://localhost:8787";
  delete process.env.TENANT_PROVISIONER_SHARED_SECRET;
}

describe("Provisioner - shared secret configuration", () => {
  it("startSupabaseOAuth throws ProvisionerError when shared secret is missing", async () => {
    unsetProvisionerEnv();

    await expect(
      startSupabaseOAuth({
        organizationId: "org-1",
        userAccessToken: "user-token",
        returnTo: "https://admin.test/callback",
      })
    ).rejects.toBeInstanceOf(ProvisionerError);
  });

  it("startSupabaseOAuth throws ProvisionerError with clear message when shared secret is missing", async () => {
    unsetProvisionerEnv();

    try {
      await startSupabaseOAuth({
        organizationId: "org-1",
        userAccessToken: "user-token",
        returnTo: "https://admin.test/callback",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisionerError);
      const e = err as ProvisionerError;
      expect(e.message).toBe("TENANT_PROVISIONER_SHARED_SECRET is not configured");
      // The message must not contain the secret value itself
      expect(e.message).not.toContain("shared-secret");
    }
  });

  it("getPendingOAuthSession throws ProvisionerError when shared secret is missing", async () => {
    unsetProvisionerEnv();

    await expect(
      getPendingOAuthSession({ state: "state-1", userAccessToken: "user-token" })
    ).rejects.toBeInstanceOf(ProvisionerError);
  });

  it("finalizeSupabaseOAuth throws ProvisionerError when shared secret is missing", async () => {
    unsetProvisionerEnv();

    await expect(
      finalizeSupabaseOAuth({
        state: "state-1",
        supabaseOrganizationId: "sup-org-1",
        userAccessToken: "user-token",
      })
    ).rejects.toBeInstanceOf(ProvisionerError);
  });

  it("startProvisioningJob throws ProvisionerError when shared secret is missing", async () => {
    unsetProvisionerEnv();

    await expect(startProvisioningJob("job-1")).rejects.toBeInstanceOf(
      ProvisionerError
    );
  });
});

describe("Provisioner - shared secret configuration with valid secret", () => {
  it("startSupabaseOAuth includes Bearer authorization header with shared secret", async () => {
    setProvisionerEnv("test-shared-secret-12345");

    let capturedHeaders: Record<string, string> | undefined;
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string> | undefined;
      return new Response(JSON.stringify({ authorizeUrl: "https://supabase.test/authorize", scopes: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    try {
      const result = await startSupabaseOAuth({
        organizationId: "org-1",
        userAccessToken: "user-access-token",
        returnTo: "https://admin.test/callback",
      });

      expect(result.authorizeUrl).toBe("https://supabase.test/authorize");
      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders?.authorization).toBe("Bearer test-shared-secret-12345");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("authorization header never exposes the secret in error messages", async () => {
    unsetProvisionerEnv();

    try {
      await startSupabaseOAuth({
        organizationId: "org-1",
        userAccessToken: "user-token",
        returnTo: "https://admin.test/callback",
      });
    } catch (err) {
      const e = err as ProvisionerError;
      // Error message must not contain any secret value
      expect(e.message).not.toMatch(/[a-zA-Z0-9+/=]{20,}/);
      expect(e.message).toBe("TENANT_PROVISIONER_SHARED_SECRET is not configured");
    }
  });

  it("getPendingOAuthSession includes shared secret in authorization header", async () => {
    setProvisionerEnv("test-shared-secret-67890");

    let capturedHeaders: Record<string, string> | undefined;
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string> | undefined;
      return new Response(JSON.stringify({ organizationId: "org-1", organizations: [], expiresAt: "2026-01-01T00:00:00Z" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    try {
      await getPendingOAuthSession({ state: "state-1", userAccessToken: "user-token" });

      expect(capturedHeaders?.authorization).toBe("Bearer test-shared-secret-67890");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("finalizeSupabaseOAuth includes shared secret in authorization header", async () => {
    setProvisionerEnv("test-shared-secret-abcde");

    let capturedHeaders: Record<string, string> | undefined;
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string> | undefined;
      return new Response(JSON.stringify({ connectionId: "conn-1", organization: { id: "sup-org-1", name: "Test Org", slug: "test-org" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    try {
      await finalizeSupabaseOAuth({
        state: "state-1",
        supabaseOrganizationId: "sup-org-1",
        userAccessToken: "user-token",
      });

      expect(capturedHeaders?.authorization).toBe("Bearer test-shared-secret-abcde");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("startProvisioningJob includes shared secret in authorization header", async () => {
    setProvisionerEnv("test-shared-secret-fghij");

    let capturedHeaders: Record<string, string> | undefined;
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string> | undefined;
      return new Response(JSON.stringify({}), { status: 200 });
    }) as unknown as typeof fetch;

    try {
      await startProvisioningJob("job-1");

      expect(capturedHeaders?.authorization).toBe("Bearer test-shared-secret-fghij");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
