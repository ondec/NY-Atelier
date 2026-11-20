import test from 'node:test';
import assert from 'node:assert/strict';
import {readSaleDraft, saleDraftKey} from './studio-sale-draft.ts';
const now = 100000000;
const draft = {lines: [{variantId: 'olive-M', quantity: 2}, {variantId: 'navy-L', quantity: 1}], customerId: 3, updatedAt: now};
test('sale drafts retain purchasable variant IDs and quantities without trusting stored prices', () => {
  assert.deepEqual(readSaleDraft(JSON.stringify({...draft, total: 1}), now), draft);
  assert.notEqual(saleDraftKey(1), saleDraftKey(2));
});
test('expired, future, invalid and duplicate drafts are rejected', () => {
  assert.equal(readSaleDraft(JSON.stringify(draft), now + 8*60*60*1000 + 1), undefined);
  assert.equal(readSaleDraft(JSON.stringify(draft), now - 1), undefined);
  for (const raw of [null, '{', 'null', JSON.stringify({...draft, lines: []}), JSON.stringify({...draft, lines: [draft.lines[0], draft.lines[0]]})]) assert.equal(readSaleDraft(raw, now), undefined);
  for (const quantity of [-1, 0, 1.5, '2', Number.MAX_SAFE_INTEGER + 1]) assert.equal(readSaleDraft(JSON.stringify({...draft, lines: [{variantId: 'olive-M', quantity}]}), now), undefined);
});
