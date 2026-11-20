import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ALPHA_SIZES, convertMeasurement, formatMeasurement, parseReferenceDataset, productVariants, recommendSize, recommendProductSize, regionalLabel, resolveChart, resolveProductSizing, publishedProductProfile, validatePublishedSizing, selectVariant, validateChart, validateOverrides } from './sizing.ts';

const reference = parseReferenceDataset(JSON.parse(fs.readFileSync(new URL('../data/size-charts.json', import.meta.url), 'utf8')));
// Explicit synthetic fixture for algorithm tests, never shipped as a product chart.
const chart = validateChart({ id: 'test-shirt', gender: 'men', category: 'long-sleeve-shirt', source: 'product', unit: 'cm', measurementType: 'garment', mode: 'maximum', fit: 'regular', required: ['chest', 'waist'], fitAllowance: { chest: 8, waist: 6 }, rows: [
  { size: 'S', measurements: { chest: 104, waist: 90 }, labels: { UK: '15.5 in collar' } },
  { size: 'M', measurements: { chest: 112, waist: 98 }, labels: {} },
  { size: 'L', measurements: { chest: 120, waist: 106 }, labels: {} },
] });
const inventory = ['S', 'M', 'L'].map(size => ({ id: `shirt:navy:${size}`, productId: 'shirt', colorId: 'navy', size, stock: 3 }));

test('exact inch conversion, round-trip and display conversion preserve source values', () => {
  assert.equal(convertMeasurement(1, 'in', 'cm'), 2.54);
  assert.equal(convertMeasurement(25.4, 'cm', 'in'), 10);
  assert.ok(Math.abs(convertMeasurement(convertMeasurement(91, 'cm', 'in'), 'in', 'cm') - 91) < 1e-10);
  const range = [91, 96]; assert.equal(formatMeasurement(range, 'cm', 'in'), '35.83–37.8'); assert.deepEqual(range, [91, 96]);
  assert.throws(() => convertMeasurement(Infinity, 'cm', 'in'));
});
test('supplied reference data validates all four distinct six-size charts', () => {
  assert.equal(reference.charts.length, 4);
  for (const c of reference.charts) assert.deepEqual(c.rows.map(r => r.size), ALPHA_SIZES);
  assert.equal(reference.charts[2].mode, 'reference-point');
  assert.equal(reference.charts[0].rows[0].measurements.shoulder, undefined);
  assert.equal(reference.lengths[0].inseamIn, 30);
});
test('source data validation rejects corrupt values, labels, ranges and duplicates', () => {
  const clone = () => structuredClone(chart);
  const bad = clone(); bad.rows[0].measurements.chest = '104'; assert.throws(() => validateChart(bad));
  const reversed = clone(); reversed.rows[0].measurements.chest = [110, 100]; assert.throws(() => validateChart(reversed));
  const missing = clone(); delete missing.rows[0].measurements.waist; assert.throws(() => validateChart(missing));
  const dup = clone(); dup.rows.push(dup.rows[0]); assert.throws(() => validateChart(dup));
  assert.throws(() => validateOverrides({version:'1.0', charts:[chart, chart]}));
});
test('product override wins over vendor; unresolved and cross-gender charts never silently match', () => {
  const vendor = {...chart, id:'vendor', source:'vendor'};
  const p = {gender:'men', category:'long-sleeve-shirt', chartId:chart.id, vendorChartId:'vendor'};
  assert.equal(resolveChart(p, reference.charts, [chart,vendor]), chart);
  assert.equal(resolveChart({...p, chartId:undefined}, reference.charts, [vendor]), vendor);
  assert.equal(resolveChart({...p, chartId:'missing'}, reference.charts, [vendor]), undefined);
  assert.equal(resolveChart({...p, gender:'women'}, reference.charts, [chart]), undefined);
});
test('smallest size accommodates every supplied measurement and explicit fit ease', () => {
  assert.equal(recommendSize(chart, {chest:95, waist:88}, 'cm', inventory).size, 'M');
  assert.equal(recommendSize(chart, {chest:96, waist:84}, 'cm', inventory).size, 'S');
  assert.equal(recommendSize(chart, {chest:96.01, waist:84}, 'cm', inventory).size, 'M');
  assert.equal(recommendSize(chart, {chest:104 / 2.54, waist:92 / 2.54}, 'in', inventory).size, 'M');
});
test('invalid, missing, unsupported and out-of-range measurements explain instead of guessing', () => {
  for (const chest of [-1,0,NaN,Infinity]) assert.equal(recommendSize(chart,{chest,waist:80},'cm',inventory).status,'invalid');
  assert.equal(recommendSize(chart,{chest:90},'cm',inventory).status,'insufficient');
  assert.equal(recommendSize(chart,{chest:90,waist:80,hip:95},'cm',inventory).status,'insufficient');
  assert.equal(recommendSize(chart,{chest:150,waist:80},'cm',inventory).status,'out-of-range');
  assert.equal(recommendSize(chart,{chest:90,waist:80},'cm',inventory,'slim').status,'insufficient');
  assert.equal(recommendSize({...chart,fitAllowance:undefined},{chest:90,waist:80},'cm',inventory).status,'insufficient');
  for (const c of reference.charts) assert.equal(recommendSize(c,{chest:95},'cm',inventory).status,'insufficient');
});
test('body product ranges support declared fit and reject measurements below chart coverage', () => {
  const c = {...reference.charts[0], source:'product', id:'test-body'};
  assert.equal(recommendSize(c,{chest:97},'cm',inventory).size,'M');
  assert.equal(recommendSize(c,{chest:70},'cm',inventory).status,'out-of-range');
});
test('inventory adapter exposes only actual sizes and stable purchasable IDs', () => {
  const p = {id:'shirt',colors:[{id:'navy',stock:{S:3,XL:0}}]};
  const v = productVariants(p,'navy');
  assert.deepEqual(v.map(v=>v.size),['S','XL']);
  assert.equal(selectVariant(v,'S').id,'shirt:navy:S');
  assert.equal(selectVariant(v,'XL'),undefined); assert.equal(selectVariant(v,'M'),undefined);
  assert.equal(regionalLabel(chart.rows[0],'S','GH'),'S');
  assert.equal(regionalLabel(chart.rows[0],'S','UK'),'15.5 in collar · S');
  assert.equal(v[0].size,'S'); assert.equal(v[0].length,undefined);
  assert.throws(()=>productVariants({id:'shirt',colors:[{id:'navy',stock:{S:-1}}]},'navy'));
});
test('independent inseam resolves the actual SKU and recommendation respects available length', () => {
  const c = validateChart({...chart,id:'pants',category:'trousers',required:['waist'],fitAllowance:{waist:4},rows:[{size:'S',measurements:{waist:84},labels:{}},{size:'M',measurements:{waist:94},labels:{}}]});
  const v = [{id:'sku-s-30',productId:'pants',colorId:'navy',size:'S',stock:2,length:{code:'L30',value:30,unit:'in'}},{id:'sku-s-32',productId:'pants',colorId:'navy',size:'S',stock:0,length:{code:'L32',value:32,unit:'in'}},{id:'sku-m-34',productId:'pants',colorId:'navy',size:'M',stock:2,length:{code:'L34',value:34,unit:'in'}}];
  assert.equal(selectVariant(v,'S'),undefined); assert.equal(selectVariant(v,'S','L30').id,'sku-s-30');
  assert.equal(selectVariant(v,'S','L32'),undefined);
  assert.equal(recommendSize(c,{waist:78,inseam:31},'in',v).status,'out-of-range');
  assert.equal(recommendSize(c,{waist:78,inseam:80},'cm',v).size,'M');
  assert.equal(recommendSize(c,{waist:78,inseam:100},'cm',v).status,'unavailable');
  assert.equal(recommendSize(c,{waist:78,inseam:80},'cm',inventory).status,'insufficient');
});
test('stock availability excludes sold-out sizes from recommendations', () => {
  assert.equal(recommendSize(chart,{chest:95,waist:80},'cm',inventory.map(v=>({...v,stock:v.size==='S'?0:1}))).size,'M');
  assert.equal(recommendSize(chart,{chest:95,waist:80},'cm',inventory.map(v=>({...v,stock:0}))).status,'unavailable');
});

