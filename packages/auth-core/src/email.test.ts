import { describe, expect, it } from "vitest";

import {
  authErrorMessage,
  classifySupabaseAuthError,
  normalizeEmail,
} from "./email";
import { createRateLimiter } from "./rate-limit";

describe("normalizeEmail", () => {
  it("trims and lowercases valid addresses", () => {
    expect(normalizeEmail("  Person@Example.COM ")).toEqual({
      ok: true,
      email: "person@example.com",
    });
  });

  it("rejects invalid and missing addresses", () => {
    expect(normalizeEmail("not-an-email").ok).toBe(false);
    expect(normalizeEmail("a@b").ok).toBe(false);
    expect(normalizeEmail("").ok).toBe(false);
    expect(normalizeEmail(null).ok).toBe(false);
    expect(normalizeEmail(`${"a".repeat(65)}@example.com`).ok).toBe(false);
  });
});

describe("classifySupabaseAuthError", () => {
  it("maps rate limits", () => {
    expect(classifySupabaseAuthError({ status: 429 })).toBe("rate_limited");
    expect(
      classifySupabaseAuthError({ message: "Email rate limit exceeded" }),
    ).toBe("rate_limited");
  });

  it("maps duplicate accounts", () => {
    expect(
      classifySupabaseAuthError({ code: "email_exists", message: "exists" }),
    ).toBe("existing_account");
    expect(
      classifySupabaseAuthError({ message: "User already registered" }),
    ).toBe("existing_account");
  });

  it("maps user not found variants", () => {
    expect(
      classifySupabaseAuthError({ message: "user not found" }),
    ).toBe("account_not_found");
    expect(
      classifySupabaseAuthError({ message: "user does not exist" }),
    ).toBe("account_not_found");
    expect(
      classifySupabaseAuthError({ message: "account not found" }),
    ).toBe("account_not_found");
    expect(
      classifySupabaseAuthError({ message: "email not found" }),
    ).toBe("account_not_found");
    // signInWithOtp({ shouldCreateUser: false }) returns this for a missing
    // account in current Supabase Auth versions.
    expect(
      classifySupabaseAuthError({
        code: "otp_disabled",
        message: "Signups not allowed for otp",
      }),
    ).toBe("account_not_found");
  });

  it("distinguishes globally disabled signups", () => {
    expect(
      classifySupabaseAuthError({
        code: "signup_disabled",
        message: "Signups not allowed for this instance",
      }),
    ).toBe("signup_disabled");
  });

  it("maps expired and invalid links", () => {
    expect(
      classifySupabaseAuthError({ code: "otp_expired", message: "expired" }),
    ).toBe("expired_link");
    expect(
      classifySupabaseAuthError({ message: "Token has expired or is invalid" }),
    ).toBe("expired_link");
    expect(classifySupabaseAuthError({ message: "Invalid token" })).toBe(
      "invalid_link",
    );
  });

  it("maps invalid OTP codes", () => {
    expect(
      classifySupabaseAuthError({ message: "Invalid OTP code" }),
    ).toBe("invalid_otp");
    expect(
      classifySupabaseAuthError({ message: "incorrect verification code" }),
    ).toBe("invalid_otp");
    expect(
      classifySupabaseAuthError({ code: "otp_invalid", message: "bad code" }),
    ).toBe("invalid_otp");
  });

  it("maps bad credentials without leaking provider detail", () => {
    expect(
      classifySupabaseAuthError({ message: "Invalid login credentials" }),
    ).toBe("invalid_credentials");
  });

  it("returns stable generic copy", () => {
    expect(authErrorMessage("unknown")).not.toContain("Supabase");
    expect(authErrorMessage("existing_account")).toContain("already exists");
  });
});

describe("createRateLimiter", () => {
  it("enforces the minimum interval between sends", () => {
    let now = 1_000;
    const limiter = createRateLimiter(() => now);
    const rule = { max: 3, windowMs: 60_000, minIntervalMs: 30_000 };

    const first = limiter.check("email:a@example.com", rule);
    expect(first.allowed).toBe(true);

    now += 10_000;
    const second = limiter.check("email:a@example.com", rule);
    expect(second.allowed).toBe(false);
    expect(second.retryAfterMs).toBe(20_000);

    now += 25_000;
    expect(limiter.check("email:a@example.com", rule).allowed).toBe(true);
  });

  it("enforces the window maximum and resets after the window", () => {
    let now = 0;
    const limiter = createRateLimiter(() => now);
    const rule = { max: 2, windowMs: 10_000 };

    expect(limiter.check("ip", rule).allowed).toBe(true);
    expect(limiter.check("ip", rule).allowed).toBe(true);
    expect(limiter.check("ip", rule).allowed).toBe(false);

    now = 10_001;
    expect(limiter.check("ip", rule).allowed).toBe(true);
  });

  it("keys limits independently", () => {
    const limiter = createRateLimiter(() => 0);
    const rule = { max: 1, windowMs: 10_000 };
    expect(limiter.check("a", rule).allowed).toBe(true);
    expect(limiter.check("b", rule).allowed).toBe(true);
    expect(limiter.check("a", rule).allowed).toBe(false);
  });
});
