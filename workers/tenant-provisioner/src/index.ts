/**
 * maara-tenant-provisioner
 *
 * Server-to-server Worker for:
 *   - Supabase OAuth onboarding (state + PKCE, encrypted tokens)
 *   - tenant project provisioning with an idempotent, resumable job runner
 *   - template migration installation with checksum verification
 *   - token refresh and revocation handling
 *
 * The browser never calls internal routes directly. The admin server
 * authenticates the user, then calls this Worker with PROVISIONER_SHARED_SECRET.
 * The user's own access token is forwarded only for the owner-check RPC.
 */

import {
  createPkcePair,
  decodeJwt,
  decryptSecret,
  encryptSecret,
  randomToken,
  sha256Hex
} from "./crypto";
import {
  appendQuery,
  json,
  problem,
  readJson,
  redirect,
  requireSharedSecret,
  sanitizeError,
  validateReturnTo
} from "./http";
import { eq, PlatformDbError } from "./platform-db";
import {
  buildAuthorizeUrl,
  REQUIRED_SCOPES
} from "./oauth";
import {
  claimAndRunOne,
  exchangeAndStorePending,
  finalizePendingConnection,
  refreshExpiringConnections,
  registerTemplateVersion,
  runProvisioningJob,
  serviceDb,
  userDb
} from "./provisioning";
import { TEMPLATE_BUNDLE } from "./template-bundle";

const STATE_TTL_MS = 10 * 60 * 1000;

interface OAuthStartBody {
  organizationId?: string;
  userAccessToken?: string;
  returnTo?: string;
}

interface OAuthFinalizeBody {
  state?: string;
  supabaseOrganizationId?: string;
  accountName?: string;
}

interface JobBody {
  jobId?: string;
}

async function requireOrgOwner(
  env: Env,
  userAccessToken: string | undefined,
  organizationId: string
): Promise<Response | null> {
  if (!userAccessToken) {
    return problem(401, "UNAUTHORIZED", "userAccessToken is required");
  }

  try {
    const db = userDb(env, userAccessToken);
    const owner = await db.rpc<boolean>("current_user_is_org_owner", {
      p_org: organizationId
    });
    if (!owner) {
      return problem(403, "FORBIDDEN", "Only an organization owner may do this");
    }
    return null;
  } catch (error) {
    if (error instanceof PlatformDbError && [401, 403].includes(error.status)) {
      return problem(401, "UNAUTHORIZED", "Invalid or expired user token");
    }
    return problem(502, "PLATFORM_DB_ERROR", sanitizeError(error));
  }
}

async function handleOAuthStart(request: Request, env: Env): Promise<Response> {
  const unauthorized = requireSharedSecret(request, env.TENANT_PROVISIONER_SHARED_SECRET);
  if (unauthorized) return unauthorized;

  const body = await readJson<OAuthStartBody>(request);
  if (!body?.organizationId || !body.userAccessToken || !body.returnTo) {
    return problem(400, "BAD_REQUEST", "organizationId, userAccessToken and returnTo are required");
  }

  const returnTo = validateReturnTo(
    body.returnTo,
    env.ADMIN_APP_URL,
    env.PROVISIONER_REDIRECT_ALLOWLIST
  );
  if (!returnTo) return problem(400, "INVALID_RETURN_TO", "returnTo must be an allowed https URL");

  const forbidden = await requireOrgOwner(env, body.userAccessToken, body.organizationId);
  if (forbidden) return forbidden;

  let userId: string;
  try {
    userId = decodeJwt(body.userAccessToken).sub as string;
  } catch {
    return problem(401, "UNAUTHORIZED", "Invalid user token");
  }
  if (typeof userId !== "string") return problem(401, "UNAUTHORIZED", "Invalid user token");

  const state = randomToken(32);
  const stateHash = await sha256Hex(state);
  const pkce = await createPkcePair();
  const verifier = await encryptSecret(
    pkce.verifier,
    env.OAUTH_TOKEN_ENCRYPTION_KEY,
    env.OAUTH_ENCRYPTION_KEY_ID
  );

  const db = serviceDb(env);
  const now = new Date();

  await db.insert("supabase_oauth_states", {
    state_hash: stateHash,
    organization_id: body.organizationId,
    user_id: userId,
    return_to: returnTo.toString(),
    redirect_uri: env.SUPABASE_OAUTH_REDIRECT_URI,
    requested_scopes: [...REQUIRED_SCOPES],
    code_verifier_ciphertext: verifier.ciphertext,
    code_verifier_nonce: verifier.nonce,
    key_id: verifier.keyId,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + STATE_TTL_MS).toISOString()
  });

  return json({
    authorizeUrl: buildAuthorizeUrl(env, state, pkce.challenge),
    scopes: [...REQUIRED_SCOPES]
  });
}

