import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveFinancePage } from './finance-navigation.ts';

test('old spending links open the merged register with the right filter', () => {
  assert.deepEqual(resolveFinancePage(undefined, 'recurring'), { id: 'bills', type: 'recurring' });
  assert.deepEqual(resolveFinancePage('expenses'), { id: 'bills', type: 'expenses' });
  assert.deepEqual(resolveFinancePage('debts'), { id: 'bills', type: 'debts' });
});

test('refund and salary detail links retain their intended destination', () => {
  assert.deepEqual(resolveFinancePage('refunds'), { id: 'sales', type: 'refunds' });
  assert.deepEqual(resolveFinancePage('salaries'), { id: 'salaries' });
  assert.deepEqual(resolveFinancePage('reports'), { id: 'reports' });
});

test('unknown and repeated parameters fall back to finance overview', () => {
  assert.deepEqual(resolveFinancePage('missing'), { id: undefined });
  assert.deepEqual(resolveFinancePage(['sales', 'bills']), { id: undefined });
});
