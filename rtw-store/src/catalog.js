// Preview catalogue for the RTW store, from the mobile app's catalogue (photos copied from
// apps/mobile/assets/ny, see PHOTO_SOURCES.md there). The live store (rtw.thenyatelier.com) lists
// menswear only today, with no womenswear or accessories, so those sections show "coming soon".
// Extra colours, per-size stock and the Old Money offer price are the app's SAMPLE values
// (apps/mobile/src/data/demo-stock.ts and shop-catalogue.ts). This is NOT live stock or pricing:
// the hosted catalogue (imported from WordPress) replaces it when the store is connected to the backend.

const photo = name => `/products/${name}.webp`;
const redClover = colour => [
  { label: 'Front', src: photo(`red-clover-${colour}-front`) },
  { label: 'Front look', src: photo(`red-clover-${colour}-campaign-front`) },
  { label: 'Side look', src: photo(`red-clover-${colour}-campaign-side`) },
  { label: 'Field look', src: photo(`red-clover-${colour}-campaign-field`) },
  { label: 'Pocket detail', src: photo(`red-clover-${colour}-campaign-detail`) },
];
const front = name => [{ label: 'Front', src: photo(name) }];

export const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

/** Shop sections, in the same order as the app's shop filters. */
export const SECTIONS = [
  { id: 'new', label: 'New Arrivals', title: 'New', accent: 'arrivals.', copy: 'The latest pieces from the ready-to-wear edit.' },
  { id: 'men', label: 'Men', title: 'For', accent: 'him.', copy: 'Sets, shirts and trousers cut with ease and quiet confidence.' },
  { id: 'women', label: 'Women', title: 'For', accent: 'her.', copy: 'Statement silhouettes and signature pieces for every occasion.' },
  { id: 'accessories', label: 'Accessories', title: 'The finishing', accent: 'touch.', copy: 'Accents that complete the look.' },
];

/** Colour families for the shop's colour filter (the app's colour groups). */
export const COLOUR_GROUPS = [
  { id: 'black', label: 'Black' },
  { id: 'blue', label: 'Blue' },
  { id: 'light', label: 'White & cream' },
  { id: 'brown', label: 'Brown' },
];

/**
 * Each colour has `stock` per size. A colour without photos shows the main photo with a
 * "photo coming" note, as in the app. `sizing` names the size-chart parts for the size guide.
 */
