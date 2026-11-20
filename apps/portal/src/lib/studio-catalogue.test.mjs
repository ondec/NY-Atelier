import assert from 'node:assert/strict';
import test from 'node:test';
import { filterStudioCatalogue } from './studio-catalogue.ts';
import { selectedSizeSummary } from '../../../mobile/src/data/size-charts.ts';

const inventory = {
  products: [{ id: 'shirt', name: 'Striped shirt', type: 'Tops & shirts' }, { id: 'kaftan', name: 'Evening kaftan', type: 'Kaftans' }],
  variants: [
    { productId: 'shirt', colour: 'Blue', fabric: 'Cotton', sku: 'BLUE-S', size: 'S', quantity: 0, reorderAt: 2 },
    { productId: 'shirt', colour: 'Blue', fabric: 'Cotton', sku: 'BLUE-M', size: 'M', quantity: 5, reorderAt: 2 },
    { productId: 'kaftan', colour: 'Olive', fabric: 'Linen', sku: 'OLIVE-S', size: 'S', quantity: 2, reorderAt: 2 },
  ],
};
const filters = { query: '', clothingType: 'all', size: 'all', availability: 'all' };

test('collection, clothing type and search narrow the product catalogue together', () => {
  assert.deepEqual(filterStudioCatalogue(inventory, ['kaftan'], { ...filters, query: 'linen', clothingType: 'Kaftans' }).map(item => item.id), ['kaftan']);
  assert.equal(filterStudioCatalogue(inventory, ['shirt'], { ...filters, clothingType: 'Kaftans' }).length, 0);
  assert.equal(filterStudioCatalogue(inventory, undefined, { ...filters, query: 'blue-m' })[0].id, 'shirt');
});

test('availability is checked for the selected size rather than other sizes', () => {
  assert.deepEqual(filterStudioCatalogue(inventory, undefined, { ...filters, size: 'S', availability: 'in-stock' }).map(item => item.id), ['kaftan']);
  assert.deepEqual(filterStudioCatalogue(inventory, undefined, { ...filters, size: 'S', availability: 'out-of-stock' }).map(item => item.id), ['shirt']);
  assert.equal(filterStudioCatalogue(inventory, undefined, { ...filters, availability: 'low-stock' })[0].id, 'kaftan');
});

test('both apps show a truthful pending message when the selected size has no approved chart', () => {
  assert.equal(selectedSizeSummary('shop-shirt', 'Tops & shirts', 'M'), 'Size M · Measurements will be available once NY Atelier adds the size chart.');
});

test('approved chart values change with size and product charts override type charts', () => {
  const charts = { products: { shirt: { unit: 'cm', kind: 'garment', sizes: { S: [{ label: 'Chest', value: 96 }], M: [{ label: 'Chest', value: 100 }] } } }, clothingTypes: { tops: { unit: 'in', kind: 'body', sizes: { L: [{ label: 'Chest', value: 40, max: 42 }] } } } };
  assert.equal(selectedSizeSummary('shop-shirt', 'Tops & shirts', 'S', charts), 'Size S · Garment measurements: Chest 96 cm.');
  assert.equal(selectedSizeSummary('shirt', 'tops', 'M', charts), 'Size M · Garment measurements: Chest 100 cm.');
  assert.equal(selectedSizeSummary('another-shirt', 'tops', 'L', charts), 'Size L · Body measurements: Chest 40–42 in.');
});

test("Studio size summaries convert centimetre charts to inches without altering the source", () => {
  const charts = {products: {shirt: {unit: "cm", kind: "body", sizes: {M: [{label: "Chest", value: 101.6, max: 106.68}]}}}, clothingTypes: {}};
  assert.equal(selectedSizeSummary("shirt", "tops", "M", charts, "in"), "Size M · Body measurements: Chest 40–42 in.");
  assert.equal(charts.products.shirt.sizes.M[0].value, 101.6);
});
