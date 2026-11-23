import test from 'node:test';
import assert from 'node:assert/strict';
import {readStaffResetLink} from './staff-password-reset.ts';

test('staff recovery reads the token and plus-address from the private fragment', () => {
  assert.deepEqual(readStaffResetLink(`#token=${'a'.repeat(64)}&email=staff%2Brecords%40example.test`), {token:'a'.repeat(64),email:'staff+records@example.test'});
});
test('missing, malformed and oversized reset links cannot open the password form', () => {
  for (const fragment of ['', '#email=staff@example.test', '#token=short&email=staff@example.test', `#token=${'f'.repeat(64)}&email=invalid`, `#token=${'f'.repeat(64)}&email=${'a'.repeat(256)}@example.test`]) {
    assert.equal(readStaffResetLink(fragment), undefined);
  }
});