async function handleOAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error");

  if (!state) return problem(400, "INVALID_STATE", "Missing OAuth state");

  const db = serviceDb(env);
  const stateHash = await sha256Hex(state);
  const row = await db.selectOne<{
    state_hash: string;
    organization_id: string;
    user_id: string;
    return_to: string;
    redirect_uri: string;
    requested_scopes: string[];
    code_verifier_ciphertext: string | null;
    code_verifier_nonce: string | null;
    key_id: string | null;
    expires_at: string;
    consumed_at: string | null;
  }>("supabase_oauth_states", {
    state_hash: eq(stateHash),
    consumed_at: "is.null"
  });

  if (!row) return problem(400, "INVALID_STATE", "Unknown or already used OAuth state");

  const returnTo = validateReturnTo(
    row.return_to,
    env.ADMIN_APP_URL,
    env.PROVISIONER_REDIRECT_ALLOWLIST
  );
  if (!returnTo) return problem(400, "INVALID_RETURN_TO", "Stored return URL is no longer allowed");

  if (Date.parse(row.expires_at) < Date.now()) {
    return problem(400, "EXPIRED_STATE", "OAuth state has expired");
  }

  if (providerError) {
    await db.update("supabase_oauth_states", { state_hash: eq(stateHash) }, {
      consumed_at: new Date().toISOString()
    });
    return redirect(appendQuery(returnTo, { oauth: "error", reason: providerError }).toString());
  }

  if (!code) return problem(400, "BAD_REQUEST", "Missing authorization code");
  if (!row.code_verifier_ciphertext || !row.code_verifier_nonce || !row.key_id) {
    return problem(400, "INVALID_STATE", "OAuth state has no PKCE verifier");
  }

  const verifier = await decryptSecret(
    {
      ciphertext: row.code_verifier_ciphertext,
      nonce: row.code_verifier_nonce,
      keyId: row.key_id
    },
    env.OAUTH_TOKEN_ENCRYPTION_KEY
  );

  try {
    const { organizations } = await exchangeAndStorePending(env, db, {
      stateHash,
      organizationId: row.organization_id,
      userId: row.user_id,
      code,
      codeVerifier: verifier,
      scopes: row.requested_scopes
    });

    await db.update("supabase_oauth_states", { state_hash: eq(stateHash) }, {
      consumed_at: new Date().toISOString()
    });

    if (organizations.length === 0) {
      return redirect(
        appendQuery(returnTo, {
          oauth: "error",
          reason: "no_supabase_organizations"
        }).toString()
      );
    }

    if (organizations.length === 1) {
      const organization = organizations[0]!;
      await finalizePendingConnection(env, db, {
        stateHash,
        organizationId: row.organization_id,
        supabaseOrganizationId: organization.id,
        accountName: organization.name
      });

      return redirect(
        appendQuery(returnTo, {
          oauth: "connected",
          connection: "active"
        }).toString()
      );
    }

    return redirect(
      appendQuery(returnTo, {
        oauth: "select",
        state
      }).toString()
    );
  } catch (error) {
    return redirect(
      appendQuery(returnTo, {
        oauth: "error",
        reason: sanitizeError(error).slice(0, 120)
      }).toString()
    );
  }
}

async function handleOAuthPending(request: Request, env: Env): Promise<Response> {
  const unauthorized = requireSharedSecret(request, env.TENANT_PROVISIONER_SHARED_SECRET);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const userAccessToken = url.searchParams.get("userAccessToken") ?? undefined;

  if (!state) return problem(400, "BAD_REQUEST", "state is required");

  const db = serviceDb(env);
  const stateHash = await sha256Hex(state);
  const pending = await db.selectOne<{
    organization_id: string;
    supabase_organizations: Array<{ id: string; name: string; slug: string }>;
    expires_at: string;
  }>("supabase_oauth_pending", { state_hash: eq(stateHash) });

  if (!pending) return problem(404, "NOT_FOUND", "OAuth session not found");
  if (Date.parse(pending.expires_at) < Date.now()) {
    return problem(410, "EXPIRED", "OAuth session expired");
  }

  const forbidden = await requireOrgOwner(env, userAccessToken, pending.organization_id);
  if (forbidden) return forbidden;

  return json({
    organizationId: pending.organization_id,
    organizations: pending.supabase_organizations,
    expiresAt: pending.expires_at
  });
}

