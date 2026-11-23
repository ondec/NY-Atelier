import test from 'node:test';
import assert from 'node:assert/strict';
import {openSavedCustomerFitting, readStudioLocation} from './studio-location.ts';

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

for (const origin of ['fittings', 'collection']) {
  test(`saving a customer from ${origin} opens their fitting and Back never returns to the completed customer form`, () => {
    const entries = [
      {href: `https://studio.example/showroom?view=${origin}`, state: {}},
      {href: `https://studio.example/showroom?view=${origin}&screen=new-customer&product=old-garment`, state: {studioForm: true}},
    ];
    let index = 1;
    const host = {
      location: {get href() {return entries[index].href;}},
      history: {
        replaceState(state, unused, href) {entries[index] = {state, href: String(href)};},
        pushState(state, unused, href) {entries.splice(index + 1); entries.push({state, href: String(href)}); index++;},
      },
    };

    openSavedCustomerFitting(host, 7, 'suit');

    assert.deepEqual(readStudioLocation(new URL(host.location.href).search), {
      module: 'measurements', customerId: 7, editor: 'fitting', templateId: 'suit', saleDesk: false, productId: undefined,
    });
    assert.equal(entries[index].state.studioForm, true);
    index--;
    const profile = readStudioLocation(new URL(host.location.href).search);
    assert.equal(profile.customerId, 7);
    assert.equal(profile.editor, undefined);
    assert.equal(entries[index].state.studioFittingProfile, true);
    index--;
    assert.equal(host.location.href, `https://studio.example/showroom?view=${origin}`);
    index += 2;
    assert.equal(readStudioLocation(new URL(host.location.href).search).editor, 'fitting');
    assert.equal(entries.length, 3);
  });
}
