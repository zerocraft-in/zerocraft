/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Typed Supabase Management API client.
 *
 * Security properties:
 *   * The access token is held in memory and only placed in the Authorization
 *     header. It is never logged, persisted or included in an error.
 *   * Request and response bodies are never logged.
 *   * All JSON responses are validated at runtime before use.
 *   * Retries are bounded and only apply to transient failures and HTTP 429.
 *
 * The transport is injectable so unit tests never make a real network request.
 */

import { redactSecrets } from "../redaction";
import {
  ManagementApiError,
  ManagementApiResponseError,
  ManagementApiTimeoutError,
  ManagementApiTransportError,
  isRetryableManagementError,
} from "./errors";
import {
  parseApiKeys,
  parseOrganizations,
  parseProject,
  parseProjects,
  parseQueryResult,
  type ApplyMigrationInput,
  type CreateProjectInput,
  type ManagementApiPort,
  type SupabaseApiKey,
  type SupabaseOrganization,
  type SupabaseProject,
} from "./types";

export interface ManagementHttpResponse {
  status: number;
  ok: boolean;
  headers: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
}

export interface ManagementHttpRequest {
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export type ManagementTransport = (
  url: string,
  request: ManagementHttpRequest
) => Promise<ManagementHttpResponse>;

export interface ManagementApiClientOptions {
  accessToken: string;
  baseUrl?: string;
  transport?: ManagementTransport;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
}

interface RequestOptions<T> {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  expectJson?: boolean;
  validate?: (value: unknown) => T;
}

const DEFAULT_BASE_URL = "https://api.supabase.com";
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function defaultSleep(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Default transport. It is only used when no transport is injected. Tests
 * always inject a fake transport.
 */
export function createFetchTransport(): ManagementTransport {
  return async (url, request) => {
    const fetchFn = (
      globalThis as {
        fetch?: (
          input: string,
          init: ManagementHttpRequest
        ) => Promise<ManagementHttpResponse>;
      }
    ).fetch;
    if (typeof fetchFn !== "function") {
      throw new ManagementApiTransportError("Global fetch is not available");
    }
    return fetchFn(url, request);
  };
}

export class ManagementApiClient implements ManagementApiPort {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly transport: ManagementTransport;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly retryMaxDelayMs: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: ManagementApiClientOptions) {
    if (!options.accessToken || options.accessToken.trim().length === 0) {
      throw new ManagementApiTransportError("Management API access token is required");
    }

    this.accessToken = options.accessToken;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.transport = options.transport ?? createFetchTransport();
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.maxRetries = Math.max(0, options.maxRetries ?? 2);
    this.retryBaseDelayMs = Math.max(1, options.retryBaseDelayMs ?? 250);
    this.retryMaxDelayMs = Math.max(
      this.retryBaseDelayMs,
      options.retryMaxDelayMs ?? 5_000
    );
    this.sleep = options.sleep ?? defaultSleep;
  }

  private headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.accessToken}`,
      accept: "application/json",
      "content-type": "application/json",
      "x-client-info": "zerocraft-tenant-provisioner-local",
    };
  }

  private async parseError(
    response: ManagementHttpResponse,
    raw: string
  ): Promise<ManagementApiError> {
    let code = `http_${response.status}`;
    let message = `Management API request failed with status ${response.status}`;

    if (raw.trim()) {
      try {
        const body = JSON.parse(raw) as Record<string, unknown>;
        if (typeof body.code === "string") code = body.code;
        else if (typeof body.error === "string") code = body.error;
        if (typeof body.message === "string") message = body.message;
        else if (typeof body.error === "string") message = body.error;
      } catch {
        message = redactSecrets(raw.slice(0, 400));
      }
    }

    return new ManagementApiError(
      response.status,
      code,
      redactSecrets(message),
      RETRYABLE_STATUS.has(response.status),
      response.headers.get("x-request-id") ??
        response.headers.get("sb-request-id")
    );
  }

  private retryDelay(error: unknown, attempt: number): number {
    if (error instanceof ManagementApiError) {
      const retryAfter = (error as ManagementApiError & { retryAfterMs?: number })
        .retryAfterMs;
      if (typeof retryAfter === "number" && retryAfter >= 0) {
        return Math.min(retryAfter, this.retryMaxDelayMs);
      }
    }

    const exponential = this.retryBaseDelayMs * Math.pow(2, attempt);
    return Math.min(exponential, this.retryMaxDelayMs);
  }

  private retryAfterMs(response: ManagementHttpResponse): number | null {
    const raw = response.headers.get("retry-after");
    if (!raw) return null;

    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.round(seconds * 1000);
    }

    const date = Date.parse(raw);
    if (Number.isFinite(date)) {
      return Math.max(0, date - Date.now());
    }

    return null;
  }

  private async once<T>(options: RequestOptions<T>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: ManagementHttpResponse;
    try {
      response = await this.transport(`${this.baseUrl}${options.path}`, {
        method: options.method,
        headers: this.headers(),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ManagementApiTimeoutError();
      }
      if (error instanceof ManagementApiError) throw error;
      throw new ManagementApiTransportError(
        redactSecrets(
          error instanceof Error ? error.message : "Management API transport failed"
        )
      );
    } finally {
      clearTimeout(timer);
    }

    let raw = "";
    try {
      raw = await response.text();
    } catch {
      throw new ManagementApiTransportError(
        "Unable to read Management API response body"
      );
    }

    if (!response.ok) {
      const apiError = await this.parseError(response, raw);
      const retryAfterMs = this.retryAfterMs(response);
      if (retryAfterMs !== null) {
        (apiError as ManagementApiError & { retryAfterMs?: number }).retryAfterMs =
          retryAfterMs;
      }
      throw apiError;
    }

    if (options.expectJson === false) {
      return undefined as T;
    }

    if (!raw.trim()) {
      throw new ManagementApiResponseError(
        "Management API returned an empty response where JSON was expected"
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ManagementApiResponseError(
        "Management API returned invalid JSON"
      );
    }

    if (!options.validate) return parsed as T;
    return options.validate(parsed);
  }

  private async request<T>(options: RequestOptions<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.once(options);
      } catch (error) {
        lastError = error;
        if (!isRetryableManagementError(error) || attempt === this.maxRetries) {
          throw error;
        }
        await this.sleep(this.retryDelay(error, attempt));
      }
    }

    throw lastError;
  }

  async getOrganizations(): Promise<SupabaseOrganization[]> {
    return this.request({
      method: "GET",
      path: "/v1/organizations",
      validate: parseOrganizations,
    });
  }

  async createProject(input: CreateProjectInput): Promise<SupabaseProject> {
    return this.request({
      method: "POST",
      path: "/v1/projects",
      body: {
        name: input.name,
        organization_id: input.organizationId,
        organization_slug: input.organizationSlug,
        db_pass: input.dbPassword,
        region: input.region,
        region_selection: { type: "specific", code: input.region },
        desired_instance_size: input.computeSize,
      },
      validate: parseProject,
    });
  }

  async getProject(projectRef: string): Promise<SupabaseProject> {
    return this.request({
      method: "GET",
      path: `/v1/projects/${encodeURIComponent(projectRef)}`,
      validate: parseProject,
    });
  }

  async listProjects(): Promise<SupabaseProject[]> {
    return this.request({
      method: "GET",
      path: "/v1/projects",
      validate: parseProjects,
    });
  }

  async getApiKeys(projectRef: string): Promise<SupabaseApiKey[]> {
    return this.request({
      method: "GET",
      path: `/v1/projects/${encodeURIComponent(projectRef)}/api-keys?reveal=true`,
      validate: parseApiKeys,
    });
  }

  async applyMigration(
    projectRef: string,
    input: ApplyMigrationInput
  ): Promise<void> {
    await this.request({
      method: "POST",
      path: `/v1/projects/${encodeURIComponent(projectRef)}/database/migrations`,
      body: { name: input.name, query: input.query },
      expectJson: false,
    });
  }

  async runQuery(projectRef: string, query: string): Promise<unknown> {
    const result = await this.request({
      method: "POST",
      path: `/v1/projects/${encodeURIComponent(projectRef)}/database/query`,
      body: { query },
    });
    return parseQueryResult(result);
  }
}
