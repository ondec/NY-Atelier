import { expect, test } from "@playwright/test";
import { signedIn } from "./helpers";

/** Every role signs in and lands where they work, seeing only their own sections. */
test.describe("Sign-in and landing per role", () => {
  for (const [role, destination, path, mustSee, mustNotSee] of [
    ["owner", "office", "/office/owner", "Overview", null],
    ["operations", "office", "/office/operations", "Overview", "Payroll"],
    ["rtwReception", "studio", "/showroom", "Ready-to-Wear", "Fittings"],
    ["atelierReception", "studio", "/showroom", "Fittings", null],
    ["production", "office", "/production", "What are we making?", null],
    ["tailor", "office", "/production", "Your work.", null],
    ["courier", "office", "/deliveries", "Deliveries", null],
    ["catalogue", "office", "/ready-to-wear", "Ready-to-Wear", null],
  ] as const) {
    test(`${role} lands on ${path}`, async ({ browser }) => {
      const { page, context } = await signedIn(browser, role, destination);
      await page.goto(path);
      await expect(page.getByText(mustSee).first()).toBeVisible();
      await expect(page.getByText(/access restricted/i)).toHaveCount(0);
      if (mustNotSee) await expect(page.getByRole("button", { name: mustNotSee, exact: true })).toHaveCount(0);
      await page.screenshot({ path: `e2e-results/landing-${role}.png`, fullPage: true });
      await context.close();
    });
  }
});
