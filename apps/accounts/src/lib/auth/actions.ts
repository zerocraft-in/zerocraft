"use server";

import { redirect } from "next/navigation";

import {
  authErrorMessage,
  classifySupabaseAuthError,
  normalizeEmail,
  resolvePostAuthDestination,
  safeRedirectPath,
  type AuthFailureCode,
} from "@zerocraft/auth-core";

import {
  getAdminOrigin,
  getCallbackUrl,
  getOriginConfig,
  isServiceRoleConfigured,
  isSupabaseConfigured,
} from "@/lib/auth/config";
import { checkAuthRateLimit } from "@/lib/auth/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  errorCode?: AuthFailureCode | "password_mismatch" | "password_weak";
  email?: string;
  ok?: boolean;
  sentAt?: number;
  retryAfterSeconds?: number;
  userType?: "new" | "existing";
  magicLinkSent?: boolean;
} | null;

function stringValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function resolvedNext(next: string): {
  isAdmin: boolean;
  path: string;
  absolute: string | null;
} {
  const destination = resolvePostAuthDestination(next, getOriginConfig(), "/");

  if (destination.type === "admin") {
    return {
      isAdmin: true,
      path: destination.path,
      absolute: `${getAdminOrigin()}${destination.path}`,
    };
  }

  return {
    isAdmin: false,
    path: destination.path,
    absolute: null,
  };
}

function verifyDestination(path: string): string {
  if (path.startsWith("/auth/")) return "/";
  return safeRedirectPath(path, "/");
}

function verifyUrl(email: string, next: string, sent = true): string {
  const url = new URL("/verify", "https://accounts.invalid");
  url.searchParams.set("email", email);
  if (next) url.searchParams.set("next", next);
  if (!sent) url.searchParams.set("sent", "0");
  return `${url.pathname}${url.search}`;
}

function otpUrl(email: string, next: string): string {
  const url = new URL("/otp", "https://accounts.invalid");
  url.searchParams.set("email", email);
  if (next) url.searchParams.set("next", next);
  return `${url.pathname}${url.search}`;
}

/**
 * Email-first login (legacy entry point).
 *
 * Sends the existing-user sign-in code to an existing account. No account is
 * created from the login surface. The PKCE verifier is stored in an HttpOnly
 * cookie by the server client and exchanged in /callback.
 */
export async function loginWithEmail(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validation = normalizeEmail(stringValue(formData, "email"));
  if (!validation.ok) {
    return { error: validation.error, errorCode: "invalid_email" };
  }

  const email = validation.email;
  const next = stringValue(formData, "next");
  const destination = resolvedNext(next);
  const nextValue = destination.absolute ?? destination.path;

  if (!isSupabaseConfigured()) {
    return { error: authErrorMessage("not_configured"), errorCode: "not_configured" };
  }

  const limit = await checkAuthRateLimit("emailSend", email);
  if (!limit.allowed) {
    return {
      error: authErrorMessage("rate_limited"),
      errorCode: "rate_limited",
      email,
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: getCallbackUrl(nextValue),
      },
    });

    if (error) {
      const code = classifySupabaseAuthError(error);
      return {
        error: authErrorMessage(code),
        errorCode: code,
        email,
      };
    }
  } catch (error) {
    console.error("Login email dispatch failed.", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      error: authErrorMessage("email_delivery_failed"),
      errorCode: "email_delivery_failed",
      email,
    };
  }

  redirect(otpUrl(email, nextValue));
}

/**
 * Email-first authentication entry point.
 *
 * Determines whether the email belongs to an existing account, then routes:
 *  - existing user  -> signInWithOtp sends the 6-digit Magic Link template
 *  - new user       -> admin.createUser + resend(signup) sends the
 *                      clickable signup confirmation template
 *
 * The two flows use two distinct Supabase email templates. A single template
 * containing both {{ .ConfirmationURL }} and {{ .Token }} is not flow-aware:
 * Supabase renders the template for the mail action that was triggered, not
 * for the account status. The caller never supplies an account-type flag.
 */