async function handleOAuthFinalize(request: Request, env: Env): Promise<Response> {
  const unauthorized = requireSharedSecret(request, env.TENANT_PROVISIONER_SHARED_SECRET);
  if (unauthorized) return unauthorized;

  const body = await readJson<OAuthFinalizeBody>(request);
  const userAccessToken = request.headers.get("x-user-access-token") ?? undefined;

  if (!body?.state || !body.supabaseOrganizationId) {
    return problem(400, "BAD_REQUEST", "state and supabaseOrganizationId are required");
  }

  const db = serviceDb(env);
  const stateHash = await sha256Hex(body.state);
  const pending = await db.selectOne<{ organization_id: string; expires_at: string }>(
    "supabase_oauth_pending",
    { state_hash: eq(stateHash) }
  );

  if (!pending) return problem(404, "NOT_FOUND", "OAuth session not found");
  if (Date.parse(pending.expires_at) < Date.now()) {
    return problem(410, "EXPIRED", "OAuth session expired");
  }

  const forbidden = await requireOrgOwner(env, userAccessToken, pending.organization_id);
  if (forbidden) return forbidden;

  try {
    const result = await finalizePendingConnection(env, db, {
      stateHash,
      organizationId: pending.organization_id,
      supabaseOrganizationId: body.supabaseOrganizationId,
      accountName: body.accountName
    });
    return json(result);
  } catch (error) {
    return problem(400, "OAUTH_FINALIZE_FAILED", sanitizeError(error));
  }
}

async function handleJobStart(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const unauthorized = requireSharedSecret(request, env.TENANT_PROVISIONER_SHARED_SECRET);
  if (unauthorized) return unauthorized;

  const body = await readJson<JobBody>(request);
  if (!body?.jobId) return problem(400, "BAD_REQUEST", "jobId is required");

  ctx.waitUntil(
    runProvisioningJob(env, body.jobId).catch(() => undefined)
  );

  return json({ accepted: true, jobId: body.jobId }, 202);
}

async function handleJobProcess(request: Request, env: Env): Promise<Response> {
  const unauthorized = requireSharedSecret(request, env.TENANT_PROVISIONER_SHARED_SECRET);
  if (unauthorized) return unauthorized;

  const result = await claimAndRunOne(env, `worker-${crypto.randomUUID()}`);
  return json({ processed: result });
}

async function handleJobGet(request: Request, env: Env, jobId: string): Promise<Response> {
  const unauthorized = requireSharedSecret(request, env.TENANT_PROVISIONER_SHARED_SECRET);
  if (unauthorized) return unauthorized;

  const db = serviceDb(env);
  const job = await db.selectOne<Record<string, unknown>>("tenant_provisioning_jobs", {
    id: eq(jobId)
  });
  if (!job) return problem(404, "NOT_FOUND", "Job not found");

  const steps = await db.select<Record<string, unknown>>("tenant_provisioning_job_steps", {
    job_id: eq(jobId),
    order: "created_at.asc"
  });

  return json({ job, steps });
}

async function handleTemplateRegister(request: Request, env: Env): Promise<Response> {
  const unauthorized = requireSharedSecret(request, env.TENANT_PROVISIONER_SHARED_SECRET);
  if (unauthorized) return unauthorized;

  const result = await registerTemplateVersion(env);
  return json({ registered: true, ...result });
}

async function handleHealth(): Promise<Response> {
  return json({
    status: "ok",
    service: "maara-tenant-provisioner",
    template: {
      name: TEMPLATE_BUNDLE.name,
      version: TEMPLATE_BUNDLE.version,
      migrations: TEMPLATE_BUNDLE.migrations.length,
      seeds: TEMPLATE_BUNDLE.seeds.length
    }
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return await handleHealth();
      }

      if (request.method === "POST" && url.pathname === "/oauth/start") {
        return await handleOAuthStart(request, env);
      }

      if (request.method === "GET" && url.pathname === "/oauth/callback") {
        return await handleOAuthCallback(request, env);
      }

      if (request.method === "GET" && url.pathname === "/oauth/pending") {
        return await handleOAuthPending(request, env);
      }

      if (request.method === "POST" && url.pathname === "/oauth/finalize") {
        return await handleOAuthFinalize(request, env);
      }

      if (request.method === "POST" && url.pathname === "/jobs/start") {
        return await handleJobStart(request, env, ctx);
      }

      if (request.method === "POST" && url.pathname === "/jobs/process") {
        return await handleJobProcess(request, env);
      }

      if (request.method === "GET" && url.pathname.startsWith("/jobs/")) {
        const jobId = url.pathname.slice("/jobs/".length);
        if (!jobId) return problem(400, "BAD_REQUEST", "job id is required");
        return await handleJobGet(request, env, jobId);
      }

      if (request.method === "POST" && url.pathname === "/admin/template/register") {
        return await handleTemplateRegister(request, env);
      }

      return problem(404, "NOT_FOUND", "Route not found");
    } catch (error) {
      return problem(500, "INTERNAL_ERROR", sanitizeError(error));
    }
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        await refreshExpiringConnections(env).catch(() => undefined);
        await claimAndRunOne(env, "cron").catch(() => undefined);
      })()
    );
  }
};
