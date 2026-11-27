import "server-only";

import {
  createCodeChallenge,
  generateRandomToken,
  isValidCodeChallenge,
  isValidPkceVerifier,
  isValidState,
  safeRedirectPath,
  sha256Hex,
  timingSafeEqualBase64Url,
  HANDOFF_CODE_TTL_SECONDS,
  type HandoffRequestBody,
} from "@zerocraft/auth-core";

import { getAdminOrigin, isHandoffConfigured, isServiceRoleConfigured } from "@/lib/auth/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type HandoffErrorCode =
  | "not_configured"
  | "unauthenticated"
  | "invalid_request"
  | "invalid_code"
  | "expired"
  | "replayed"
  | "server_error";

export class HandoffError extends Error {
  readonly code: HandoffErrorCode;

  constructor(code: HandoffErrorCode, message: string) {
    super(message);
    this.name = "HandoffError";
    this.code = code;
  }
}

export type AuthorizeHandoffInput = {
  state: string;
  codeChallenge: string;
  returnTo: string;
};

export type AuthorizeHandoffResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; code: HandoffErrorCode };

/**
 * Creates a single-use authorization code bound to the admin application's
 * PKCE challenge. Only a SHA-256 hash of the code is stored.
 */
export async function authorizeHandoff(
  input: AuthorizeHandoffInput,
): Promise<AuthorizeHandoffResult> {
  if (!isHandoffConfigured() || !isServiceRoleConfigured()) {
    return { ok: false, code: "not_configured" };
  }

  if (
    !isValidState(input.state) ||
    !isValidCodeChallenge(input.codeChallenge)
  ) {
    return { ok: false, code: "invalid_request" };
  }

  const returnPath = safeRedirectPath(input.returnTo, "/");
  if (returnPath !== input.returnTo) {
    return { ok: false, code: "invalid_request" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return { ok: false, code: "unauthenticated" };
  }

  const code = generateRandomToken(32);
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(
    Date.now() + HANDOFF_CODE_TTL_SECONDS * 1000,
  ).toISOString();

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("auth_handoff_codes").insert({
    code_hash: codeHash,
    user_id: user.id,
    email: user.email,
    target_origin: getAdminOrigin(),
    return_path: returnPath,
    code_challenge: input.codeChallenge,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("Handoff code insert failed.", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, code: "server_error" };
  }

  const callback = new URL("/auth/callback", getAdminOrigin());
  callback.searchParams.set("code", code);
  callback.searchParams.set("state", input.state);
  // The one-time code is not an access token and is never exchanged for one
  // in the browser. It is bound to the admin verifier cookie.
  return { ok: true, redirectUrl: callback.toString() };
}

export type RedeemHandoffResult = {
  tokenHash: string;
  userId: string;
};

/**
 * Consumes an authorization code server-to-server.
 *
 * The admin sends the PKCE verifier and the code. The code is atomically
 * marked consumed before a Supabase magiclink token is minted. The token is
 * returned only to the trusted server caller and is never placed in a URL.
 */
export async function redeemHandoff(
  body: HandoffRequestBody,
): Promise<{ ok: true; result: RedeemHandoffResult } | { ok: false; code: HandoffErrorCode }> {
  if (!isHandoffConfigured() || !isServiceRoleConfigured()) {
    return { ok: false, code: "not_configured" };
  }

  if (
    typeof body.code !== "string" ||
    typeof body.verifier !== "string" ||
    typeof body.targetOrigin !== "string"
  ) {
    return { ok: false, code: "invalid_request" };
  }

  if (!isValidPkceVerifier(body.verifier)) {
    return { ok: false, code: "invalid_request" };
  }

  if (body.targetOrigin !== getAdminOrigin()) {
    return { ok: false, code: "invalid_request" };
  }

  const admin = createSupabaseAdminClient();
  const codeHash = await sha256Hex(body.code);

  const { data: row, error: lookupError } = await admin
    .from("auth_handoff_codes")
    .select(
      "id, user_id, email, target_origin, return_path, code_challenge, expires_at, consumed_at",
    )
    .eq("code_hash", codeHash)
    .maybeSingle();

  if (lookupError) {
    console.error("Handoff code lookup failed.", {
      code: lookupError.code,
      message: lookupError.message,
    });
    return { ok: false, code: "server_error" };
  }

  if (!row) return { ok: false, code: "invalid_code" };
  if (row.consumed_at) return { ok: false, code: "replayed" };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, code: "expired" };
  }
  if (row.target_origin !== body.targetOrigin) {
    return { ok: false, code: "invalid_request" };
  }

  const computedChallenge = await createCodeChallenge(body.verifier);
  if (
    !timingSafeEqualBase64Url(
      String(row.code_challenge),
      computedChallenge,
    )
  ) {
    return { ok: false, code: "invalid_code" };
  }

  // Atomic single-use consumption. A concurrent replay loses this update and
  // receives no token.
  const { data: consumed, error: consumeError } = await admin
    .from("auth_handoff_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (consumeError) {
    console.error("Handoff code consumption failed.", {
      code: consumeError.code,
      message: consumeError.message,
    });
    return { ok: false, code: "server_error" };
  }

  if (!consumed) return { ok: false, code: "replayed" };

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: String(row.email),
  });

  if (linkError || !link?.properties?.hashed_token) {
    console.error("Handoff magiclink generation failed.", {
      message: linkError?.message,
    });
    return { ok: false, code: "server_error" };
  }

  if (link.user && link.user.id !== row.user_id) {
    return { ok: false, code: "invalid_code" };
  }

  return {
    ok: true,
    result: {
      tokenHash: link.properties.hashed_token,
      userId: String(row.user_id),
    },
  };
}
