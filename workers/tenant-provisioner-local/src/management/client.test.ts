/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Management API client tests.
 *
 * Every test injects a fake transport. No test opens a network connection.
 */

import { describe, expect, it, vi } from "vitest";
import {
  ManagementApiClient,
  type ManagementHttpResponse,
  type ManagementTransport,
} from "./client";
import {
  ManagementApiError,
  ManagementApiResponseError,
  ManagementApiTimeoutError,
} from "./errors";

function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): ManagementHttpResponse {
  const lower = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => lower.get(name.toLowerCase()) ?? null },
    text: async () =>
      typeof body === "string" ? body : JSON.stringify(body),
  };
}

function clientWith(
  transport: ManagementTransport,
  overrides: Partial<ConstructorParameters<typeof ManagementApiClient>[0]> = {}
): ManagementApiClient {
  return new ManagementApiClient({
    accessToken: "sbp_test_token_value",
    transport,
    maxRetries: 2,
    retryBaseDelayMs: 1,
    retryMaxDelayMs: 10,
    sleep: async () => undefined,
    ...overrides,
  });
}

describe("ManagementApiClient", () => {
  it("creates a project with the platform organization, region and compute size", async () => {
    const transport = vi.fn(async () =>
      response(201, {
        ref: "abcdefghijklmnopqrst",
        id: "abcdefghijklmnopqrst",
        name: "test-store-commerce",
        organization_id: "sup-org-1",
        region: "ap-south-1",
        status: "COMING_UP",
      })
    );

    const client = clientWith(transport);
    const project = await client.createProject({
      name: "test-store-commerce",
      organizationId: "sup-org-1",
      organizationSlug: "platform-org",
      region: "ap-south-1",
      computeSize: "micro",
      dbPassword: "super-secret-password",
    });

    expect(project.ref).toBe("abcdefghijklmnopqrst");
    expect(transport).toHaveBeenCalledTimes(1);

    const [url, request] = transport.mock.calls[0]!;
    expect(url).toBe("https://api.supabase.com/v1/projects");
    expect(request.method).toBe("POST");
    expect(request.headers.authorization).toBe("Bearer sbp_test_token_value");

    const body = JSON.parse(request.body!);
    expect(body.organization_id).toBe("sup-org-1");
    expect(body.organization_slug).toBe("platform-org");
    expect(body.region).toBe("ap-south-1");
    expect(body.region_selection).toEqual({ type: "specific", code: "ap-south-1" });
    expect(body.desired_instance_size).toBe("micro");
    expect(body.db_pass).toBe("super-secret-password");
  });

  it("retries HTTP 429 using Retry-After and then succeeds", async () => {
    const sleep = vi.fn(async () => undefined);
    const transport = vi
      .fn<ManagementTransport>()
      .mockResolvedValueOnce(
        response(429, { message: "rate limited" }, { "retry-after": "2" })
      )
      .mockResolvedValueOnce(response(200, []));

    const client = clientWith(transport, { sleep, retryMaxDelayMs: 5000 });
    await expect(client.listProjects()).resolves.toEqual([]);

    expect(transport).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("retries retryable server errors with exponential backoff", async () => {
    const sleep = vi.fn(async () => undefined);
    const transport = vi
      .fn<ManagementTransport>()
      .mockResolvedValueOnce(response(503, { message: "unavailable" }))
      .mockResolvedValueOnce(response(200, []));

    const client = clientWith(transport, { sleep });
    await expect(client.listProjects()).resolves.toEqual([]);

    expect(transport).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1);
  });

  it("does not retry non-retryable client errors", async () => {
    const transport = vi.fn(async () =>
      response(400, { code: "bad_request", message: "invalid region" })
    );

    const client = clientWith(transport);

    await expect(client.listProjects()).rejects.toMatchObject({
      status: 400,
      code: "bad_request",
      retryable: false,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("gives up after the configured retry budget", async () => {
    const transport = vi.fn(async () => response(500, { message: "boom" }));
    const client = clientWith(transport, { maxRetries: 2 });

    await expect(client.listProjects()).rejects.toBeInstanceOf(ManagementApiError);
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it("times out a slow request", async () => {
    const transport: ManagementTransport = (_url, request) =>
      new Promise((_resolve, reject) => {
        request.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });

    const client = clientWith(transport, {
      timeoutMs: 5,
      maxRetries: 0,
    });

    await expect(client.listProjects()).rejects.toBeInstanceOf(
      ManagementApiTimeoutError
    );
  });

  it("rejects invalid JSON responses", async () => {
    const client = clientWith(async () => response(200, "not-json"));
    await expect(client.listProjects()).rejects.toBeInstanceOf(
      ManagementApiResponseError
    );
  });

  it("rejects responses that do not match the expected shape", async () => {
    const client = clientWith(async () => response(200, { projects: [{}] }));
    await expect(client.listProjects()).rejects.toThrow(/project.ref/);
  });

  it("requests API keys with reveal=true", async () => {
    const transport = vi.fn(async () =>
      response(200, [
        { name: "anon", api_key: "anon-key", type: "legacy" },
        { name: "service_role", api_key: "service-key", type: "legacy" },
      ])
    );

    const client = clientWith(transport);
    const keys = await client.getApiKeys("abcdefghijklmnopqrst");

    expect(keys).toHaveLength(2);
    expect(transport.mock.calls[0]![0]).toBe(
      "https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/api-keys?reveal=true"
    );
  });

  it("never includes the access token in an error", async () => {
    const client = clientWith(async () =>
      response(401, {
        message: "invalid token sbp_test_token_value",
      })
    );

    let caught: unknown;
    try {
      await client.listProjects();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ManagementApiError);
    expect((caught as Error).message).not.toContain("sbp_test_token_value");
  });

  it("sends migrations to the database migrations endpoint", async () => {
    const transport = vi.fn(async () => response(201, ""));
    const client = clientWith(transport);

    await client.applyMigration("abcdefghijklmnopqrst", {
      name: "commerce/001",
      query: "select 1;",
    });

    expect(transport.mock.calls[0]![0]).toBe(
      "https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/database/migrations"
    );
  });

  it("runs verification queries through the database query endpoint", async () => {
    const transport = vi.fn(async () => response(200, [{ ok: true }]));
    const client = clientWith(transport);

    const result = await client.runQuery(
      "abcdefghijklmnopqrst",
      "select public.commerce_template_health() as health"
    );

    expect(result).toEqual([{ ok: true }]);
    expect(transport.mock.calls[0]![0]).toBe(
      "https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/database/query"
    );
  });

  it("parses ref as the canonical project reference", async () => {
    const transport = vi.fn(async () =>
      response(200, {
        ref: "abcdefghijklmnopqrst",
        id: "some-uuid-value",
        name: "test-project",
        organization_id: "sup-org-1",
        region: "ap-south-1",
        status: "ACTIVE_HEALTHY",
      })
    );

    const client = clientWith(transport);
    const project = await client.getProject("abcdefghijklmnopqrst");

    expect(project.ref).toBe("abcdefghijklmnopqrst");
    expect(project.id).toBe("some-uuid-value");
  });

  it("rejects project response with invalid ref format", async () => {
    const transport = vi.fn(async () =>
      response(200, {
        ref: "invalid-ref-format",
        name: "test-project",
        organization_id: "sup-org-1",
        region: "ap-south-1",
        status: "ACTIVE_HEALTHY",
      })
    );

    const client = clientWith(transport);
    await expect(client.getProject("abcdefghijklmnopqrst")).rejects.toThrow(
      /project.ref/
    );
  });

  it("rejects project response without ref", async () => {
    const transport = vi.fn(async () =>
      response(200, {
        id: "some-uuid-value",
        name: "test-project",
        organization_id: "sup-org-1",
        region: "ap-south-1",
        status: "ACTIVE_HEALTHY",
      })
    );

    const client = clientWith(transport);
    await expect(client.getProject("abcdefghijklmnopqrst")).rejects.toThrow(
      /project.ref/
    );
  });
});
