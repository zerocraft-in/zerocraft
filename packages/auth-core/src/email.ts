/** Email normalization and stable authentication error copy. */

const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export type EmailValidationResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export function normalizeEmail(input: unknown): EmailValidationResult {
  if (typeof input !== "string") {
    return { ok: false, error: "Enter your email address." };
  }

  const email = input.trim().toLowerCase();
  if (!email) return { ok: false, error: "Enter your email address." };
  if (email.length > 254) {
    return { ok: false, error: "That email address is too long." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const [localPart] = email.split("@");
  if (!localPart || localPart.length > 64) {
    return { ok: false, error: "Enter a valid email address." };
  }

  return { ok: true, email };
}

export type AuthFailureCode =
  | "invalid_email"
  | "rate_limited"
  | "invalid_credentials"
  | "invalid_otp"
  | "existing_account"
  | "account_not_found"
  | "signup_disabled"
  | "email_delivery_failed"
  | "not_configured"
  | "expired_link"
  | "invalid_link"
  | "handoff_failed"
  | "unknown";

const MESSAGES: Record<AuthFailureCode, string> = {
  invalid_email: "Enter a valid email address.",
  rate_limited:
    "Too many attempts. Please wait a moment before trying again.",
  invalid_credentials: "Email or password is incorrect.",
  invalid_otp: "Invalid code. Please try again.",
  existing_account:
    "An account with this email already exists. Log in instead.",
  account_not_found:
    "We couldn’t find an account with that email address. Create an account instead.",
  signup_disabled:
    "New account creation is currently unavailable. Contact your administrator.",
  email_delivery_failed:
    "We couldn’t send the email. Please try again in a moment.",
  not_configured:
    "Authentication is not configured for this environment. Contact your administrator.",
  expired_link:
    "That link has expired. Request a new email to continue.",
  invalid_link:
    "That link is invalid or has already been used. Request a new email.",
  handoff_failed:
    "We couldn’t complete sign-in to your workspace. Please try again.",
  unknown: "Something went wrong. Please try again.",
};

export function authErrorMessage(code: AuthFailureCode): string {
  return MESSAGES[code] ?? MESSAGES.unknown;
}

/**
 * Maps known Supabase auth errors to stable UI codes. The original provider
 * message is never surfaced: it can leak whether an account exists and often
 * contains provider internals.
 */
export function classifySupabaseAuthError(
  error: { message?: string; status?: number; code?: string } | null | undefined,
): AuthFailureCode {
  if (!error) return "unknown";

  if (error.status === 429) return "rate_limited";

  const message = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();

  if (message.includes("rate limit") || code.includes("rate_limit")) {
    return "rate_limited";
  }
  if (
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already exists")
  ) {
    return "existing_account";
  }
  if (
    code === "otp_expired" ||
    message.includes("expired") ||
    message.includes("token has expired")
  ) {
    return "expired_link";
  }
  if (
    message.includes("invalid otp") ||
    message.includes("invalid code") ||
    message.includes("verification code") ||
    message.includes("incorrect code")
  ) {
    return "invalid_otp";
  }
  if (code === "otp_invalid" || code === "invalid_otp") {
    return "invalid_otp";
  }
  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials")
  ) {
    return "invalid_credentials";
  }
  if (code === "signup_disabled") {
    return "signup_disabled";
  }
  if (
    code === "otp_disabled" ||
    message.includes("signups not allowed") ||
    message.includes("user not found") ||
    message.includes("user does not exist") ||
    message.includes("account not found") ||
    message.includes("email not found")
  ) {
    return "account_not_found";
  }
  if (
    message.includes("error sending") ||
    message.includes("smtp") ||
    message.includes("email send")
  ) {
    return "email_delivery_failed";
  }
  if (message.includes("invalid") || message.includes("not found")) {
    return "invalid_link";
  }

  return "unknown";
}