test('women’s approved charts use bust sizing independently of men’s chest charts', () => {
  const c = validateChart({id:'women-shirt', gender:'women', category:'long-sleeve-shirt', source:'vendor', unit:'cm', measurementType:'body', mode:'maximum', fit:'slim', required:['bust','waist'], rows:[{size:'S',measurements:{bust:90,waist:70},labels:{UK:'10',US:'6',EU:'38'}},{size:'M',measurements:{bust:95,waist:75},labels:{UK:'12',US:'8',EU:'40'}}]});
  assert.equal(recommendSize(c,{bust:89,waist:74},'cm',inventory,'slim').size,'M');
  assert.equal(recommendSize(c,{bust:89,waist:68},'cm',inventory,'slim').size,'S');
  assert.equal(recommendSize(c,{chest:89,waist:68},'cm',inventory).status,'insufficient');
  assert.equal(regionalLabel(c.rows[0],'S','EU'),'38 · S');
  assert.throws(()=>validateChart({...c,required:['chest']}));
});


test('product context shows only its own gender and garment parts', () => {
  const trousers = resolveProductSizing({gender:'women',category:'trousers'},reference.charts,[]);
  assert.equal(trousers.length,1); assert.equal(trousers[0].chart.gender,'women'); assert.equal(trousers[0].chart.category,'trousers');
  const set = resolveProductSizing({gender:'men',category:'short-sleeve-shirt',parts:[{category:'short-sleeve-shirt'},{category:'trousers'}]},reference.charts,[]);
  assert.deepEqual(set.map(p=>p.profile.category),['short-sleeve-shirt','trousers']);
  assert.ok(set.every(p=>p.chart.gender==='men'));
  assert.deepEqual(set[0].chart.rows[0].measurements,{chest:[91,96]});
  assert.deepEqual(set[0].chart.rows[0].labels,{});
  assert.equal(set[0].chart.rows[0].measurements.sleeveLength,undefined);
  const bothSleeves = resolveProductSizing({gender:'women',category:'long-sleeve-shirt',parts:[{category:'long-sleeve-shirt'},{category:'short-sleeve-shirt'},{category:'trousers'}]},reference.charts,[]);
  assert.equal(bothSleeves.length,3); assert.ok(bothSleeves.every(p=>p.chart.gender==='women'));
});
test('short-sleeve overrides stay product-specific and explicit missing IDs never use another chart', () => {
  const short = validateChart({...chart,id:'short-shirt',category:'short-sleeve-shirt'});
  const p = {gender:'men',category:'short-sleeve-shirt',chartId:short.id};
  assert.equal(resolveChart(p,reference.charts,[short]),short);
  assert.equal(resolveChart({...p,chartId:'missing'},reference.charts,[short]),undefined);
  assert.equal(resolveChart({...p,gender:'women'},reference.charts,[short]),undefined);
});
test('a set recommendation must fit both pieces at the same purchasable size', () => {
  const pants = validateChart({...chart,id:'set-pants',category:'trousers',required:['waist'],fitAllowance:{waist:4},rows:[{size:'S',measurements:{waist:84},labels:{}},{size:'M',measurements:{waist:94},labels:{}},{size:'L',measurements:{waist:104},labels:{}}]});
  const top = validateChart({...chart,required:['chest'],fitAllowance:{chest:8},rows:chart.rows.map(r=>({...r,measurements:{chest:r.measurements.chest}}))});
  const profile = {gender:'men',category:'long-sleeve-shirt',chartId:top.id,parts:[{category:'long-sleeve-shirt'},{category:'trousers',chartId:pants.id}]};
  const parts = resolveProductSizing(profile,reference.charts,[top,pants]);
  assert.equal(parts[0].chart,top);
  assert.equal(recommendProductSize(parts,{chest:95,waist:88},'cm',inventory).size,'M');
  assert.equal(recommendProductSize(parts,{chest:95,waist:108},'cm',inventory).status,'out-of-range');
  assert.equal(recommendProductSize(parts,{chest:95},'cm',inventory).status,'insufficient');
  const generic = resolveProductSizing({...profile,chartId:undefined,parts:[{category:'long-sleeve-shirt'},{category:'trousers'}]},reference.charts,[]);
  assert.equal(recommendProductSize(generic,{chest:95,waist:88},'cm',inventory).status,'insufficient');
});


