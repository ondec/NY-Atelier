import { expect, test } from "@playwright/test";
import { signedIn } from "./helpers";

/** RTW reception sells a piece entirely by clicking, pays with simulated mobile money, delivery. */
test("RTW reception completes a sale by clicking", async ({ browser }) => {
  const { page, context } = await signedIn(browser, "rtwReception", "studio");
  await page.goto("/showroom?view=collection");
  const basket = page.getByRole("complementary", { name: "Current sale" });
  // Start from an empty sale.
  for (let left = await basket.getByRole("button", { name: /^Remove / }).count(); left > 0; left--) await basket.getByRole("button", { name: /^Remove / }).first().click();
  const add = page.getByRole("button", { name: "Add to sale" });
  let added = false;
  for (let product = 0; product < 6 && !added; product++) {
    await page.goto("/showroom?view=collection");
    await page.locator(".showroom-pos-grid > *").nth(product).click();
    const sizes = page.locator(".showroom-sizes button:not([disabled])");
    for (let size = 0; size < await sizes.count(); size++) {
      await sizes.nth(size).click();
      if (await add.isEnabled()) { await add.click(); added = true; break; }
    }
  }
  expect(added, "some piece in stock").toBeTruthy();
  const pay = basket.getByRole("button", { name: "Continue to payment" });
  if (!(await pay.isEnabled())) {
    await basket.locator("button").first().click();
    await page.locator(".showroom-person").first().click();
  }
  await pay.click();
  const checkout = page.locator(".studio-checkout");
  await checkout.getByText("Mobile money").click();
  await checkout.getByLabel(/reference/i).fill(`E2E-UI-${Date.now()}`);
  await checkout.getByLabel(/payment is received/i).check();
  await checkout.getByRole("combobox", { name: "Handover" }).selectOption("delivery");
  await checkout.getByLabel(/Delivery address/).fill("Haatso, Accra · E2E UI sale");
  await checkout.getByRole("button", { name: /Complete|Record|Confirm/ }).last().click();
  await expect(page.getByText(/receipt|Sale complete|recorded/i).first()).toBeVisible();
  await page.screenshot({ path: "e2e-results/studio-sale-done.png", fullPage: true });
  await context.close();
});
