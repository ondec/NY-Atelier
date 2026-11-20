import test from 'node:test';
import assert from 'node:assert/strict';
import {readStudioLocation} from './studio-location.ts';

test('history locations restore the customer, fitting screen and garment after reload', () => {
  assert.deepEqual(readStudioLocation('?view=fittings&customer=3&screen=fitting&garment=suit'), {
    module: 'measurements', customerId: 3, editor: 'fitting', templateId: 'suit', saleDesk: false, productId: undefined,
  });
  assert.equal(readStudioLocation('?view=fittings&customer=3').editor, undefined);
  assert.equal(readStudioLocation('?view=fittings').customerId, undefined);
  assert.equal(readStudioLocation('').module, 'welcome');
});

test('garment details restore independently from the Sales Desk and fitting screens', () => {
  assert.equal(readStudioLocation('?view=collection&product=shop-redclover-navy').productId, 'shop-redclover-navy');
  assert.equal(readStudioLocation('?view=collection&product=shop-redclover-navy&screen=sale').productId, 'shop-redclover-navy');
  assert.equal(readStudioLocation('?view=fittings&product=shop-redclover-navy').productId, undefined);
  assert.equal(readStudioLocation('?view=collection&product=%3Cscript%3E').productId, undefined);
});

test('the Sales Desk has a separate history location within Ready-to-Wear', () => {
  const location = readStudioLocation('?view=collection&screen=sale');
  assert.equal(location.module, 'collection');
  assert.equal(location.saleDesk, true);
  assert.equal(location.editor, undefined);
  assert.equal(readStudioLocation('?view=collection').saleDesk, false);
  assert.equal(readStudioLocation('?view=fittings&screen=sale').saleDesk, false);
  assert.equal(readStudioLocation('?screen=sale').saleDesk, false);
});

test('new customer forms preserve their originating Studio module', () => {
  assert.equal(readStudioLocation('?view=collection&screen=new-customer').module, 'collection');
  assert.equal(readStudioLocation('?view=collection&screen=new-customer').editor, 'customer');
  assert.equal(readStudioLocation('?view=fittings&screen=new-customer').module, 'measurements');
});

test('invalid customer and screen locations cannot open an orphan fitting form', () => {
  for (const customer of ['0', '-3', '3.5', '1e3', '9007199254740992', 'invalid']) {
    const location = readStudioLocation(`?view=fittings&customer=${customer}&screen=fitting&garment=unknown`);
    assert.equal(location.customerId, undefined);
    assert.equal(location.editor, undefined);
    assert.equal(location.templateId, undefined);
  }
  assert.equal(readStudioLocation('?view=collection&customer=3&screen=fitting').editor, undefined);
});
