import { existsSync, readFileSync } from 'node:fs';
for (const file of ['src/App.jsx', 'src/main.jsx', 'src/catalog.js', 'src/sizing.js', 'src/SizeGuide.jsx', 'src/shared-bag.js', 'src/sites.js', 'src/styles.css', 'index.html', 'vite.config.js']) {
  if (!existsSync(file)) throw new Error('Missing file: ' + file);
}
const app = readFileSync('src/App.jsx', 'utf8');
const catalog = readFileSync('src/catalog.js', 'utf8');
for (const label of ['New Arrivals', 'Men', 'Women', 'Accessories', 'Collections']) if (!app.includes(`label: '${label}'`)) throw new Error('Missing store menu item ' + label);
for (const path of ["mainSite('/services')", "mainSite('/consultation')", "mainSite('/contact')"]) if (!app.includes(path)) throw new Error('Missing link back to the main website: ' + path);
for (const [, src] of catalog.matchAll(/photo\('([^']+)'\)/g)) if (!existsSync(`public/products/${src}.webp`)) throw new Error('Missing product photo ' + src);

// Every photo the catalogue and the home promotion point to must exist, and stock must be per listed size.
const { PRODUCTS, PROMOTIONS, SIZES } = await import('../src/catalog.js');
const photos = [...PRODUCTS.flatMap(product => product.colours.flatMap(colour => colour.photos.map(item => item.src))), ...PROMOTIONS.map(promo => promo.image)];
for (const src of photos) if (!existsSync(`public${src}`)) throw new Error('Missing photo ' + src);
for (const product of PRODUCTS) {
  if (!product.colours[0].photos.length) throw new Error(`${product.id}: the first colour needs a photo`);
  for (const colour of product.colours) for (const size of Object.keys(colour.stock ?? {})) if (!SIZES.includes(size)) throw new Error(`${product.id}/${colour.id}: unknown size ${size}`);
}

// The live adapter must accept the public API shape without using preview prices or stock.
const live = await import('../src/live-catalogue.js');
live.setLiveCatalogue({ revision: 4, currency: 'GHS', collections: [], promotions: [], products: [{
  id: 'shop-example', name: 'Example piece', description: '', type: 'Tops & shirts', section: null,
  priceMinor: 96000, offerPriceMinor: null, isNew: false, sizing: [], photos: [{ src: '/example.webp', alt: '' }],
  colours: [{ id: 'colour-1', name: 'Ivory', swatch: null, group: null, photos: [], sizes: [{ label: 'M', availability: 'low' }, { label: 'L', availability: 'sold_out' }] }],
}] });
if (live.PRODUCTS.length !== 1 || live.PRODUCTS[0].price !== 960 || live.availabilityOf(live.PRODUCTS[0].colours[0], 'M') !== 'low' || live.availabilityOf(live.PRODUCTS[0].colours[0], 'L') !== 'sold_out') throw new Error('Live catalogue adapter did not preserve API price or availability');

// The bag is shared with the main website through one file that must stay identical on both sites.
const websiteBag = '../website/src/shared-bag.js';
if (existsSync(websiteBag) && readFileSync(websiteBag, 'utf8') !== readFileSync('src/shared-bag.js', 'utf8')) throw new Error('src/shared-bag.js differs from website/src/shared-bag.js; keep the two copies identical');
console.log('NY Atelier RTW store checks passed');
