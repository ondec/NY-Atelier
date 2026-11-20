import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
registerHooks({resolve(specifier,context,nextResolve){return nextResolve(specifier==='../../../mobile/src/lib/sizing'?`${specifier}.ts`:specifier,context);}});
const folder=await mkdtemp(path.join(os.tmpdir(),'ny-size-store-'));
process.env.NY_SIZE_CHART_DATA_DIR=folder;
const {readPublishedSizing,saveSizingAssignment,SizingConflict}=await import('./size-chart-store.ts');
after(()=>rm(folder,{recursive:true,force:true}));
const chart={id:'staff-product-test-shirt-long-sleeve-shirt',gender:'men',category:'long-sleeve-shirt',source:'product',unit:'cm',measurementType:'garment',mode:'maximum',fit:'regular',required:['chest'],fitAllowance:{chest:8},rows:[{size:'S',measurements:{chest:104},labels:{}}]};
const profile={gender:'men',category:'long-sleeve-shirt',parts:[{category:'long-sleeve-shirt',chartId:chart.id}]};
const submission=(revision)=>({scope:'product',targetId:'test-shirt',action:'publish',revision,charts:[chart],profile});

test('shared size-chart publication is validated, durable and protects concurrent edits',async t=>{
  await t.test('new store starts empty',async()=>{const data=await readPublishedSizing();assert.equal(data.revision,0);assert.equal(data.charts.length,0);});
  await t.test('published chart and assignment survive a fresh read',async()=>{await saveSizingAssignment(submission(0));const data=await readPublishedSizing();assert.equal(data.revision,1);assert.equal(data.products['test-shirt'].parts[0].chartId,chart.id);assert.equal(data.charts[0].rows[0].measurements.chest,104);});
  await t.test('a stale editor cannot overwrite a newer publication',async()=>{await assert.rejects(saveSizingAssignment(submission(0)),SizingConflict);assert.equal((await readPublishedSizing()).revision,1);});
  await t.test('competing saves yield one winner without corrupting the file',async()=>{const result=await Promise.allSettled([saveSizingAssignment(submission(1)),saveSizingAssignment(submission(1))]);assert.equal(result.filter(item=>item.status==='fulfilled').length,1);assert.equal((await readPublishedSizing()).revision,2);});
  await t.test('missing fit allowances and cross-target chart IDs are rejected',async()=>{await assert.rejects(saveSizingAssignment({...submission(2),charts:[{...chart,fitAllowance:undefined}]}));await assert.rejects(saveSizingAssignment({...submission(2),charts:[{...chart,id:'staff-product-other-long-sleeve-shirt'}]}));assert.equal((await readPublishedSizing()).revision,2);});
  await t.test('body reference points cannot masquerade as declared ranges',async()=>{await assert.rejects(saveSizingAssignment({...submission(2),charts:[{...chart,measurementType:'body',mode:'range'}]}));assert.equal((await readPublishedSizing()).revision,2);});
  await t.test('restoring a default removes only the assignment and unused chart',async()=>{await saveSizingAssignment({scope:'product',targetId:'test-shirt',action:'default',revision:2});const data=await readPublishedSizing();assert.equal(data.revision,3);assert.equal(data.products['test-shirt'],undefined);assert.equal(data.charts.length,0);});
});
