import assert from 'node:assert/strict';
import test from 'node:test';
import {layoutComparisonLinksEnabled} from './dev-links.ts';

test('local layout comparison links are hidden unless explicitly enabled',()=>{
  assert.equal(layoutComparisonLinksEnabled({}),false);
  assert.equal(layoutComparisonLinksEnabled({NY_LAYOUT_COMPARISON_LINKS:'0'}),false);
  assert.equal(layoutComparisonLinksEnabled({NY_LAYOUT_COMPARISON_LINKS:'true'}),false);
  assert.equal(layoutComparisonLinksEnabled({NY_LAYOUT_COMPARISON_LINKS:'1'}),true);
});
