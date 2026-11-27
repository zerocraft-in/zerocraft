/**
 * Minimal PostgREST client for the Zerocraft Platform DB.
 *
 * Two modes:
 *   service  - Worker background operations, bypasses RLS via service_role.
 *   user     - verifies a user's own access token through RLS/RPCs.
 *
 * Tokens are only ever placed in request headers and are never logged.
 */

export class PlatformDbError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "PlatformDbError";
  }
}

export interface PlatformDbOptions {
  url: string;
  apiKey: string;
  accessToken?: string;
}

function quote(value: string): string {
  return encodeURIComponent(value);
}

export class PlatformDb {
  private readonly baseUrl: string;

  constructor(private readonly options: PlatformDbOptions) {
    this.baseUrl = options.url.replace(/\/+$/g, "");
  }

  private headers(extra: Record<string, string> = {}): HeadersInit {
    const token = this.options.accessToken ?? this.options.apiKey;
    return {
      apikey: this.options.apiKey,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...extra
    };
  }

  private buildUrl(table: string, params: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}/rest/v1/${table}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private async parseError(response: Response): Promise<PlatformDbError> {
    const text = await response.text();
    let code = `http_${response.status}`;
    let message = text.slice(0, 500);
    try {
      const body = JSON.parse(text) as Record<string, unknown>;
      if (typeof body.code === "string") code = body.code;
      if (typeof body.message === "string") message = body.message;
      else if (typeof body.hint === "string") message = body.hint;
    } catch {
      // Non-JSON error body; keep the truncated text.
    }
    return new PlatformDbError(response.status, code, message);
  }

  async select<T>(table: string, params: Record<string, string> = {}): Promise<T[]> {
    const response = await fetch(this.buildUrl(table, params), {
      method: "GET",
      headers: this.headers()
    });
    if (!response.ok) throw await this.parseError(response);
    return (await response.json()) as T[];
  }

  async selectOne<T>(table: string, params: Record<string, string> = {}): Promise<T | null> {
    const rows = await this.select<T>(table, { ...params, limit: "1" });
    return rows[0] ?? null;
  }

  async insert<T>(
    table: string,
    row: Record<string, unknown>,
    params: Record<string, string> = {},
    prefer = "return=representation"
  ): Promise<T[]> {
    const response = await fetch(this.buildUrl(table, params), {
      method: "POST",
      headers: this.headers({ prefer }),
      body: JSON.stringify(row)
    });
    if (!response.ok) throw await this.parseError(response);
    return (await response.json()) as T[];
  }

  async upsert<T>(
    table: string,
    row: Record<string, unknown>,
    onConflict: string
  ): Promise<T[]> {
    return this.insert<T>(
      table,
      row,
      { on_conflict: onConflict },
      "return=representation,resolution=merge-duplicates"
    );
  }

  async update<T>(
    table: string,
    filters: Record<string, string>,
    patch: Record<string, unknown>
  ): Promise<T[]> {
    const response = await fetch(this.buildUrl(table, filters), {
      method: "PATCH",
      headers: this.headers({ prefer: "return=representation" }),
      body: JSON.stringify(patch)
    });
    if (!response.ok) throw await this.parseError(response);
    return (await response.json()) as T[];
  }

  async delete(table: string, filters: Record<string, string>): Promise<void> {
    const response = await fetch(this.buildUrl(table, filters), {
      method: "DELETE",
      headers: this.headers()
    });
    if (!response.ok) throw await this.parseError(response);
  }

  async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(args)
    });
    if (!response.ok) throw await this.parseError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}

export function eq(value: string): string {
  return `eq.${value}`;
}

export function inList(values: string[]): string {
  return `in.(${values.join(",")})`;
}
