import assert from "node:assert/strict";
import test from "node:test";
import { orderAttention, statusTone } from "./status.ts";

const order = { status: "Adjustments in progress", is_complete: false, expected_completion_date: "2026-11-16", client_action: null };

test("ready work and partial payments are distinct from completed work", () => {
  assert.equal(statusTone("Final checks complete"), "ready");
  assert.equal(statusTone("Collected"), "success");
  assert.equal(statusTone("Simulated deposit recorded"), "info");
  assert.equal(statusTone("Simulated full payment received"), "success");
});

test("unknown, cancelled and unrecorded states never imply success or failure", () => {
  for (const status of ["Cancelled", "Canceled", "Not recorded", "To be agreed", "An unrecognised stage"]) assert.equal(statusTone(status), "neutral");
  assert.equal(statusTone("Payment failed"), "danger");
  assert.equal(statusTone("Out of stock"), "danger");
});

test("due today stays a warning and only past dates become overdue", () => {
  assert.equal(orderAttention(order, "2026-11-16")?.label, "Due today");
  assert.equal(orderAttention(order, "2026-11-17")?.tone, "danger");
  assert.equal(orderAttention(order, "2026-11-15"), undefined);
});

test("closed orders do not raise overdue alarms even with an old expected date", () => {
  for (const status of ["Cancelled", "Canceled", "Finished", "Collected", "Delivered", "Completed"]) assert.equal(orderAttention({ ...order, status }, "2026-11-20"), undefined);
  assert.equal(orderAttention({ ...order, is_complete: true }, "2026-11-20"), undefined);
});

test("customer action is visible without a date, with overdue taking priority", () => {
  assert.equal(orderAttention({ ...order, expected_completion_date: null, client_action: "Please confirm fit" }, "2026-11-16")?.label, "Action needed");
  assert.equal(orderAttention({ ...order, client_action: "Please confirm fit" }, "2026-11-17")?.label, "Overdue");
});
