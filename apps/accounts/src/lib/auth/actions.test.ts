import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  startEmailAuth,
  verifyEmailOtp,
  resendOtp,
  resendVerification,
} from "./actions";
import { checkAuthRateLimit } from "@/lib/auth/rate-limit";

vi.mock("@/lib/auth/config", () => ({
  isSupabaseConfigured: vi.fn(() => true),
  isServiceRoleConfigured: vi.fn(() => true),
  getCallbackUrl: vi.fn((next) => `http://localhost:3001/callback${next ? `?next=${next}` : ""}`),
  getAdminOrigin: vi.fn(() => "http://localhost:3000"),
  getOriginConfig: vi.fn(() => ({
    accountsOrigin: "http://localhost:3001",
    adminOrigin: "http://localhost:3000",
  })),
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  checkAuthRateLimit: vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 })),
}));

vi.mock("@zerocraft/auth-core", () => ({
  resolvePostAuthDestination: vi.fn((input) => ({
    type: "accounts" as const,
    path: input || "/",
  })),
  safeRedirectPath: vi.fn((input, fallback = "/") => input || fallback),
  normalizeEmail: vi.fn((input: unknown) => {
    if (typeof input !== "string") return { ok: false, error: "Enter your email address." };
    const email = input.trim().toLowerCase();
    if (!email) return { ok: false, error: "Enter your email address." };
    const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (!emailPattern.test(email)) return { ok: false, error: "Enter a valid email address." };
    return { ok: true, email };
  }),
  authErrorMessage: vi.fn((code: string) => `Error: ${code}`),
  classifySupabaseAuthError: vi.fn((error: { message?: string; code?: string; status?: number }) => {
    const message = (error?.message ?? "").toLowerCase();
    const code = (error?.code ?? "").toLowerCase();
    if (error?.status === 429 || code.includes("rate_limit")) return "rate_limited";
    if (code === "signup_disabled") return "signup_disabled";
    if (code === "otp_disabled" || message.includes("signups not allowed")) return "account_not_found";
    if (code === "email_exists" || message.includes("already registered") || message.includes("already exists")) {
      return "existing_account";
    }
    if (message.includes("error sending") || message.includes("smtp") || message.includes("email send")) {
      return "email_delivery_failed";
    }
    if (message.includes("invalid otp") || message.includes("invalid code") || code === "otp_invalid") {
      return "invalid_otp";
    }
    if (message.includes("expired") || code === "otp_expired") {
      return "expired_link";
    }
    if (message.includes("user not found")) {
      return "account_not_found";
    }
    return "unknown";
  }),
}));

const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
      },
    },
  })),
}));

const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockResend = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
      resend: mockResend,
    },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteUser.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.resetAllMocks();
});

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

