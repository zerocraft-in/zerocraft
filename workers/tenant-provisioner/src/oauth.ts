/**
 * Official Supabase OAuth2 flow.
 *
 * Authorize: https://api.supabase.com/v1/oauth/authorize
 * Token:     POST https://api.supabase.com/v1/oauth/token
 *
 * The authorization-code grant is used with PKCE (S256). The client secret is
 * required by Supabase and never leaves the Worker.
 */

export const REQUIRED_SCOPES = [
  "organizations:read",
  "projects:write",
  "database:write"
] as const;

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export class OAuthError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

function authorizeEndpoint(env: Env): string {
  return env.SUPABASE_OAUTH_AUTHORIZE_URL ?? "https://api.supabase.com/v1/oauth/authorize";
}

function tokenEndpoint(env: Env): string {
  return env.SUPABASE_OAUTH_TOKEN_URL ?? "https://api.supabase.com/v1/oauth/token";
}

export function buildAuthorizeUrl(
  env: Env,
  state: string,
  codeChallenge: string,
  scopes: readonly string[] = REQUIRED_SCOPES
): string {
  const url = new URL(authorizeEndpoint(env));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.SUPABASE_OAUTH_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.SUPABASE_OAUTH_REDIRECT_URI);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

async function tokenRequest(env: Env, body: Record<string, string>): Promise<OAuthTokens> {
  const response = await fetch(tokenEndpoint(env), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.SUPABASE_OAUTH_CLIENT_ID,
      client_secret: env.SUPABASE_OAUTH_CLIENT_SECRET,
      ...body
    }).toString()
  });

  const raw = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    const code = typeof parsed.error === "string" ? parsed.error : `http_${response.status}`;
    const description =
      typeof parsed.error_description === "string"
        ? parsed.error_description
        : raw.slice(0, 300);
    throw new OAuthError(code, description);
  }

  if (typeof parsed.access_token !== "string") {
    throw new OAuthError("invalid_token_response", "token endpoint returned no access_token");
  }

  return {
    access_token: parsed.access_token,
    refresh_token: typeof parsed.refresh_token === "string" ? parsed.refresh_token : undefined,
    expires_in: typeof parsed.expires_in === "number" ? parsed.expires_in : undefined,
    token_type: typeof parsed.token_type === "string" ? parsed.token_type : undefined,
    scope: typeof parsed.scope === "string" ? parsed.scope : undefined
  };
}

export function exchangeAuthorizationCode(
  env: Env,
  code: string,
  codeVerifier: string
): Promise<OAuthTokens> {
  return tokenRequest(env, {
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: env.SUPABASE_OAUTH_REDIRECT_URI
  });
}

export function refreshAccessToken(env: Env, refreshToken: string): Promise<OAuthTokens> {
  return tokenRequest(env, {
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
}

export function expiryFrom(now: Date, tokens: OAuthTokens): string | null {
  if (typeof tokens.expires_in !== "number") return null;
  return new Date(now.getTime() + tokens.expires_in * 1000).toISOString();
}
