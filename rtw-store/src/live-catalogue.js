import { COLOUR_GROUPS, SECTIONS, formatGHS } from './catalog-ui.js';
import { mainSite } from './sites.js';

export { COLOUR_GROUPS, SECTIONS, formatGHS };

export const PRODUCTS = [];
export const COLLECTIONS = [];
export const PROMOTIONS = [];

const fallbackImage = '/images/editorial-fallback.svg';
const photoList = list => (Array.isArray(list) ? list : []).filter(photo => typeof photo?.src === 'string').map((photo, index) => ({ label: index === 0 ? 'Front' : `View ${index + 1}`, src: photo.src }));

export function setLiveCatalogue(data) {
  if (!data || !Array.isArray(data.products) || !Array.isArray(data.collections) || !Array.isArray(data.promotions) || !Number.isInteger(data.revision)) throw new Error('The catalogue response was incomplete.');
  const products = data.products.map(item => {
    if (typeof item.id !== 'string' || typeof item.name !== 'string' || !Number.isInteger(item.priceMinor) || !Array.isArray(item.colours)) throw new Error('A catalogue product was incomplete.');
    const photos = photoList(item.photos);
    const colours = item.colours.map(colour => ({
      id: colour.id,
      name: colour.name,
      swatch: colour.swatch ?? '#a9aaa5',
      group: colour.group,
      photos: photoList(colour.photos),
      availability: Object.fromEntries((colour.sizes ?? []).map(size => [size.label, size.availability])),
    }));
    return {
      id: item.id, name: item.name, description: item.description ?? '', type: item.type ?? 'Other',
      gender: item.section, price: (item.offerPriceMinor ?? item.priceMinor) / 100,
      compareAt: item.offerPriceMinor ? item.priceMinor / 100 : null,
      isNew: item.isNew === true, groups: [...new Set(colours.map(colour => colour.group).filter(Boolean))],
      sizing: item.sizing ?? [], photos, colours: colours.length ? colours : [{ id: 'unlisted', name: 'Edition', swatch: '#a9aaa5', group: null, photos: [], availability: {} }],
    };
  });
  PRODUCTS.splice(0, PRODUCTS.length, ...products);
  COLLECTIONS.splice(0, COLLECTIONS.length, ...data.collections.map(item => ({
    id: item.id, title: item.title, eyebrow: 'THE COLLECTION', copy: item.copy ?? '',
    cover: item.cover?.src ?? fallbackImage, productIds: item.productIds ?? [],
    photos: photoList(item.photos).map(photo => photo.src), featured: item.featuredOn?.rtw === true,
    video: typeof item.heroVideo === 'string' ? item.heroVideo : null,
    story: (Array.isArray(item.story) ? item.story : []).map(chapter => ({ title: chapter.title ?? null, text: chapter.text ?? '', photos: photoList(chapter.photos).map(photo => photo.src) })),
  })));
  // "Feature on RTW store" in NY Office: that collection's campaign photos become the hero slides.
  const featured = COLLECTIONS.find(item => item.featured && item.photos.length);
  const words = featured ? featured.title.trim().split(/\s+/) : [];
  // A launch video replaces the photo carousel (the cover shows while it loads).
  const featuredSlides = featured ? (featured.video ? [featured.cover] : featured.photos).map((image, index) => ({
    id: `${featured.id}-${index}`, eyebrow: 'FEATURED COLLECTION',
    title: words.length > 1 ? words.slice(0, -1).join(' ') : 'The', accent: `${words.at(-1)}.`,
    copy: featured.copy, image, video: featured.video, cta: { label: 'SEE THE COLLECTION', to: '#featured' }, // the store home shows it right below
  })) : [];
  // A custom hero set in the catalogue manager (Site heroes → RTW Store) replaces the featured collection's.
  const custom = data.heroes?.rtw;
  const customWords = (custom?.title ?? '').trim().split(/\s+/);
  const customSlides = custom?.media?.length ? custom.media.map(file => file.startsWith('site:/') ? mainSite(file.slice(5)) : file).map((src, index) => ({
    id: `custom-${index}`, eyebrow: custom.eyebrow ?? '', title: customWords.slice(0, -1).join(' '), accent: customWords.at(-1) ?? '',
    copy: custom.text ?? '', image: custom.style === 'video' ? null : src, video: custom.style === 'video' ? src : null,
    cta: custom.button ? { label: custom.button.label, to: heroTarget(custom.button.to), external: ['services', 'appointment'].includes(custom.button.to) } : null,
  })) : [];
  const promotions = customSlides.length ? customSlides : featuredSlides.length ? featuredSlides : data.promotions.map(item => ({
    id: item.id, eyebrow: item.eyebrow, title: item.title, accent: item.accent, copy: item.copy,
    image: item.image, cta: { label: item.cta.label, to: item.cta.target.kind === 'collection' ? `/collections/${item.cta.target.id}` : item.cta.target.kind === 'product' ? `/product/${item.cta.target.id}` : `/${item.cta.target.id}` },
  }));
  PROMOTIONS.splice(0, PROMOTIONS.length, ...(promotions.length ? promotions : [{
    id: 'shop-edit', eyebrow: 'THE READY-TO-WEAR EDIT', title: 'Explore the', accent: 'collection.',
    copy: 'Pieces from the NY Atelier catalogue, selected for the way you dress.',
    image: '/products/red-clover-olive-campaign-front.webp', cta: { label: 'SHOP ALL PIECES', to: '/all' },
  }]));
  return data.revision;
}

/** Where a hero button goes, from the store: its own pages, or the main website (an absolute address). */
function heroTarget(to) {
  if (to === 'featured') return '#featured';
  if (to === 'rtw') return '/all';
  if (to === 'services') return mainSite('/services');
  if (to === 'appointment') return mainSite('/appointment');
  if (typeof to === 'string' && to.startsWith('collection:')) return `/collections/${to.slice(11)}`;
  return '/all';
}

export async function loadLiveCatalogue(signal) {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const response = await fetch(`${base}/api/shop/catalogue`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('The atelier catalogue is unavailable right now.');
  return setLiveCatalogue(await response.json());
}

export const findProduct = id => PRODUCTS.find(product => product.id === id);
export const photosOf = (product, colour) => colour.photos.length ? colour.photos : product.photos.length ? product.photos : [{ label: 'Photo coming soon', src: fallbackImage }];
export const coverOf = product => photosOf(product, product.colours[0])[0].src;
export const availabilityOf = (colour, size) => colour.availability[size] ?? 'sold_out';
export const unitsOf = colour => Object.values(colour.availability).filter(status => status !== 'sold_out').length;
export const isSoldOut = product => product.colours.every(colour => unitsOf(colour) === 0);
export const percentOff = product => product.compareAt ? Math.round((1 - product.price / product.compareAt) * 100) : 0;
export function badgeOf(product) {
  if (isSoldOut(product)) return { label: 'OUT OF STOCK', tone: 'stock' };
  if (product.compareAt) return { label: `SALE −${percentOff(product)}%`, tone: 'offer' };
  if (product.isNew) return { label: 'NEW', tone: 'new' };
  return null;
}
export function productsIn(section) {
  if (section === 'new') return PRODUCTS.filter(product => product.isNew);
  if (section === 'men' || section === 'women' || section === 'accessories') return PRODUCTS.filter(product => product.gender === section);
  return PRODUCTS;
}
