import { expect, test } from "@playwright/test";

test("shop controls remain usable at every target width", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "SHOP ALL." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause announcements" })).toBeVisible();
  await expect(page.getByRole("button", { name: "All" }).first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search products" })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("store-shop.png"), fullPage: false });

  await page.getByRole("button", { name: "Tees", exact: true }).last().click();
  await expect(page).toHaveURL(/cat=Tees/);
  await expect(page.getByText(/Showing\s+\d+\s+of\s+\d+\s+designs/i)).toBeVisible();

  await page.getByRole("textbox", { name: "Search products" }).fill("hoodie");
  await expect(page).toHaveURL(/cat=Tees&q=hoodie/);
  await expect(page.getByRole("button", { name: "Clear" })).toBeVisible();
  await page.getByRole("button", { name: "Clear" }).click();

  const firstCard = page.getByRole("button", { name: /Quick view/ }).first();
  await firstCard.focus();
  await firstCard.press("Enter");
  await expect(page.getByRole("button", { name: "ADD TO CART" })).toBeVisible();
  await page.getByRole("button", { name: "ADD TO CART" }).click();
  await expect(page.getByRole("button", { name: /Open cart/ })).toContainText(/\d/);
});

test("reduced motion disables animated ticker", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/shop");
  const ticker = page.locator(".announcement-ticker div");
  await expect(ticker).toHaveCSS("animation-play-state", "paused");
});
