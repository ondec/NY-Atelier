import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMeasurementHistory, sizingAccountKeys, updateMeasurementHistory } from './measurement-history.ts';

const previous = [{id:100,date:'2026-11-01',values:{height:'175',chest:'94',waist:'80',hips:'98'}}];
test('product entries merge with account measurements and keep the previous fitting',()=>{
  const history = updateMeasurementHistory(previous,{chest:'96'},{editSession:'product-one',now:200});
  assert.equal(history.length,2);
  assert.deepEqual(history[0].values,{height:'175',chest:'96',waist:'80',hips:'98'});
  assert.deepEqual(history[1],previous[0]);
  assert.equal(previous[0].values.chest,'94');
});
test('editing multiple fields in one product form creates one history entry',()=>{
  let history = updateMeasurementHistory(previous,{chest:'9'},{editSession:'one',now:200});
  history = updateMeasurementHistory(history,{chest:'96'},{editSession:'one',now:201});
  history = updateMeasurementHistory(history,{waist:'82'},{editSession:'one',now:202});
  assert.equal(history.length,2); assert.equal(history[0].id,200);
  assert.equal(history[0].values.chest,'96'); assert.equal(history[0].values.waist,'82');
  const otherProduct = updateMeasurementHistory(history,{waist:'84'},{editSession:'two',now:300});
  assert.equal(otherProduct.length,3); assert.equal(otherProduct[1].values.waist,'82');
});
test('reusing identical values does not create duplicate history',()=>{
  assert.equal(updateMeasurementHistory(previous,{chest:'94'}),previous);
});
test('account editing can replace a fitting while retaining the older snapshot',()=>{
  const history = updateMeasurementHistory(previous,{chest:'96'},{replace:true,now:200});
  assert.deepEqual(history[0].values,{chest:'96'});
  assert.deepEqual(history[1],previous[0]);
});
test('canonical history survives reload and maps size-guide fields to account fields',()=>{
  const history = updateMeasurementHistory(previous,{[sizingAccountKeys.hip]:'101.6',[sizingAccountKeys.sleeveLength]:'60.5',[sizingAccountKeys.bust]:'95'},{now:200});
  assert.deepEqual(parseMeasurementHistory(JSON.stringify(history)),history);
  assert.equal(history[0].values.hips,'101.6'); assert.equal(history[0].values.sleeve,'60.5');
  assert.equal(history[0].values.bust,'95'); assert.equal(history[0].values.chest,'94');
});
test('invalid input cannot overwrite saved values',()=>{
  for(const value of ['0','-1','NaN','Infinity','1000','95cm','1.234']) assert.throws(()=>updateMeasurementHistory(previous,{chest:value}));
  assert.throws(()=>updateMeasurementHistory(previous,{unknown:'95'}));
  assert.throws(()=>parseMeasurementHistory('{broken'));
  assert.equal(previous[0].values.chest,'94');
});