export async function startEmailAuth(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validation = normalizeEmail(stringValue(formData, "email"));
  if (!validation.ok) {
    return { error: validation.error, errorCode: "invalid_email" };
  }

  const email = validation.email;
  const next = stringValue(formData, "next");
  const destination = resolvedNext(next);
  const nextValue = destination.absolute ?? destination.path;

  if (!isSupabaseConfigured()) {
    return { error: authErrorMessage("not_configured"), errorCode: "not_configured" };
  }

  const limit = await checkAuthRateLimit("emailSend", email);
  if (!limit.allowed) {
    return {
      error: authErrorMessage("rate_limited"),
      errorCode: "rate_limited",
      email,
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  // Supabase Auth is the authoritative source for account existence.
  //
  // signInWithOtp with shouldCreateUser: false has two documented outcomes:
  //  - the account exists: the request succeeds and Supabase sends the
  //    Magic Link template (configured as a six-digit code) immediately;
  //  - the account does not exist: Supabase returns otp_disabled
  //    ("Signups not allowed for otp") and sends no email.
  //
  // The successful call is therefore both detection and delivery for existing
  // users. It avoids the paginated Admin API listUsers() and avoids creating
  // any account from the probe.
  const supabase = await createServerSupabaseClient();

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: getCallbackUrl(nextValue),
      },
    });

    if (!error) {
      // Existing user: the six-digit code email has already been sent.
      return { ok: true, email, sentAt: Date.now(), userType: "existing" };
    }

    const code = classifySupabaseAuthError(error);
    if (code !== "account_not_found") {
      // A real delivery error (rate limit, SMTP, etc.) — fail closed.
      return {
        error: authErrorMessage(code),
        errorCode: code,
        email,
      };
    }
  } catch (error) {
    console.error("Existing-user check failed.", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      error: authErrorMessage("email_delivery_failed"),
      errorCode: "email_delivery_failed",
      email,
    };
  }

  // New user. Account creation and confirmation delivery are two explicit
  // steps so each flow uses its own template:
  //  - admin.createUser creates an unconfirmed account (duplicate-safe);
  //  - resend({ type: "signup" }) sends the Confirmation template, which is
  //    the only template configured with a clickable signup link.
  if (!isServiceRoleConfigured()) {
    return { error: authErrorMessage("not_configured"), errorCode: "not_configured" };
  }

  // New users default to the admin onboarding flow unless an explicit
  // destination was provided.
  const newUserNextValue =
    destination.absolute ??
    (destination.path !== "/" ? destination.path : `${getAdminOrigin()}/onboarding`);

  const admin = createSupabaseAdminClient();
  let createdUserId: string | null = null;

  try {
    const { data, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { zerocraft_signup: true, signup_source: "accounts" },
    });

    if (createError) {
      const code = classifySupabaseAuthError(createError);

      if (code === "existing_account") {
        // Race: another request created the account after the probe. Route
        // the now-existing user through the six-digit code flow.
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: getCallbackUrl(nextValue),
          },
        });

        if (!otpError) {
          return { ok: true, email, sentAt: Date.now(), userType: "existing" };
        }

        const otpCode = classifySupabaseAuthError(otpError);
        return {
          error: authErrorMessage(otpCode),
          errorCode: otpCode,
          email,
        };
      }

      console.error("Account creation failed.", {
        code: createError.code,
        status: createError.status,
      });
      return {
        error: authErrorMessage(code),
        errorCode: code,
        email,
      };
    }

    createdUserId = data.user?.id ?? null;

    // Send the clickable signup confirmation link. The Confirmation template
    // is separate from the Magic Link template and contains the signup link.
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getCallbackUrl(newUserNextValue),
      },
    });

    if (resendError) {
      const code = classifySupabaseAuthError(resendError);
      console.error("New-user confirmation dispatch failed.", {
        code: resendError.code,
        status: resendError.status,
      });

      // Do not leave a half-provisioned, unconfirmed account behind if the
      // confirmation email could not be sent. The next attempt starts clean.
      if (createdUserId) {
        try {
          await admin.auth.admin.deleteUser(createdUserId);
        } catch {
          console.error("Failed to roll back unconfirmed account.", {
            userId: createdUserId,
          });
        }
      }

      return {
        error: authErrorMessage(code),
        errorCode: code,
        email,
      };
    }
  } catch (error) {
    console.error("New-user signup dispatch failed.", {
      message: error instanceof Error ? error.message : "unknown",
    });

    if (createdUserId) {
      try {
        await admin.auth.admin.deleteUser(createdUserId);
      } catch {
        console.error("Failed to roll back unconfirmed account.", {
          userId: createdUserId,
        });
      }
    }

    return {
      error: authErrorMessage("email_delivery_failed"),
      errorCode: "email_delivery_failed",
      email,
    };
  }

  return {
    ok: true,
    email,
    sentAt: Date.now(),
    userType: "new",
    magicLinkSent: true,
  };
}

