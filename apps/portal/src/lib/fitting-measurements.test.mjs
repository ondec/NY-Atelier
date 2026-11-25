import test from 'node:test';
import assert from 'node:assert/strict';
import {measurementValue, measurementUnit, fittingFormValues, fittingMediaUrl, groupFittingReadings} from './fitting-measurements.ts';
import {fittingRequestBody} from './fitting-request.ts';

test('Studio converts saved centimetres to inches while preserving weights and Office readings', () => {
  assert.equal(measurementValue(101.6, 'in'), 40);
  assert.equal(measurementValue(3.175, 'in'), 1.25);
  assert.equal(measurementValue(75, 'in', 'weight'), 75);
  assert.equal(measurementValue(101.6, 'cm'), 101.6);
  assert.equal(measurementUnit('in', 'weight'), 'kg');
});
test('removed fields are excluded and custom labels retain their group and numeric value', () => {
  const form = new FormData();
  form.set('chest', '40'); form.set('waist', '');
  form.append('additional_label', ' Label length '); form.append('additional_value', '1.25'); form.append('additional_group', 'Kaftan top');
  assert.deepEqual(fittingFormValues(form, {chest: 'Chest', waist: 'Waist', neck: 'Neck'}), {
    values: {chest: 40}, pieces: [], additional_measurements: [{label: 'Label length', value: 1.25, group: 'Kaftan top'}],
  });
  assert.equal(fittingMediaUrl(12, 23, 'attachment-id'), '/api/staff-fitting-media/12/23/attachment-id');
});
test('multipart forwarding preserves binary bytes and rejects oversized input', async () => {
  const form = new FormData(); form.append('payload', '{"unit":"in"}'); form.append('attachments[]', new Blob([new Uint8Array([0, 255, 1])]), 'photo.png');
  const request = new Request('http://localhost/', {method: 'POST', body: form});
  const expected = new Uint8Array(await request.clone().arrayBuffer());
  assert.deepEqual(new Uint8Array(await fittingRequestBody(request)), expected);
  await assert.rejects(fittingRequestBody(new Request('http://localhost/', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: 'x'.repeat(65537)})), /under 60 MB/);
});

test('suit history keeps jacket and trouser readings together with their custom fields', () => {
  const fitting = {garment_type: 'suit', values: {chest: 109.22, hips: 111.76, trouser_waist: 90.17}, additional_measurements: [
    {label: 'Thigh - reading 1', value: 66.04, group: 'Suit trousers'},
    {label: 'Thigh - reading 2', value: 73.66, group: 'Suit trousers'},
    {label: 'Back', value: 44.45, group: 'Jacket'},
  ]};
  const original = structuredClone(fitting);
  const groups = groupFittingReadings(fitting, {chest: 'Chest', hips: 'Hips', trouser_waist: 'Waist'}, {groups: [
    {title: 'Jacket', fields: ['chest', 'hips']}, {title: 'Suit trousers', fields: ['trouser_waist', 'thigh']},
  ]});
  assert.deepEqual(groups.map(group => [group.title, group.readings.map(row => row.label)]), [
    ['Jacket', ['Chest', 'Back']], ['Suit trousers', ['Hips', 'Waist', 'Thigh - reading 1', 'Thigh - reading 2']],
  ]);
  assert.deepEqual(fitting, original);
  assert.deepEqual(groups[1].readings.slice(-2).map(row => measurementValue(row.value, 'in')), [26, 29]);
});

test('history preserves unknown and ungrouped readings and hides empty template sections', () => {
  const groups = groupFittingReadings({values: {legacy: 10}, additional_measurements: [
    {label: 'Extra', value: 20}, {label: 'Another', value: 30, group: ' Bespoke section '},
  ]}, {}, {groups: [{title: 'Empty', fields: ['neck']}]});
  assert.deepEqual(groups.map(group => [group.title, group.readings.length]), [['Other measurements', 2], ['Bespoke section', 1]]);
  assert.equal(groups[0].readings[0].label, 'legacy');
  assert.equal(groupFittingReadings({values: {weight: 75}}, {weight: 'Weight'})[0].title, 'Measurements');
});

test('added pieces keep their own readings and show as their own section', () => {
  const form = new FormData();
  form.set('neck', '15');
  form.append('piece_id', '3'); form.append('piece_key', 'shirt-long'); form.append('piece_title', 'Shirt');
  form.set('piece-3-neck', '15.5'); form.set('piece-3-sleeve', '');
  const parsed = fittingFormValues(form, {neck: 'Neck', sleeve: 'Sleeve length'});
  assert.deepEqual(parsed.values, {neck: 15});
  assert.deepEqual(parsed.pieces, [{key: 'shirt-long', title: 'Shirt', values: {neck: 15.5}}]);
  const groups = groupFittingReadings({garment_type: 'suit', values: {neck: 38}, pieces: [{key: 'shirt-long', title: 'Shirt', values: {neck: 39}}],
    additional_measurements: [{label: 'Collar point', value: 7, group: 'Shirt'}]}, {neck: 'Neck'}, {groups: [{title: 'Jacket', fields: ['neck']}]});
  assert.deepEqual(groups.map(group => [group.title, group.readings.map(reading => `${reading.label} ${reading.value}`)]), [['Jacket', ['Neck 38']], ['Shirt', ['Neck 39', 'Collar point 7']]]);
});
