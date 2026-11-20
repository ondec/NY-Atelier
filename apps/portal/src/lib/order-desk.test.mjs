import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) { return nextResolve(['./status','./order-source'].includes(specifier) ? `${specifier}.ts` : specifier, context); } });
const { filterOrderDesk, parseOrderType } = await import('./order-desk.ts');
const { alterationContext } = await import('./alteration-context.ts');
const { orderSourceLabel } = await import('./order-source.ts');
const base = { category: '', status: 'all', query: '', stage: '', fulfilment: '' };
const orders = [
  { reference: 'NY-ALT-1', source: 'studio', category: 'Alterations', customer_name: 'Ama', status: 'In progress', is_complete: false, fulfilment_method: 'Collection', items: [{ garment_name: 'Red Clover hem adjustment' }] },
  { reference: 'NY-RTW-1', source: 'customer_app', category: 'Ready-to-Wear', customer_name: 'Ama', status: 'Preparing', is_complete: false, fulfilment_method: 'Delivery', items: [{ garment_name: 'Red Clover Set' }] },
  { reference: 'NY-CUS-1', source: 'office', category: 'Custom', service_offering: 'Bespoke Tailor-Made Clothing', customer_name: 'Ama', status: 'Collected', is_complete: true, fulfilment_method: 'Collection', items: [{ garment_name: 'Suit' }] },
  { reference: 'NY-ALT-2', category: 'Alterations', customer_name: 'Ama', status: 'Cancelled', is_complete: true, items: [{ garment_name: 'Shirt' }] },
];
const refs = filters => filterOrderDesk(orders, { ...base, ...filters }).map(order => order.reference);

test('source labels and filters distinguish channels without guessing legacy origins', () => {
  assert.equal(orderSourceLabel('studio'), 'Studio');
  assert.equal(orderSourceLabel('customer_app'), 'Customer app');
  assert.equal(orderSourceLabel('office'), 'Office');
  for (const source of [null,undefined,'unknown']) assert.equal(orderSourceLabel(source), 'Not recorded');
  assert.deepEqual(refs({source:'studio'}), ['NY-ALT-1']);
  assert.deepEqual(refs({source:'customer_app'}), ['NY-RTW-1']);
  assert.deepEqual(refs({source:'office',status:'completed'}), ['NY-CUS-1']);
  assert.deepEqual(refs({source:'unrecorded'}), ['NY-ALT-2']);
  assert.deepEqual(refs({query:'customer app'}), ['NY-RTW-1']);
});

test('canonical order type separates adjustments from RTW sales and bespoke offerings', () => {
  assert.deepEqual(refs({ category: 'Alterations' }), ['NY-ALT-1', 'NY-ALT-2']);
  assert.deepEqual(refs({ category: 'Ready-to-Wear' }), ['NY-RTW-1']);
  assert.deepEqual(refs({ category: 'Custom' }), ['NY-CUS-1']);
  assert.equal(parseOrderType('Custom'), 'Custom');
  assert.equal(parseOrderType('Bespoke Tailor-Made Clothing'), '');
  assert.equal(parseOrderType(['Alterations']), '');
});

test('type, history, stage, search and fulfilment filters combine', () => {
  assert.deepEqual(refs({ category: 'Alterations', status: 'active', stage: 'In progress', query: '  CLOVER ', fulfilment: 'Collection' }), ['NY-ALT-1']);
  assert.deepEqual(refs({ category: 'Alterations', fulfilment: 'Delivery' }), []);
  assert.deepEqual(refs({ status: 'completed' }), ['NY-CUS-1']);
  assert.deepEqual(refs({ status: 'cancelled' }), ['NY-ALT-2']);
  assert.deepEqual(refs({ stage: 'Completed' }), ['NY-CUS-1']);
  assert.deepEqual(refs({ query: 'tailor-made' }), ['NY-CUS-1']);
  assert.deepEqual(refs({ query: 'NY-RTW-1' }), ['NY-RTW-1']);
  assert.equal(refs({}).length, 4);
});

test('alteration context carries actual variant details without inventing adjustments', () => {
  const context = alterationContext({ name: 'Red Clover Set' }, { colour: 'Olive', fabric: 'Cotton', size: 'M', sku: 'RC-OL-M' });
  assert.deepEqual(context.garments, ['Red Clover Set · Olive · Cotton · Size M']);
  assert.match(context.notes, /SKU RC-OL-M$/);
  assert.deepEqual(alterationContext({ name: 'Shirt' }), { garments: ['Shirt'], notes: 'Shirt' });
  assert.equal(alterationContext({ name: 'A'.repeat(200) }).garments[0].length, 150);
});