export const PRODUCTS = [
  {
    id: 'ember', name: 'The Ember Pocket', gender: 'men', type: 'tops', price: 1200, isNew: true, groups: ['black'], sizing: ['shirt'],
    description: 'A black-and-white striped shirt with a contrast collar, sleeves and chest pocket. The graphic front gives this look its character.',
    colours: [
      { id: 'black-white', name: 'Black & white', swatch: '#252527', photos: front('product-ember'), stock: { S: 3, M: 7, L: 4, XL: 2 } },
      { id: 'indigo', name: 'Indigo', swatch: '#374c6b', photos: [], stock: { M: 4, L: 5, XL: 1 } },
      { id: 'sand', name: 'Sand', swatch: '#baa484', photos: [], stock: { S: 2, M: 5, L: 3 } },
    ],
  },
  {
    id: 'heritage-stripe-navy', name: 'Heritage Stripe Set', edition: 'Navy Blue Edition', gender: 'men', type: 'sets', price: 1200, isNew: true, groups: ['blue'], sizing: ['shirt', 'trousers'],
    description: 'Navy and white stripes meet solid navy pocket panels, collar and trousers in a coordinated look.',
    colours: [
      { id: 'navy', name: 'Navy blue', swatch: '#25334A', photos: front('product-heritage-stripe-navy'), stock: { S: 2, M: 6, L: 7, XL: 3, '2XL': 1 } },
      { id: 'charcoal', name: 'Charcoal', swatch: '#43474b', photos: [], stock: { M: 3, L: 5, XL: 4, '2XL': 2, '3XL': 1 } },
    ],
  },
  {
    id: 'red-clover', name: 'Red Clover Set', gender: 'men', type: 'sets', price: 1200, isNew: true, collection: 'red-clover', groups: ['blue'], sizing: ['shirt', 'trousers'],
    description: 'A short-sleeve striped top with a small red clover on the pocket, paired with coordinating trousers.',
    colours: [
      { id: 'navy', name: 'Navy blue', swatch: '#31568D', photos: [{ label: 'Front', src: photo('red-clover-navy-front') }, ...[1, 2, 3, 4].map((n, i) => ({ label: ['Front look', 'Side look', 'Field look', 'Pocket detail'][i], src: photo(`royal-blue-stripes-${n}`) }))], stock: { S: 4, M: 5, L: 3, XL: 0 } },
      { id: 'olive', name: 'Olive', swatch: '#626546', photos: redClover('olive'), stock: { S: 2, M: 4, L: 6 } },
      { id: 'claret', name: 'Claret', swatch: '#733C47', photos: redClover('claret'), stock: { M: 6, L: 3, XL: 2 } },
      { id: 'pinstripe', name: 'Pinstripe cotton', swatch: '#9A958C', photos: redClover('pinstripe'), stock: { S: 3, M: 4, L: 4, XL: 2, '2XL': 1 } },
    ],
  },
  {
    id: 'old-money', name: 'Old Money Set', gender: 'men', type: 'sets', price: 1300, compareAt: 1500, groups: ['black'], sizing: ['shirt', 'trousers'],
    description: 'An all-black look with a textured panel on one side of the shirt and matching relaxed trousers.',
    colours: [
      { id: 'black', name: 'Black', swatch: '#212023', photos: front('product-old-money'), stock: { S: 3, M: 4, L: 6, XL: 3 } },
      { id: 'espresso', name: 'Espresso', swatch: '#493229', photos: [], stock: { M: 3, L: 4, XL: 1 } },
      { id: 'oat', name: 'Oat', swatch: '#d1c1a0', photos: [], stock: { S: 4, M: 6, L: 2, XL: 2, '2XL': 1 } },
    ],
  },
  {
    id: 'aegis', name: 'Aegis Set', gender: 'men', type: 'sets', price: 1150, groups: ['blue'], sizing: ['shirt', 'trousers'],
    description: 'A deep navy matching set with a longline top, offset button detail and a neat chest pocket. A clean, confident look for the moments that call for it.',
    colours: [
      { id: 'navy', name: 'Navy', swatch: '#202431', photos: front('product-aegis'), stock: { S: 2, M: 5, L: 6, XL: 3, '2XL': 2, '3XL': 1 } },
      { id: 'slate', name: 'Slate', swatch: '#5f6973', photos: [], stock: { M: 3, L: 4, XL: 2, '2XL': 2 } },
      { id: 'forest', name: 'Forest', swatch: '#3c5344', photos: [], stock: { S: 3, M: 4, L: 4 } },
    ],
  },
  {
    id: 'amani', name: 'Amani Set', gender: 'men', type: 'sets', price: 1200, groups: ['light'], sizing: ['shirt', 'trousers'],
    description: 'A coordinated set with a button-front top and patterned pocket accents. Its simple lines let the details stand out.',
    colours: [
      { id: 'cream', name: 'Cream', swatch: '#DCCB9B', photos: [{ label: 'Front', src: photo('product-amani') }, { label: 'Fabric detail', src: photo('product-amani-cream-detail') }, { label: 'Side', src: photo('product-amani-cream-side') }], stock: { S: 3, M: 5, L: 4, XL: 2 } },
      { id: 'black', name: 'Black', swatch: '#242424', photos: [], stock: { S: 2, M: 3, L: 4, XL: 1 } },
      { id: 'green', name: 'Green', swatch: '#42634b', photos: [], stock: { S: 10, M: 5, L: 5 } },
      { id: 'red', name: 'Red', swatch: '#963d43', photos: [], stock: { M: 4, L: 3, XL: 2, '2XL': 1 } },
    ],
  },
  {
    id: 'arctic', name: 'Arctic Edge Set', gender: 'men', type: 'sets', price: 1200, groups: ['light'], sizing: ['shirt', 'trousers'],
    description: 'A white matching set with dark contrast trim and a clean half-placket neckline. A sharp, understated finish from top to trouser.',
    colours: [
      { id: 'white', name: 'White', swatch: '#EDEDEB', photos: front('product-arctic'), stock: { S: 4, M: 6, L: 3, XL: 2 } },
      { id: 'ice-blue', name: 'Ice blue', swatch: '#a9bdc9', photos: [], stock: { S: 3, M: 4, L: 2 } },
      { id: 'linen', name: 'Natural linen', swatch: '#cabf9e', photos: [], stock: { M: 5, L: 4, XL: 3, '2XL': 2, '3XL': 1 } },
    ],
  },
  {
    id: 'aurel-tunic', name: 'The Aurel Signature Tunic', gender: 'men', type: 'tops', price: 1200, groups: ['light'], sizing: ['shirt'],
    description: 'A white longline tunic with a clean front and gold-toned chest detail.',
    colours: [
      { id: 'white', name: 'White', swatch: '#E9E9E7', photos: front('product-aurel-tunic'), stock: { S: 4, M: 7, L: 5, XL: 2, '2XL': 1 } },
      { id: 'ink', name: 'Ink', swatch: '#333b50', photos: [], stock: { S: 2, M: 4, L: 3, XL: 1 } },
      { id: 'gold', name: 'Soft gold', swatch: '#c3a974', photos: [], stock: { M: 3, L: 4, XL: 2 } },
    ],
  },
  {
    id: 'milano-pants', name: 'Milano Pleated Pants', gender: 'men', type: 'trousers', price: 500, groups: ['brown'], sizing: ['trousers'],
    description: 'Brown pleated trousers with a gathered waist, roomy legs and a relaxed finish.',
    colours: [
      { id: 'brown', name: 'Brown', swatch: '#9A673E', photos: front('product-milano-pants'), stock: { S: 3, M: 5, L: 2, XL: 1 } },
      { id: 'stone', name: 'Stone', swatch: '#b8ad99', photos: [], stock: { S: 4, M: 6, L: 3 } },
      { id: 'black', name: 'Black', swatch: '#222326', photos: [], stock: { M: 2, L: 4, XL: 4, '2XL': 2 } },
    ],
  },
];

