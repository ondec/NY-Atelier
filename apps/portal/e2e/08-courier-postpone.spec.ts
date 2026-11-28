import { expect, test } from "@playwright/test";
import { api, rtwSale, uuid } from "./helpers";

/** Customer not home: courier postpones → order back to Packaged, off the route. */
test("courier postpones a delivery", async () => {
  const { reference } = await rtwSale("rtwReception", "delivery");
  const reception = await api("rtwReception");
  const order = (await (await reception.get(`/api/demo/staff/orders/${reference}`)).json()).order;
  expect((await reception.patch(`/api/demo/staff/orders/${reference}/workflow`, { data: { request_id: uuid(), version: order.workflow.version, action: "advance", stage: "packaged" } })).ok()).toBeTruthy();
  const courier = await api("courier");
  expect((await courier.post(`/api/demo/staff/deliveries/${reference}/claim`)).ok()).toBeTruthy();
  expect((await courier.post("/api/demo/staff/deliveries/start", { data: { references: [reference] } })).ok()).toBeTruthy();
  const postponed = await courier.post(`/api/demo/staff/deliveries/${reference}/postpone`, { data: { reason: "Customer not home (E2E)", request_id: uuid() } });
  expect(postponed.ok(), await postponed.text()).toBeTruthy();
  const after = (await (await reception.get(`/api/demo/staff/orders/${reference}`)).json()).order;
  expect(after.workflow.current).toBe("packaged");
});
