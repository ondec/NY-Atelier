import assert from "node:assert/strict";
import { test } from "node:test";
import { chartDomain, axisMoney, financeDate, financeRange } from "./finance-overview.ts";

test("cash flow scales include zero and preserve negative and mixed cash movement", () => {
  const negative = chartDomain([-50001, -37656, -17661], true);
  assert.ok(negative.min <= -50001);
  assert.equal(negative.max, 0);
  const mixed = chartDomain([-500, 1200, -2500], true);
  assert.ok(mixed.min <= -2500 && mixed.max >= 1200);
  assert.ok(mixed.ticks.includes(0));
});

test("zero and single-pesewa records produce finite chart ranges and distinct money labels", () => {
  for (const values of [[], [0], [0, 0], [1], [-1]]) {
    const domain = chartDomain(values, true);
    assert.ok(Number.isFinite(domain.min) && Number.isFinite(domain.max) && domain.max > domain.min);
    assert.ok(domain.ticks.length > 1);
  }
  assert.notEqual(axisMoney(1), axisMoney(0));
  assert.equal(axisMoney(12345), "123.5");
});

test("chart dates use Accra dates and month labels across year boundaries", () => {
  assert.equal(financeDate("2026-01-01"), "1 Jan");
  assert.equal(financeDate("2025-12-31", true), "Dec");
  assert.equal(financeRange("2025-12-17", "2026-01-15"), "17 Dec 2025 – 15 Jan 2026");
  assert.equal(financeRange("2026-11-01", "2026-11-21"), "1 Nov – 21 Nov, 2026");
});
