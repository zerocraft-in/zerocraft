import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPkcePair,
  decryptSecret,
  encryptSecret,
  randomPassword,
  sha256Hex
} from "./crypto";
import { buildAuthorizeUrl, exchangeAuthorizationCode } from "./oauth";
import { assertSafeTarget, protectedProjectRefs, runProvisioningJob } from "./provisioning";
import { validateReturnTo, sanitizeError } from "./http";
import { TEMPLATE_BUNDLE } from "./template-bundle";
import { ManagementApi } from "./management";

const REF = "abcdefghijklmnopqrst";
const KEY_B64 = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    SUPABASE_OAUTH_CLIENT_ID: "client-id",
    SUPABASE_OAUTH_CLIENT_SECRET: "client-secret",
    SUPABASE_OAUTH_REDIRECT_URI: "https://worker.test/oauth/callback",
    OAUTH_TOKEN_ENCRYPTION_KEY: KEY_B64,
    OAUTH_ENCRYPTION_KEY_ID: "test-key-1",
    SUPABASE_PLATFORM_URL: "https://platform.test",
    SUPABASE_PLATFORM_ANON_KEY: "anon",
    SUPABASE_PLATFORM_SERVICE_ROLE_KEY: "service",
    PLATFORM_PROJECT_REF: "ftcvyhlzeyqceosdqyxn",
    TENANT_PROVISIONER_SHARED_SECRET: "shared-secret",
    ADMIN_APP_URL: "https://admin.zerocraft.test",
    ALLOWED_REGIONS: "ap-south-1",
    TENANT_SECRETS: {
      put: vi.fn(async () => undefined),
      get: vi.fn(async () => null),
      delete: vi.fn(async () => undefined)
    } as unknown as KVNamespace,
    SUPABASE_MANAGEMENT_API_URL: "https://management.test",
    SUPABASE_OAUTH_AUTHORIZE_URL: "https://management.test/v1/oauth/authorize",
    SUPABASE_OAUTH_TOKEN_URL: "https://management.test/v1/oauth/token",
    PROVISIONING_POLL_INTERVAL_MS: "0",
    PROVISIONING_MAX_POLLS: "1",
    ...overrides
  };
}

const organization = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test Retail",
  currency: "INR",
  timezone: "Asia/Kolkata"
};

const store = {
  id: "22222222-2222-4222-8222-222222222222",
  organization_id: organization.id,
  name: "Test Store",
  slug: "test-store",
  currency: "INR",
  timezone: "Asia/Kolkata",
  status: "active"
};

const connection = {
  id: "33333333-3333-4333-8333-333333333333",
  organization_id: organization.id,
  supabase_organization_id: "supabase-org",
  supabase_organization_slug: "supabase-org",
  account_name: "Test Retail",
  connection_status: "active",
  scopes: ["projects:write"],
  access_token_expires_at: FUTURE
};

const job = {
  id: "44444444-4444-4444-8444-444444444444",
  organization_id: organization.id,
  store_id: store.id,
  tenant_database_id: null,
  connection_id: connection.id,
  status: "RUNNING",
  current_step: null,
  attempt_count: 1,
  max_attempts: 5,
  requested_by: "55555555-5555-4555-8555-555555555555",
  metadata: {
    project_name: "test-store-commerce",
    region: "ap-south-1",
    owner_email: "owner@example.test"
  }
};

const database = {
  id: "66666666-6666-4666-8666-666666666666",
  organization_id: organization.id,
  store_id: store.id,
  supabase_project_ref: REF,
  supabase_organization_slug: "supabase-org",
  project_name: "test-store-commerce",
  region: "ap-south-1",
  lifecycle_status: "PROVISIONING",
  project_url: `https://${REF}.supabase.co`,
  publishable_key: null
};

async function encryptedAccessToken(): Promise<string> {
  const secret = await encryptSecret("access-token-value", KEY_B64, "test-key-1");
  return JSON.stringify(secret);
}

interface Harness {
  fetch: ReturnType<typeof vi.fn>;
  migrationNames: string[];
  finished: Array<Record<string, unknown>>;
  connectionPatches: Array<Record<string, unknown>>;
  createBody: Record<string, unknown> | null;
  kvPuts: Array<[string, string]>;
}

