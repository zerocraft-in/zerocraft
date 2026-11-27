/**
 * Supabase Management API client.
 *
 * Docs: https://supabase.com/docs/reference/api/introduction
 *   GET  /v1/organizations
 *   POST /v1/projects
 *   GET  /v1/projects/{ref}
 *   GET  /v1/projects/{ref}/api-keys
 *   POST /v1/projects/{ref}/database/migrations
 *
 * The client never logs the access token or request bodies.
 */

export class ManagementApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ManagementApiError";
  }
}

export interface SupabaseOrganization {
  id: string;
  name: string;
  slug?: string;
}

export interface SupabaseProject {
  id: string;
  name: string;
  organization_id?: string;
  region?: string;
  status?: string;
}

export interface SupabaseApiKey {
  name: string;
  api_key: string;
}

export interface CreateProjectInput {
  name: string;
  organization_slug: string;
  db_pass: string;
  region: string;
}

export interface MigrationInput {
  query: string;
  name: string;
}

export class ManagementApi {
  private readonly baseUrl: string;

  constructor(
    private readonly accessToken: string,
    baseUrl = "https://api.supabase.com"
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/g, "");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
        ...(init.headers ?? {})
      }
    });

    const raw = await response.text();

    if (!response.ok) {
      let code = `http_${response.status}`;
      let message = raw.slice(0, 400);
      try {
        const body = JSON.parse(raw) as Record<string, unknown>;
        if (typeof body.code === "string") code = body.code;
        if (typeof body.message === "string") message = body.message;
        else if (typeof body.error === "string") message = body.error;
      } catch {
        // Keep the truncated text.
      }
      throw new ManagementApiError(response.status, code, message);
    }

    if (!raw) return undefined as T;
    return JSON.parse(raw) as T;
  }

  async getOrganizations(): Promise<SupabaseOrganization[]> {
    const result = await this.request<SupabaseOrganization[] | { organizations?: SupabaseOrganization[] }>(
      "/v1/organizations"
    );
    return Array.isArray(result) ? result : result.organizations ?? [];
  }

  async createProject(input: CreateProjectInput): Promise<SupabaseProject> {
    return this.request<SupabaseProject>("/v1/projects", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        organization_slug: input.organization_slug,
        db_pass: input.db_pass,
        region_selection: { type: "specific", code: input.region }
      })
    });
  }

  async getProject(ref: string): Promise<SupabaseProject> {
    return this.request<SupabaseProject>(`/v1/projects/${encodeURIComponent(ref)}`);
  }

  async listProjects(): Promise<SupabaseProject[]> {
    const result = await this.request<SupabaseProject[] | { projects?: SupabaseProject[] }>(
      "/v1/projects"
    );
    return Array.isArray(result) ? result : result.projects ?? [];
  }

  async getApiKeys(ref: string): Promise<SupabaseApiKey[]> {
    return this.request<SupabaseApiKey[]>(
      `/v1/projects/${encodeURIComponent(ref)}/api-keys?reveal=true`
    );
  }

  async applyMigration(ref: string, input: MigrationInput): Promise<void> {
    await this.request<unknown>(
      `/v1/projects/${encodeURIComponent(ref)}/database/migrations`,
      {
        method: "POST",
        body: JSON.stringify({ query: input.query, name: input.name })
      }
    );
  }
}

export function anonKeyFrom(keys: SupabaseApiKey[]): string | null {
  const anon = keys.find((key) => key.name === "anon" || key.name === "publishable");
  return anon?.api_key ?? null;
}