test('published product charts override collection defaults without equating genders',()=>{
  const shirt={...chart,id:'staff-product-ember-long-sleeve-shirt'};
  const trousers=validateChart({...chart,id:'staff-collection-summer-men-trousers',category:'trousers',required:['waist'],fitAllowance:{waist:4},rows:[{size:'S',measurements:{waist:84},labels:{}}]});
  const productProfile={gender:'men',category:'long-sleeve-shirt',parts:[{category:'long-sleeve-shirt',chartId:shirt.id}]};
  const collectionProfile={gender:'men',category:'trousers',parts:[{category:'trousers',chartId:trousers.id}]};
  const data=validatePublishedSizing({version:'1.0',revision:1,charts:[shirt,trousers],products:{ember:productProfile},collections:{summer:{productIds:['shop-ember','shop-milano-pants'],profile:collectionProfile}}});
  assert.equal(publishedProductProfile('shop-ember',{gender:'men',category:'long-sleeve-shirt'},data).parts[0].chartId,shirt.id);
  assert.equal(publishedProductProfile('milano-pants',{gender:'men',category:'trousers'},data).parts[0].chartId,trousers.id);
  const women={gender:'women',category:'trousers'};
  assert.equal(publishedProductProfile('milano-pants',women,data),women);
  const unknown={gender:'men',category:'short-sleeve-shirt'};
  assert.equal(publishedProductProfile('unlisted',unknown,data),unknown);
});
test('invalid published chart links and conflicting defaults never choose an arbitrary chart',()=>{
  const profile={gender:'men',category:'long-sleeve-shirt',parts:[{category:'long-sleeve-shirt',chartId:chart.id}]};
  const raw={version:'1.0',revision:1,charts:[chart],products:{},collections:{one:{productIds:['shirt'],profile},two:{productIds:['shirt'],profile}}};
  const data=validatePublishedSizing(raw);const base={gender:'men',category:'long-sleeve-shirt'};
  assert.equal(publishedProductProfile('shirt',base,data),base);
  assert.throws(()=>validatePublishedSizing({...raw,products:{shirt:{...profile,gender:'women'}}}));
  assert.throws(()=>validatePublishedSizing({...raw,revision:-1}));
  assert.throws(()=>validatePublishedSizing({...raw,products:{shirt:{...profile,parts:[{category:'long-sleeve-shirt',chartId:'missing'}]}}}));
});
