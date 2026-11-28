import { expect, test } from "@playwright/test";
import { password, roles } from "./helpers";

/** The real staff sign-in page, typed like a person: wrong password refused, right one lands in the right place. */
test.describe("Staff sign-in page", () => {
  test("wrong password is refused with a clear message", async ({ page }) => {
    await page.goto("/staff/sign-in");
    await page.getByLabel(/Staff email/i).fill(roles.operations);
    await page.getByLabel(/^Password/i).fill("not-the-password");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page).toHaveURL(/sign-in/);
  });

  for (const [role, landing] of [["operations", /\/office\/operations/], ["rtwReception", /\/showroom/], ["courier", /\/deliveries/]] as const) {
    test(`${role} signs in through the form`, async ({ page }) => {
      await page.goto("/staff/sign-in");
      await page.getByLabel(/Staff email/i).fill(roles[role]);
      await page.getByLabel(/^Password/i).fill(password);
      await page.getByRole("button", { name: /Sign in/ }).click();
      await expect(page).toHaveURL(landing);
    });
  }

  test("forgot password link opens the reset page", async ({ page }) => {
    await page.goto("/staff/sign-in");
    await page.getByRole("link", { name: /Forgot password/i }).click();
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/staff\/sign-in$/);
  });
});
