import { expect, test } from "@playwright/test";
import { api, rtwSale, signedIn, uuid } from "./helpers";

/** RTW store: a delivery sale → reception packages → courier takes it → delivered; and a pick-up sale → collected. */
test.describe.serial("RTW store order to the customer", () => {
  let reference = "";

  test("1. RTW reception sells a piece for delivery (simulated mobile money)", async () => {
    ({ reference } = await rtwSale("rtwReception", "delivery"));
    test.info().annotations.push({ type: "order", description: reference });
  });

  test("2. The order shows in RTW Orders under To package, not in the atelier's", async ({ browser }) => {
    const rtw = await signedIn(browser, "rtwReception", "studio");
    await rtw.page.goto("/showroom?view=orders");
    await rtw.page.getByRole("button", { name: /^\d+\s*To package$/ }).click();
    await expect(rtw.page.getByRole("button", { name: `View order ${reference}` })).toBeVisible();
    await rtw.page.screenshot({ path: "e2e-results/rtw-to-package.png", fullPage: true });
    const atelier = await signedIn(browser, "atelierReception", "studio");
    await atelier.page.goto("/showroom?view=orders");
    await expect(atelier.page.getByText("Loading orders…")).toHaveCount(0);
    await expect(atelier.page.getByRole("button", { name: `View order ${reference}` })).toHaveCount(0);
    await rtw.context.close(); await atelier.context.close();
  });

  test("3. RTW reception marks it packaged → Waiting for courier", async ({ browser }) => {
    const { page, context } = await signedIn(browser, "rtwReception", "studio");
    await page.goto("/showroom?view=orders");
    await page.getByRole("button", { name: `View order ${reference}` }).click();
    await page.getByRole("button", { name: "Mark packaged" }).click();
    await expect(page.getByText("Waiting for courier").first()).toBeVisible();
    await page.screenshot({ path: "e2e-results/rtw-packaged.png", fullPage: true });
    await context.close();
  });

  test("4. Courier sees it waiting at the RTW store and takes it", async ({ browser }) => {
    const { page, context } = await signedIn(browser, "courier");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/deliveries");
    const waiting = page.locator("details.courier-waiting");
    await expect(waiting).toBeVisible();
    if (!(await waiting.evaluate((element) => (element as HTMLDetailsElement).open))) await waiting.locator("summary").click();
    const card = page.locator(`[data-reference="${reference}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText("RTW store");
    await page.screenshot({ path: "e2e-results/courier-waiting.png", fullPage: true });
    await card.getByRole("button", { name: /collect it/ }).click();
    await expect(card).toHaveCount(0);
    await context.close();
  });

  test("5. Reception sees the courier on the way", async ({ browser }) => {
    const { page, context } = await signedIn(browser, "rtwReception", "studio");
    await page.goto("/showroom?view=orders");
    await page.getByRole("button", { name: /^\d+\s*Ready for delivery$/ }).click();
    await expect(page.getByRole("row", { name: new RegExp(reference) })).toContainText("Courier on the way");
    await context.close();
  });

  test("6. Courier starts the route and delivers → reception sees Delivered", async ({ browser }) => {
    const courier = await api("courier");
    expect((await courier.post("/api/demo/staff/deliveries/start", { data: { references: [reference] } })).ok()).toBeTruthy();
    const delivered = await courier.post(`/api/demo/staff/deliveries/${reference}/delivered`, { data: { request_id: uuid(), note: "Handed to the customer at the door (E2E)" } });
    expect(delivered.ok(), await delivered.text()).toBeTruthy();
    const { page, context } = await signedIn(browser, "rtwReception", "studio");
    await page.goto("/showroom?view=orders");
    await page.getByRole("button", { name: /^\d+\s*Delivered$/ }).click();
    await expect(page.getByRole("row", { name: new RegExp(reference) })).toContainText("Delivered");
    await context.close();
  });

  test("7. Pick-up sale: packaged → ready for collection → collected", async ({ browser }) => {
    const { reference: pickup } = await rtwSale("rtwReception", "collection");
    const { page, context } = await signedIn(browser, "rtwReception", "studio");
    await page.goto("/showroom?view=orders");
    await page.getByRole("button", { name: `View order ${pickup}` }).click();
    await page.getByRole("button", { name: "Mark packaged" }).click();
    await page.getByRole("button", { name: "Mark ready for collection" }).click();
    await page.getByLabel(/Recipient & handover confirmation/).fill("Collected by the customer at the RTW store (E2E)");
    await page.getByRole("button", { name: "Confirm collection" }).click();
    await expect(page.getByText(/Collected/).first()).toBeVisible();
    await page.screenshot({ path: "e2e-results/rtw-collected.png", fullPage: true });
    await context.close();
  });
});