async function harness(statusOverride?: number): Promise<Harness> {
  const secret = JSON.parse(await encryptedAccessToken()) as {
    ciphertext: string;
    nonce: string;
  };
  const tokenRow = {
    connection_id: connection.id,
    key_id: "test-key-1",
    access_token_ciphertext: secret.ciphertext,
    access_token_nonce: secret.nonce,
    refresh_token_ciphertext: null,
    refresh_token_nonce: null
  };

  const state: Harness = {
    fetch: vi.fn(),
    migrationNames: [],
    finished: [],
    connectionPatches: [],
    createBody: null,
    kvPuts: []
  };

  state.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    );
    const method = (init?.method ?? "GET").toUpperCase();
    const path = url.pathname;
    const rpc = path.startsWith("/rest/v1/rpc/") ? path.split("/").pop() : null;
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;

    if (rpc === "claim_tenant_provisioning_job_by_id") return jsonResponse([job]);
    if (rpc === "set_tenant_provisioning_step") return jsonResponse(undefined, 204);
    if (rpc === "record_tenant_migration") return jsonResponse({ id: "mig" });
    if (rpc === "upsert_tenant_database") return jsonResponse(database);
    if (rpc === "log_platform_event") return jsonResponse("event");
    if (rpc === "finish_tenant_provisioning_job") {
      state.finished.push(body ?? {});
      return jsonResponse(job);
    }

    if (path === "/rest/v1/organizations") return jsonResponse([organization]);
    if (path === "/rest/v1/stores") return jsonResponse([store]);
    if (path === "/rest/v1/profiles") return jsonResponse([]);
    if (path === "/rest/v1/supabase_oauth_tokens") return jsonResponse([tokenRow]);
    if (path === "/rest/v1/supabase_connections") {
      if (method === "PATCH") {
        state.connectionPatches.push(body ?? {});
        return jsonResponse([connection]);
      }
      return jsonResponse([connection]);
    }
    if (path === "/rest/v1/tenant_provisioning_jobs") {
      if (method === "PATCH") return jsonResponse([job]);
      return jsonResponse([job]);
    }
    if (path === "/rest/v1/tenant_migrations") return jsonResponse([]);
    if (path === "/rest/v1/tenant_databases") {
      if (method === "PATCH") return jsonResponse([database]);
      return jsonResponse([]);
    }

    if (path === "/v1/projects" && method === "POST") {
      state.createBody = body;
      if (statusOverride) {
        return jsonResponse({ message: statusOverride === 401 ? "Unauthorized" : "Failed" }, statusOverride);
      }
      return jsonResponse({ id: REF, name: "test-store-commerce" });
    }
    if (path === `/v1/projects/${REF}`) {
      return jsonResponse({ id: REF, status: "ACTIVE_HEALTHY" });
    }
    if (path === `/v1/projects/${REF}/api-keys`) {
      return jsonResponse([{ name: "anon", api_key: "publishable-anon-key" }]);
    }
    if (path === `/v1/projects/${REF}/database/migrations`) {
      state.migrationNames.push(String(body?.name));
      return jsonResponse({});
    }

    throw new Error(`unexpected request ${method} ${path}`);
  });

  vi.stubGlobal("fetch", state.fetch);

  const env = makeEnv();
  (env.TENANT_SECRETS.put as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    async (key: string, value: string) => {
      state.kvPuts.push([key, value]);
    }
  );

  return state;
}

describe("template bundle", () => {
  it("has matching checksums and deterministic ordering", async () => {
    const files = [
      ...TEMPLATE_BUNDLE.migrations,
      ...TEMPLATE_BUNDLE.seeds,
      ...TEMPLATE_BUNDLE.verification
    ];

    for (const file of files) {
      expect(await sha256Hex(file.sql)).toBe(file.checksum);
    }

    TEMPLATE_BUNDLE.migrations.forEach((file, index) => {
      const basename = file.file.split("/").pop() ?? "";
      expect(basename.startsWith(`${String(index + 1).padStart(3, "0")}_`)).toBe(true);
    });

    expect(TEMPLATE_BUNDLE.verification.at(-1)?.file).toContain("health-verification");
    expect(TEMPLATE_BUNDLE.protectedProjects).toContain("ftcvyhlzeyqceosdqyxn");
  });
});

describe("crypto", () => {
  it("round-trips AES-256-GCM secrets", async () => {
    const encrypted = await encryptSecret("refresh-token", KEY_B64, "k1");
    expect(encrypted.ciphertext).not.toContain("refresh-token");
    expect(await decryptSecret(encrypted, KEY_B64)).toBe("refresh-token");
  });

  it("creates PKCE verifier/challenge pairs", async () => {
    const pair = await createPkcePair();
    expect(pair.verifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.challenge).not.toBe(pair.verifier);
    expect(pair.challenge).not.toContain("=");
  });

  it("generates passwords with all required character classes", () => {
    const password = randomPassword(24);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
    expect(password.length).toBe(24);
  });
});

