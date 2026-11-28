import { expect, test } from "@playwright/test";
import { api, signedIn, uuid } from "./helpers";

/** Atelier: reception creates orders → production → hand-back unpackaged → reception packages → courier. */
test.describe.serial("Atelier order through production", () => {
  let reference = "";

  test("1. Atelier reception can create a custom order", async () => {
    const reception = await api("atelierReception");
    const customer = (await (await reception.get("/api/demo/staff/customers")).json()).customers[1];
    const response = await reception.post("/api/demo/staff/studio/orders", { data: {
      request_id: uuid(), category: "Custom", service_offering: "bespoke", customer_id: customer.id,
      items: [{ garment_name: "E2E kaftan" }], specifications: "E2E: navy kaftan, gold piping", fulfilment_method: "Collection",
    } });
    expect(response.status(), `custom order by atelier reception: ${await response.text()}`).toBeLessThan(300);
  });

  test("2. Atelier reception creates an alteration and sends it to production", async () => {
    const reception = await api("atelierReception");
    const customer = (await (await reception.get("/api/demo/staff/customers")).json()).customers[2];
    const created = await reception.post("/api/demo/staff/studio/orders", { data: {
      request_id: uuid(), category: "Alterations", customer_id: customer.id, items: [{ garment_name: "E2E trousers" }],
      specifications: "E2E: shorten hem 2cm", fulfilment_method: "Delivery", delivery: { address: "Kwabenya, Accra · E2E" },
    } });
    expect(created.ok(), await created.text()).toBeTruthy();
    reference = (await created.json()).reference;
    test.info().annotations.push({ type: "order", description: reference });
    const sent = await reception.post(`/api/demo/staff/orders/${reference}/send-to-production`);
    expect(sent.ok(), await sent.text()).toBeTruthy();
  });

  test("3. Production finishes the work", async () => {
    const production = await api("production");
    let detail = await (await production.get(`/api/demo/staff/production/${reference}`)).json();
    for (const item of detail.order.items as { id: number }[]) {
      const ready = await production.patch(`/api/demo/staff/production/${reference}/workflow`, { data: { request_id: uuid(), version: detail.order.workflow.version, action: "item_ready", item_id: item.id, ready: true } });
      expect(ready.ok(), await ready.text()).toBeTruthy();
      detail = await (await production.get(`/api/demo/staff/production/${reference}`)).json();
    }
    while (detail.order.workflow.current !== "production_done") {
      const next = detail.order.workflow.next.key;
      const step = await production.patch(`/api/demo/staff/production/${reference}/workflow`, { data: { request_id: uuid(), version: detail.order.workflow.version, action: "advance", stage: next } });
      expect(step.ok(), `${next}: ${await step.text()}`).toBeTruthy();
      detail = await (await production.get(`/api/demo/staff/production/${reference}`)).json();
    }
  });

  test("4. Production sends it to reception, not packaged (in the browser)", async ({ browser }) => {
    const { page, context } = await signedIn(browser, "production");
    await page.goto(`/production?order=${reference}`);
    await page.getByRole("button", { name: "Send to reception, not packaged" }).click();
    await expect(page.getByRole("button", { name: "Send to reception, not packaged" })).toHaveCount(0);
    await context.close();
  });

  test("5. Atelier reception gets the bell alert and packages it", async ({ browser }) => {
    const { page, context } = await signedIn(browser, "atelierReception", "studio");
    await page.goto("/showroom?view=orders");
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.getByText(/Not packaged/).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Collect & package/ }).click();
    await page.getByRole("button", { name: `View order ${reference}` }).click();
    await page.getByRole("button", { name: "Mark packaged" }).click();
    await expect(page.getByText("Waiting for courier").first()).toBeVisible();
    await expect(page.getByText(/operations manager will send this out/i)).toBeVisible();
    await page.screenshot({ path: "e2e-results/atelier-packaged.png", fullPage: true });
    await context.close();
  });

  test("6. Courier sees it waiting at the atelier", async ({ browser }) => {
    const { page, context } = await signedIn(browser, "courier");
    await page.goto("/deliveries");
    await expect(page.locator(`[data-reference="${reference}"]`)).toContainText("atelier");
    await context.close();
  });
});
