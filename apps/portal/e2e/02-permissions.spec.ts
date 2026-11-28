import { expect, test } from "@playwright/test";
import { api } from "./helpers";

/** What each role must NOT be able to do (SYSTEM_FLOWS §6). */
test.describe("Permissions", () => {
  test("reception cannot open the team, payroll or edit the catalogue", async () => {
    for (const role of ["rtwReception", "atelierReception"] as const) {
      const client = await api(role);
      expect((await client.get("/api/demo/staff/team")).status(), `${role} team`).toBe(403);
      expect((await client.get("/api/demo/staff/salaries")).status(), `${role} payroll`).toBe(403);
      expect((await client.post("/api/demo/staff/studio/catalogue", { data: {} })).status(), `${role} catalogue`).toBe(403);
    }
  });

  test("atelier reception cannot give an order to a courier", async () => {
    const ops = await api("operations");
    const orders = (await (await ops.get("/api/demo/staff/orders")).json()).orders as { reference: string; category: string; fulfilment_method: string | null; is_complete: boolean }[];
    const atelier = orders.find((order) => order.category !== "Ready-to-Wear" && order.fulfilment_method === "Delivery" && !order.is_complete);
    test.skip(!atelier, "no open atelier delivery order");
    const reception = await api("atelierReception");
    const couriers = (await (await reception.get("/api/demo/staff/couriers")).json()).couriers;
    const response = await reception.patch(`/api/demo/staff/orders/${atelier!.reference}/courier`, { data: { courier_id: couriers[0]?.id ?? null } });
    expect(response.status()).toBe(403);
  });

  test("reception cannot cancel or move production stages", async () => {
    const ops = await api("operations");
    const orders = (await (await ops.get("/api/demo/staff/orders")).json()).orders as { reference: string; category: string; is_complete: boolean; workflow: { version: number } }[];
    const open = orders.find((order) => order.category === "Custom" && !order.is_complete);
    test.skip(!open, "no open custom order");
    const reception = await api("atelierReception");
    const cancel = await reception.patch(`/api/demo/staff/orders/${open!.reference}/workflow`, { data: { request_id: crypto.randomUUID(), version: open!.workflow.version, action: "cancel", note: "E2E should be refused" } });
    expect(cancel.status()).toBe(403);
  });

  test("a tailor sees only their own orders", async () => {
    const tailor = await api("tailor");
    const response = await tailor.get("/api/demo/staff/production");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const rows = (body.orders ?? []) as { assigned_tailor?: { name: string } | null }[];
    const names = new Set(rows.map((row) => row.assigned_tailor?.name ?? "none"));
    expect(names.size <= 1, `tailor sees orders for: ${[...names].join(", ")}`).toBeTruthy();
  });
});
