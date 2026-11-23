import assert from 'node:assert/strict';
import test from 'node:test';
import {customerListQuery, customerSearchQuery} from './customer-search.ts';

test('only search, page and page size reach the customer API', () => {
  assert.equal(customerListQuery(new URLSearchParams('q=+Ama+&page=3&per_page=20&id=5&mode=measurements')), '?q=Ama&page=3&per_page=20');
  assert.equal(customerListQuery(new URLSearchParams('')), '');
});

test('out-of-range paging and long searches are dropped or trimmed', () => {
  assert.equal(customerListQuery(new URLSearchParams('page=0&per_page=5000')), '');
  assert.equal(customerListQuery(new URLSearchParams('page=1.5&per_page=-1')), '');
  assert.equal(customerListQuery(new URLSearchParams({q: 'x'.repeat(150)})).length, '?q='.length + 100);
});

test('the first page of an empty search asks for the default page size', () => {
  assert.equal(customerSearchQuery(''), '?per_page=50');
  assert.equal(customerSearchQuery('024 123', 2, 10), '?q=024+123&page=2&per_page=10');
});