export const COLLECTIONS = [
  {
    id: 'red-clover', title: 'Red Clover', eyebrow: 'THE COLLECTION',
    copy: 'White and blue stripes, coordinating trousers and a small red clover on the pocket, in four editions.',
    cover: photo('royal-blue-stripes-1'), productIds: ['red-clover'],
  },
];

/**
 * The store's home hero. It mirrors the app's home promotion: the featured collection's
 * campaign photos, then New Arrivals. When a new collection launches, put it first here
 * (and in the app's shop-collections) so both show the same story.
 */
export const PROMOTIONS = [
  ...[1, 2, 3].map(n => ({
    id: `red-clover-${n}`, eyebrow: 'FEATURED COLLECTION', title: 'Red Clover', accent: 'Set.',
    copy: COLLECTIONS[0].copy, image: photo(`royal-blue-stripes-${n}`),
    cta: { label: 'SHOP THE COLLECTION', to: '/collections/red-clover' },
  })),
  {
    id: 'new-arrivals', eyebrow: 'JUST IN', title: 'New', accent: 'arrivals.',
    copy: 'Recently listed pieces from the NY Atelier ready-to-wear store.', image: photo('red-clover-olive-campaign-front'),
    cta: { label: 'SHOP NEW ARRIVALS', to: '/shop/new' },
  },
];

export const formatGHS = value => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
export const findProduct = id => PRODUCTS.find(product => product.id === id);
export const coverOf = product => product.colours[0].photos[0].src;
/** A colour's photos, or the product's main photos when that colour has none yet. */
export const photosOf = (product, colour) => colour.photos.length ? colour.photos : product.colours[0].photos;
export const unitsOf = colour => Object.values(colour.stock ?? {}).reduce((sum, n) => sum + n, 0);
export const isSoldOut = product => product.colours.every(colour => unitsOf(colour) === 0);
export const percentOff = product => product.compareAt ? Math.round((1 - product.price / product.compareAt) * 100) : 0;

/** One label per card, in the app's order of importance: out of stock, offer, new. */
export function badgeOf(product) {
  if (isSoldOut(product)) return { label: 'OUT OF STOCK', tone: 'stock' };
  if (product.compareAt) return { label: `SALE −${percentOff(product)}%`, tone: 'offer' };
  if (product.isNew) return { label: 'NEW', tone: 'new' };
  return null;
}

export function productsIn(section) {
  if (section === 'new') return PRODUCTS.filter(product => product.isNew);
  if (section === 'men' || section === 'women') return PRODUCTS.filter(product => product.gender === section);
  if (section === 'accessories') return PRODUCTS.filter(product => product.type === 'accessories');
  return PRODUCTS;
}