/**
 * Verifies a 6-digit email OTP for an existing user and establishes the
 * Supabase session server-side.
 */
export async function verifyEmailOtp(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = normalizeEmail(stringValue(formData, "email"));
  if (!email.ok) {
    return { error: email.error, errorCode: "invalid_email" };
  }

  const otp = stringValue(formData, "otp");
  if (!/^\d{6}$/.test(otp)) {
    return { error: "Enter the 6-digit code.", errorCode: "invalid_otp" };
  }

  const next = stringValue(formData, "next");
  const destination = resolvedNext(next);
  const nextValue = destination.absolute ?? destination.path;

  const limit = await checkAuthRateLimit("otpVerify", email.email);
  if (!limit.allowed) {
    return {
      error: authErrorMessage("rate_limited"),
      errorCode: "rate_limited",
      email: email.email,
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  if (!isSupabaseConfigured()) {
    return { error: authErrorMessage("not_configured"), errorCode: "not_configured" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.email,
      token: otp,
      type: "email",
      options: {
        redirectTo: getCallbackUrl(nextValue),
      },
    });

    if (error) {
      const code = classifySupabaseAuthError(error);
      return {
        error: authErrorMessage(code),
        errorCode: code,
        email: email.email,
      };
    }
  } catch (error) {
    console.error("OTP verification failed.", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      error: authErrorMessage("unknown"),
      errorCode: "unknown",
      email: email.email,
    };
  }

  redirect(verifyDestination(nextValue));
}

/**
 * Resends a 6-digit email OTP to an existing user with rate limiting.
 */
export async function resendOtp(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validation = normalizeEmail(stringValue(formData, "email"));
  if (!validation.ok) {
    return { error: validation.error, errorCode: "invalid_email" };
  }

  const email = validation.email;
  const next = stringValue(formData, "next");
  const destination = resolvedNext(next);
  const nextValue = destination.absolute ?? destination.path;

  const limit = await checkAuthRateLimit("emailSend", email);
  if (!limit.allowed) {
    return {
      error: authErrorMessage("rate_limited"),
      errorCode: "rate_limited",
      email,
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  if (!isSupabaseConfigured()) {
    return { error: authErrorMessage("not_configured"), errorCode: "not_configured" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: getCallbackUrl(nextValue),
      },
    });

    if (error) {
      const code = classifySupabaseAuthError(error);
      return { error: authErrorMessage(code), errorCode: code, email };
    }
  } catch {
    return {
      error: authErrorMessage("email_delivery_failed"),
      errorCode: "email_delivery_failed",
      email,
    };
  }

  return { ok: true, email, sentAt: Date.now() };
}

/**
 * Centralized registration.
 *
 * The service role creates the identity so duplicate accounts can be detected
 * explicitly instead of relying on Supabase's obfuscated signup response. The
 * same email-first verification flow then applies to new and existing users.
 */
export async function signupWithEmail(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validation = normalizeEmail(stringValue(formData, "email"));
  if (!validation.ok) {
    return { error: validation.error, errorCode: "invalid_email" };
  }

  const email = validation.email;
  const next = stringValue(formData, "next");
  const destination = resolvedNext(next);

  // New accounts continue into the admin onboarding flow unless the caller
  // supplied an explicit, validated destination.
  const nextValue =
    destination.absolute ??
    (destination.path !== "/" ? destination.path : `${getAdminOrigin()}/onboarding`);

  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) {
    return { error: authErrorMessage("not_configured"), errorCode: "not_configured" };
  }

  const limit = await checkAuthRateLimit("signup", email);
  if (!limit.allowed) {
    return {
      error: authErrorMessage("rate_limited"),
      errorCode: "rate_limited",
      email,
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  const admin = createSupabaseAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { zerocraft_signup: true, signup_source: "accounts" },
  });

  if (createError) {
    const code = classifySupabaseAuthError(createError);
    if (code === "existing_account") {
      return {
        error: authErrorMessage("existing_account"),
        errorCode: "existing_account",
        email,
      };
    }

    console.error("Account creation failed.", {
      code: createError.code,
      status: createError.status,
    });
    return {
      error: authErrorMessage(
        code === "unknown" ? "email_delivery_failed" : code,
      ),
      errorCode: code === "unknown" ? "unknown" : code,
      email,
    };
  }

  let sent = true;
  try {
    const supabase = await createServerSupabaseClient();
    // New accounts use the Confirmation template (clickable signup link).
    // signInWithOtp would use the Magic Link template, which is now the
    // existing-user six-digit code template.
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getCallbackUrl(nextValue),
      },
    });

    if (error) {
      sent = false;
      console.error("Verification email dispatch failed.", {
        code: error.code,
        status: error.status,
      });
    }
  } catch (error) {
    sent = false;
    console.error("Verification email dispatch failed.", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  redirect(verifyUrl(email, nextValue, sent));
}

/** Sends a fresh verification email with server-side rate limiting. */
export async function resendVerification(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const validation = normalizeEmail(stringValue(formData, "email"));
  if (!validation.ok) {
    return { error: validation.error, errorCode: "invalid_email" };
  }

  const email = validation.email;
  const next = stringValue(formData, "next");
  const destination = resolvedNext(next);
  const nextValue = destination.absolute ?? destination.path;
  const limit = await checkAuthRateLimit("emailSend", email);

  if (!limit.allowed) {
    return {
      error: authErrorMessage("rate_limited"),
      errorCode: "rate_limited",
      email,
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  if (!isSupabaseConfigured()) {
    return { error: authErrorMessage("not_configured"), errorCode: "not_configured" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    // The verify page belongs to the new-account flow, so resend the signup
    // confirmation (Confirmation template) rather than an existing-user code.
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getCallbackUrl(nextValue),
      },
    });

    if (error) {
      const code = classifySupabaseAuthError(error);
      return { error: authErrorMessage(code), errorCode: code, email };
    }
  } catch {
    return {
      error: authErrorMessage("email_delivery_failed"),
      errorCode: "email_delivery_failed",
      email,
    };
  }

  return { ok: true, email, sentAt: Date.now() };
}

/**
 * Starts a real Supabase OAuth flow. The PKCE verifier is created server-side
 * and stored in an HttpOnly cookie; only the provider URL reaches the browser.
 */
export async function startOAuth(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const provider = stringValue(formData, "provider");
  const next = stringValue(formData, "next");

  const allowed =
    (provider === "google" && process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true") ||
    (provider === "apple" && process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true");

  if (!allowed || !isSupabaseConfigured()) {
    return { error: authErrorMessage("not_configured"), errorCode: "not_configured" };
  }

  const destination = resolvedNext(next);
  const nextValue = destination.absolute ?? destination.path;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as "google" | "apple",
      options: {
        redirectTo: getCallbackUrl(nextValue),
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      const code = classifySupabaseAuthError(error);
      return { error: authErrorMessage(code), errorCode: code };
    }

    redirect(data.url);
  } catch (error) {
    console.error("OAuth start failed.", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { error: authErrorMessage("unknown"), errorCode: "unknown" };
  }
}

/** Bound action wrapper that keeps the destination through the flow. */
export async function loginWithEmailBound(formData: FormData): Promise<void> {
  await loginWithEmail(null, formData);
}
