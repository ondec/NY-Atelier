import assert from 'node:assert/strict';
import test from 'node:test';
import { accountRoute, startBody } from './customer-session.ts';

test('only named account calls are passed on', () => {
  assert.equal(accountRoute(['verify'], 'POST')?.signsIn, true);
  assert.equal(accountRoute(['orders'], 'GET')?.path, '/api/customer/orders');
  assert.equal(accountRoute(['appointments', 'c0115a00-0000-4000-8000-000000000001'], 'PATCH')?.path, '/api/customer/consultations/c0115a00-0000-4000-8000-000000000001');
  assert.equal(accountRoute(['appointments', '../staff'], 'PATCH'), null);
  assert.equal(accountRoute(['passkeys'], 'GET'), null);
  assert.equal(accountRoute(['orders'], 'POST'), null);
});

test('website sign-in always asks for an email code', () => {
  assert.deepEqual(startBody({ email: 'a@b.test', channel: 'phone' }), { channel: 'email', destination: 'a@b.test' });
});
