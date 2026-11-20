import assert from 'node:assert/strict';
import test from 'node:test';
import {readSignInForm, signInError} from './staff-sign-in-form.ts';

const formRequest = fields => new Request('http://localhost/api/staff-sign-in', {
  method: 'POST', body: new URLSearchParams(fields),
});

test('native form preserves password characters and allows only Office or Studio destinations', async () => {
  const fields = {email: 'staff@example.test', password: 'example+ &!=secret', next: 'studio'};
  assert.deepEqual(await readSignInForm(formRequest(fields)), {
    email: fields.email, password: fields.password, destination: 'studio',
  });
  assert.equal((await readSignInForm(formRequest({...fields, next: 'https://untrusted.example'}))).destination, 'office');
});

test('unexpected content and oversized form bodies are rejected', async () => {
  await assert.rejects(readSignInForm(new Request('http://localhost/', {method: 'POST', body: '{}'})), /Expected/);
  await assert.rejects(readSignInForm(formRequest({password: 'a'.repeat(8193)})), /too large/);
});

test('redirect errors expose fixed messages rather than credentials or arbitrary query text', () => {
  assert.match(signInError(401), /incorrect/);
  assert.match(signInError(429), /Too many/);
  assert.match(signInError(422), /valid staff email/);
  assert.equal(signInError(NaN), signInError(503));
});
