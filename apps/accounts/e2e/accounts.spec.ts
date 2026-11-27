import { test, expect } from "@playwright/test";

test.describe("Zerocraft Accounts gateway", () => {
  test("renders the home page with destinations", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Zerocraft Accounts/);
    await expect(
      page.getByRole("heading", { name: "Welcome to Zerocraft" })
    ).toBeVisible();
    await expect(
      page.getByText("One account for everything you build.")
    ).toBeVisible();

    // Workspace destination should exist
    await expect(page.getByText("Your workspace")).toBeVisible();

    // Partners and Community should render as "Coming soon" when URLs are not configured
    await expect(page.getByText("Zerocraft Partners")).toBeVisible();
    await expect(page.getByText("Zerocraft Community")).toBeVisible();
  });

  test("has a working log in link", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("main")
      .getByRole("link", { name: "Log in" })
      .click();
    await expect(page).toHaveURL(/.*\/login/);
    await expect(
      page.getByRole("heading", { name: "Welcome to Zerocraft" })
    ).toBeVisible();
  });
});

test.describe("Login page", () => {
  test("renders email-first passwordless form", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Welcome to Zerocraft" })
    ).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Continue with email/ })
    ).toBeVisible();
    // No password input
    await expect(page.getByLabel("Password")).not.toBeVisible();
    // No forgot password link
    await expect(page.getByRole("link", { name: /Forgot/i })).not.toBeVisible();
  });

  test("shows Google login when enabled", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: /Continue with Google/ })
    ).toBeVisible();
  });

  test("validates email input", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Continue with email/ }).click();
    await expect(
      page.getByRole("alert", { name: /Enter a valid email/ })
    ).toBeVisible();
  });
});

test.describe("Verify page (Magic Link)", () => {
  test("redirects to login when no email is provided", async ({ page }) => {
    await page.goto("/verify");
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("renders magic link confirmation screen", async ({ page }) => {
    await page.goto("/verify?email=test@example.com&sent=1");
    await expect(
      page.getByRole("heading", { name: "Check your inbox" })
    ).toBeVisible();
    await expect(page.getByText("test@example.com")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Resend email/ })
    ).toBeVisible();
  });
});

test.describe("OTP page (Existing User)", () => {
  test("renders OTP verification screen", async ({ page }) => {
    await page.goto("/otp?email=test@example.com");
    await expect(
      page.getByRole("heading", { name: "Enter your code" })
    ).toBeVisible();
    await expect(page.getByText("test@example.com")).toBeVisible();
    // Six OTP input fields
    for (let i = 1; i <= 6; i++) {
      await expect(
        page.getByLabel(`Digit ${i} of 6`)
      ).toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: /Verify code/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Resend code/ })
    ).toBeVisible();
  });

  test("redirects to login when no email is provided", async ({ page }) => {
    await page.goto("/otp");
    await expect(page).toHaveURL(/.*\/login/);
  });
});

test.describe("Logout route", () => {
  test("redirects to login with logged_out flag", async ({ page }) => {
    await page.goto("/logout");
    await expect(page).toHaveURL(/.*\/login.*logged_out/);
  });
});
