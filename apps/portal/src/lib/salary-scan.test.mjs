import test from 'node:test';
import assert from 'node:assert/strict';
import { scanAmount, salaryScanRows } from './salary-scan.ts';

test('money reader keeps decimal precision and refuses ambiguous handwriting',()=>{
  assert.equal(scanAmount('GH₵ 1,425.50'),142550);
  for(const text of ['1.425','I,100','1,45','—','-500','500 600','2O00']) assert.equal(scanAmount(text),null,text);
});

test('table reader pairs amounts to names and leaves unreadable figures blank',()=>{
  const block=(text,x,y,confidence=.99)=>({text,x,y,width:.1,confidence});
  const result=salaryScanRows([block('NAME',.08,.8),block('AMOUNT',.78,.8),block('Test tailor A',.05,.7),block('5',.5,.7),block('1,200',.8,.7),block('Test tailor B',.05,.6),block('I5',.5,.6),block('8?0',.8,.6),block('Prepared by:',.05,.5)]);
  assert.deepEqual(result,[{name:'Test tailor A',quantity:5,amount_minor:120000,review:false},{name:'Test tailor B',quantity:null,amount_minor:null,review:true}]);
});

test('a photograph without a name header never invents a salary table',()=>{
  assert.deepEqual(salaryScanRows([{text:'2000',x:.8,y:.7,width:.1,confidence:1}]),[]);
});


test('a tilted page does not shift one tailor’s salary into the next row',()=>{
  const block=(text,x,y,width=.1)=>({text,x,y,width,confidence:.99});
  const rows=salaryScanRows([block('NAME',.05,.65),block('AMOUNT',.78,.634),block('Sample A',.04,.608),block('25',.45,.591),block('2000',.79,.584),block('Sample B',.03,.57),block('15',.46,.558),block('1400',.8,.549)]);
  assert.equal(rows[0].amount_minor,200000);
  assert.equal(rows[0].quantity,25);
  assert.equal(rows[1].amount_minor,140000);
  assert.equal(rows[1].quantity,15);
});