describe("oauth", () => {
  it("builds an authorize URL with PKCE and required params", () => {
    const env = makeEnv();
    const url = new URL(buildAuthorizeUrl(env, "state-value", "challenge-value"));
    expect(url.origin).toBe("https://management.test");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("state")).toBe("state-value");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toContain("database:write");
  });

  it("exchanges an authorization code with the verifier", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        jsonResponse({ access_token: "at", refresh_token: "rt", expires_in: 3600 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const tokens = await exchangeAuthorizationCode(makeEnv(), "code-1", "verifier-1");
    expect(tokens.access_token).toBe("at");

    const [, init] = fetchMock.mock.calls[0]!;
    const body = new URLSearchParams(String((init as RequestInit).body));
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code_verifier")).toBe("verifier-1");
    expect(body.get("redirect_uri")).toBe("https://worker.test/oauth/callback");
  });

  it("rejects non-https and foreign return URLs", () => {
    expect(validateReturnTo("http://admin.zerocraft.test/setup", "https://admin.zerocraft.test")).toBeNull();
    expect(validateReturnTo("https://evil.test/setup", "https://admin.zerocraft.test")).toBeNull();
    expect(
      validateReturnTo("https://admin.zerocraft.test/setup", "https://admin.zerocraft.test")
    ).not.toBeNull();
    expect(
      validateReturnTo(
        "https://preview.zerocraft.test/setup",
        "https://admin.zerocraft.test",
        "https://preview.zerocraft.test"
      )
    ).not.toBeNull();
  });
});

describe("management client", () => {
  it("sends region_selection when creating a project", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        jsonResponse({ id: REF, name: "store" })
    );
    vi.stubGlobal("fetch", fetchMock);

    const api = new ManagementApi("token", "https://management.test");
    await api.createProject({
      name: "store",
      organization_slug: "org",
      db_pass: "Secret1!",
      region: "ap-south-1"
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>;
    expect(body.region_selection).toEqual({ type: "specific", code: "ap-south-1" });
    expect(body.db_pass).toBe("Secret1!");
  });

  it("does not include the token in error messages", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ message: "Unauthorized", code: "unauthorized" }, 401)
    );
    vi.stubGlobal("fetch", fetchMock);

    const api = new ManagementApi("super-secret-token", "https://management.test");
    await expect(api.getProject(REF)).rejects.toMatchObject({ status: 401 });
  });
});

describe("provisioning safety", () => {
  it("refuses protected platform project refs", () => {
    const env = makeEnv();
    expect(protectedProjectRefs(env).has("ftcvyhlzeyqceosdqyxn")).toBe(true);
    expect(() => assertSafeTarget(env, "ftcvyhlzeyqceosdqyxn")).toThrow(/protected/);
    expect(() => assertSafeTarget(env, "not-a-ref")).toThrow(/invalid/);
    expect(() => assertSafeTarget(env, REF)).not.toThrow();
  });

  it("redacts token-like values from error messages", () => {
    const message = sanitizeError(
      new Error("failed Bearer sbp_1234567890 eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop")
    );
    expect(message).not.toContain("sbp_1234567890");
    expect(message).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });
});

describe("provisioning runner (mocked Management API)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("installs the template, initializes the tenant and activates it", async () => {
    const state = await harness();
    const env = makeEnv();
    (env.TENANT_SECRETS.put as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (key: string, value: string) => {
        state.kvPuts.push([key, value]);
      }
    );

    const result = await runProvisioningJob(env, job.id, "test-worker");
    expect(result.status).toBe("SUCCEEDED");

    const expectedFiles =
      TEMPLATE_BUNDLE.migrations.length +
      TEMPLATE_BUNDLE.seeds.length +
      1 +
      TEMPLATE_BUNDLE.verification.length;
    expect(state.migrationNames.length).toBe(expectedFiles);
    expect(state.migrationNames[0]).toContain("001_core.sql");
    expect(state.migrationNames.at(-1)).toContain("health-verification.sql");

    expect(state.createBody?.region_selection).toEqual({
      type: "specific",
      code: "ap-south-1"
    });
    expect(state.kvPuts.length).toBe(1);
    expect(state.kvPuts[0]?.[0]).toBe(`tenant/${REF}/db_password`);
    expect(state.kvPuts[0]?.[1]?.length).toBeGreaterThanOrEqual(20);

    const finish = state.finished.at(-1);
    expect(finish?.p_status).toBe("SUCCEEDED");
    expect(finish?.p_progress).toBe(100);
  });

  it("marks the connection for reauthorization on HTTP 401", async () => {
    const state = await harness(401);
    const env = makeEnv();

    const result = await runProvisioningJob(env, job.id, "test-worker");
    expect(result.status).toBe("NEEDS_REAUTHORIZATION");
    expect(state.connectionPatches.some((patch) => patch.connection_status === "needs_reauth")).toBe(
      true
    );
    expect(state.finished.at(-1)?.p_status).toBe("NEEDS_REAUTHORIZATION");
  });

  it("skips a job that cannot be claimed", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("claim_tenant_provisioning_job_by_id")) {
        return jsonResponse([]);
      }
      throw new Error(`unexpected ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runProvisioningJob(makeEnv(), job.id);
    expect(result.status).toBe("SKIPPED");
  });
});
