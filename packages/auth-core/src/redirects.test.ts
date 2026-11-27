import { describe, expect, it } from "vitest";

import {
  absoluteUrlPathOnAllowedOrigin,
  buildCallbackUrl,
  isSafeOrigin,
  resolvePostAuthDestination,
  safeRedirectPath,
} from "./redirects";

describe("safeRedirectPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeRedirectPath("/overview?tab=1#top")).toBe("/overview?tab=1#top");
    expect(safeRedirectPath("/accept-invite?token=abc")).toBe(
      "/accept-invite?token=abc",
    );
  });

  it("rejects absolute URLs and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/");
    expect(safeRedirectPath("//evil.example")).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
    expect(safeRedirectPath("/%2f%2fevil.example")).toBe("/");
    expect(safeRedirectPath("/%5cevil.example")).toBe("/");
  });

  it("rejects control characters and javascript schemes", () => {
    expect(safeRedirectPath("/ok\nLocation: https://evil.example")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
    expect(safeRedirectPath("/%0d%0aSet-Cookie: x=1")).toBe("/");
  });

  it("uses the provided fallback", () => {
    expect(safeRedirectPath("https://evil.example", "/login")).toBe("/login");
    expect(safeRedirectPath(null, "/login")).toBe("/login");
  });
});

describe("isSafeOrigin", () => {
  it("permits HTTPS and loopback development origins", () => {
    expect(isSafeOrigin("https://admin.zerocraft.in")).toBe(true);
    expect(isSafeOrigin("http://localhost:3000")).toBe(true);
    expect(isSafeOrigin("http://127.0.0.1:3001")).toBe(true);
  });

  it("rejects credentials, non-HTTP schemes and plain HTTP on the internet", () => {
    expect(isSafeOrigin("https://user:pass@admin.zerocraft.in")).toBe(false);
    expect(isSafeOrigin("javascript:alert(1)")).toBe(false);
    expect(isSafeOrigin("http://admin.zerocraft.in")).toBe(false);
  });
});

describe("resolvePostAuthDestination", () => {
  const config = {
    accountsOrigin: "https://accounts.zerocraft.in",
    adminOrigin: "https://admin.zerocraft.in",
  };

  it("keeps accounts-relative destinations in accounts", () => {
    expect(resolvePostAuthDestination("/reset-password", config)).toEqual({
      type: "accounts",
      path: "/reset-password",
    });
  });

  it("accepts absolute admin destinations only on the configured origin", () => {
    expect(
      resolvePostAuthDestination(
        "https://admin.zerocraft.in/accept-invite?token=abc",
        config,
      ),
    ).toEqual({
      type: "admin",
      path: "/accept-invite?token=abc",
    });

    expect(
      resolvePostAuthDestination("https://admin.zerocraft.in.evil.com/x", config),
    ).toEqual({ type: "fallback", path: "/" });
  });

  it("rejects credential-bearing and javascript URLs", () => {
    expect(
      resolvePostAuthDestination("https://x@admin.zerocraft.in/x", config),
    ).toEqual({ type: "fallback", path: "/" });
    expect(resolvePostAuthDestination("javascript:alert(1)", config)).toEqual({
      type: "fallback",
      path: "/",
    });
  });
});

describe("absoluteUrlPathOnAllowedOrigin", () => {
  it("returns only a path for an allowed origin", () => {
    expect(
      absoluteUrlPathOnAllowedOrigin("https://admin.zerocraft.in/overview", [
        "https://admin.zerocraft.in",
      ]),
    ).toEqual({ origin: "https://admin.zerocraft.in", path: "/overview" });
  });

  it("rejects subdomain lookalikes", () => {
    expect(
      absoluteUrlPathOnAllowedOrigin("https://admin.zerocraft.in.evil.com/", [
        "https://admin.zerocraft.in",
      ]),
    ).toBeNull();
  });
});

describe("buildCallbackUrl", () => {
  it("preserves relative and admin next values", () => {
    const url = new URL(
      buildCallbackUrl("https://accounts.zerocraft.in", "/reset-password"),
    );
    expect(url.origin).toBe("https://accounts.zerocraft.in");
    expect(url.pathname).toBe("/callback");
    expect(url.searchParams.get("next")).toBe("/reset-password");

    const adminUrl = new URL(
      buildCallbackUrl(
        "https://accounts.zerocraft.in",
        "https://admin.zerocraft.in/onboarding",
        { adminOrigin: "https://admin.zerocraft.in" },
      ),
    );
    expect(adminUrl.searchParams.get("next")).toBe(
      "https://admin.zerocraft.in/onboarding",
    );
  });

  it("drops an external next value", () => {
    const url = new URL(
      buildCallbackUrl("https://accounts.zerocraft.in", "https://evil.example/"),
    );
    expect(url.searchParams.get("next")).toBeNull();
  });
});
