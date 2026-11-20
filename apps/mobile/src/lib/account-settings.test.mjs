import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalMeasurement, displayMeasurement, isPhoneNumber, parseAccountSettings } from './account-settings.ts';

test('a new account receives service updates but has not opted into promotions', () => {
  const settings = parseAccountSettings(null);
  assert.deepEqual(settings.notifications, { orders: true, consultations: true, collections: false });
  assert.equal(settings.unit, 'cm');
});

test('changing the display unit keeps the stored centimetre value intact', () => {
  const original = { chest: '95', weight: '75' };
  assert.equal(displayMeasurement(original.chest, 'chest', 'in'), '37.4');
  assert.equal(canonicalMeasurement('37.4', 'chest', 'in'), '95');
  assert.equal(displayMeasurement(original.weight, 'weight', 'in'), '75');
  assert.deepEqual(original, { chest: '95', weight: '75' });
});

test('invalid measurements cannot enter a fitting record', () => {
  for (const value of ['', '-3', '0', '1000', '4.123', 'NaN', '12cm']) assert.equal(canonicalMeasurement(value, 'chest', 'cm'), null);
  assert.equal(canonicalMeasurement('400', 'chest', 'in'), null);
  assert.equal(canonicalMeasurement('95,5', 'chest', 'cm'), '95.5');
});

test('a deleted or missing default address falls back to a saved address', () => {
  const settings = parseAccountSettings(JSON.stringify({ addresses: [{ id: 'home', street: 'Test street', city: 'Accra', country: 'Ghana' }], defaultAddressId: 'removed' }));
  assert.equal(settings.defaultAddressId, 'home');
  assert.equal(settings.addresses[0].label, 'Address');
});

test('saved notification choices and units survive a reload', () => {
  const settings = parseAccountSettings(JSON.stringify({ unit: 'in', fitNotes: 'Relaxed sleeves', notifications: { orders: false, consultations: true, collections: true } }));
  assert.equal(settings.unit, 'in');
  assert.equal(settings.fitNotes, 'Relaxed sleeves');
  assert.deepEqual(settings.notifications, { orders: false, consultations: true, collections: true });
});

test('contact numbers require digits rather than punctuation alone', () => {
  assert.equal(isPhoneNumber('.....'), false);
  assert.equal(isPhoneNumber('1234'), false);
  assert.equal(isPhoneNumber('+233 50 000 0000'), true);
});