describe("startEmailAuth", () => {
  it("rejects invalid email", async () => {
    const result = await startEmailAuth(null, formData({ email: "not-an-email" }));
    expect(result?.errorCode).toBe("invalid_email");
  });

  it("sends the six-digit code template to an existing user", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });

    const result = await startEmailAuth(
      null,
      formData({ email: "Existing@Example.com", next: "/" }),
    );

    expect(result?.ok).toBe(true);
    expect(result?.userType).toBe("existing");
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: "existing@example.com",
      options: expect.objectContaining({
        shouldCreateUser: false,
      }),
    });
    // Existing users must never be created or sent a signup confirmation.
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("creates a new account and sends the signup confirmation template", async () => {
    // The probe for a missing account returns otp_disabled.
    mockSignInWithOtp.mockResolvedValueOnce({
      error: { message: "Signups not allowed for otp", code: "otp_disabled", status: 422 },
    });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "new-user-id" } },
      error: null,
    });
    mockResend.mockResolvedValueOnce({ error: null });

    const result = await startEmailAuth(
      null,
      formData({ email: "new@example.com", next: "/" }),
    );

    expect(result?.ok).toBe(true);
    expect(result?.userType).toBe("new");
    expect(result?.magicLinkSent).toBe(true);
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        email_confirm: false,
      }),
    );
    // The confirmation email must be sent through resend(type: signup), not
    // signInWithOtp, so it uses the Confirmation template rather than the
    // existing-user code template.
    expect(mockResend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "signup",
        email: "new@example.com",
      }),
    );
    expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
  });

  it("falls back to the existing-user flow when account creation races", async () => {
    mockSignInWithOtp
      .mockResolvedValueOnce({
        error: { message: "Signups not allowed for otp", code: "otp_disabled", status: 422 },
      })
      .mockResolvedValueOnce({ error: null });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "A user with this email address has already been registered", code: "email_exists", status: 422 },
    });

    const result = await startEmailAuth(
      null,
      formData({ email: "race@example.com", next: "/" }),
    );

    expect(result?.ok).toBe(true);
    expect(result?.userType).toBe("existing");
    expect(mockResend).not.toHaveBeenCalled();
    expect(mockSignInWithOtp).toHaveBeenCalledTimes(2);
  });

  it("rolls back the unconfirmed account when confirmation delivery fails", async () => {
    mockSignInWithOtp.mockResolvedValueOnce({
      error: { message: "Signups not allowed for otp", code: "otp_disabled", status: 422 },
    });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "new-user-id" } },
      error: null,
    });
    mockResend.mockResolvedValueOnce({
      error: { message: "For security purposes, you can only request this after 0 seconds.", code: "over_email_send_rate_limit", status: 429 },
    });

    const result = await startEmailAuth(
      null,
      formData({ email: "new@example.com", next: "/" }),
    );

    expect(result?.ok).toBeUndefined();
    expect(result?.errorCode).toBe("rate_limited");
    expect(mockDeleteUser).toHaveBeenCalledWith("new-user-id");
  });

  it("fails closed on a real probe delivery error", async () => {
    mockSignInWithOtp.mockResolvedValueOnce({
      error: { message: "Error sending email", code: "unexpected_failure", status: 500 },
    });

    const result = await startEmailAuth(
      null,
      formData({ email: "test@example.com", next: "/" }),
    );

    expect(result?.errorCode).toBe("email_delivery_failed");
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("handles rate limiting", async () => {
    vi.mocked(checkAuthRateLimit).mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 30,
    });

    const result = await startEmailAuth(
      null,
      formData({ email: "test@example.com" }),
    );

    expect(result?.errorCode).toBe("rate_limited");
    expect(result?.retryAfterSeconds).toBe(30);
  });
});

describe("verifyEmailOtp", () => {
  it("rejects invalid OTP format", async () => {
    const result = await verifyEmailOtp(
      null,
      formData({ email: "test@example.com", otp: "123" }),
    );
    expect(result?.errorCode).toBe("invalid_otp");
  });

  it("rejects invalid email", async () => {
    const result = await verifyEmailOtp(
      null,
      formData({ email: "not-an-email", otp: "123456" }),
    );
    expect(result?.errorCode).toBe("invalid_email");
  });

  it("verifies valid OTP and redirects", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null });

    await expect(
      verifyEmailOtp(
        null,
        formData({ email: "test@example.com", otp: "123456", next: "/" }),
      ),
    ).rejects.toThrow();

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: "test@example.com",
      token: "123456",
      type: "email",
      options: {
        redirectTo: "http://localhost:3001/callback?next=/",
      },
    });
  });

  it("handles invalid OTP error", async () => {
    mockVerifyOtp.mockResolvedValue({
      error: { message: "Invalid OTP code", code: "otp_invalid", status: 400 },
    });

    const result = await verifyEmailOtp(
      null,
      formData({ email: "test@example.com", otp: "000000", next: "/" }),
    );

    expect(result?.errorCode).toBe("invalid_otp");
  });
});

describe("resendOtp", () => {
  it("resends the existing-user code successfully", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });

    const result = await resendOtp(
      null,
      formData({ email: "test@example.com", next: "/" }),
    );

    expect(result?.ok).toBe(true);
    expect(result?.email).toBe("test@example.com");
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: "test@example.com",
      options: expect.objectContaining({
        shouldCreateUser: false,
      }),
    });
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("handles rate limiting", async () => {
    vi.mocked(checkAuthRateLimit).mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 60,
    });

    const result = await resendOtp(
      null,
      formData({ email: "test@example.com" }),
    );

    expect(result?.errorCode).toBe("rate_limited");
    expect(result?.retryAfterSeconds).toBe(60);
  });
});

describe("resendVerification", () => {
  it("resends the signup confirmation template", async () => {
    mockResend.mockResolvedValue({ error: null });

    const result = await resendVerification(
      null,
      formData({ email: "new@example.com", next: "/" }),
    );

    expect(result?.ok).toBe(true);
    expect(mockResend).toHaveBeenCalledWith({
      type: "signup",
      email: "new@example.com",
      options: expect.objectContaining({
        emailRedirectTo: expect.stringContaining("/callback"),
      }),
    });
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });
});
