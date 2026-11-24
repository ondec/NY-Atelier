// Live ready-to-wear catalogue for the app. It reads the same public endpoint as the RTW store
// and the website (GET /api/shop/catalogue), so products, prices, photos and availability are
// managed once in NY Studio. The API never sends exact stock counts, only availability bands.
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { productSizing } from '@/data/product-sizing';
import { SHOP_SIZES, sizingProductId, type Gender, type PurchasableVariant, type ShopSize, type SizingProfile } from '@/lib/sizing';

export type ImageSource = number | { uri: string };
export type ClothingType = 'tops' | 'trousers' | 'sets' | 'accessories' | 'other';
export type ColorGroup = 'black' | 'blue' | 'light' | 'brown';
export type ShopPhoto = { id: string; label: string; image: ImageSource };
export type ShopColour = { id: string; name: string; swatch: string; hasSwatch: boolean; group: ColorGroup | null; photos: ShopPhoto[]; inventory: PurchasableVariant[] };
export type ShopProduct = {
  id: string; name: string; description: string;
  price: string; priceValue: number; compareAtPrice?: string; percentOff: number;
  image: ImageSource | null; photos: ShopPhoto[];
  category: 'MEN' | 'WOMEN' | 'ACCESSORIES' | '';
  clothingType: ClothingType; colorGroups: ColorGroup[]; colors: ShopColour[];
  isNew: boolean; soldOut: boolean; sizing?: SizingProfile;
};
export type ShopCollection = { id: string; title: string; description: string; photos: ShopPhoto[]; productIds: string[]; featured: boolean };
type Status = 'loading' | 'ready' | 'error';
type Catalogue = { status: Status; products: ShopProduct[]; collections: ShopCollection[]; reload: () => void };

// Availability bands become stock numbers the size picker understands. "low" means two or fewer.
const BAND_STOCK = { in_stock: 10, low: 2, sold_out: 0 } as const;
const REFRESH_AFTER_MS = 60_000;
const GROUPS: ColorGroup[] = ['black', 'blue', 'light', 'brown'];

export function apiBase() {
  return (process.env.EXPO_PUBLIC_API_BASE_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000')).replace(/\/$/, '');
}

export const formatGHS = (value: number) => `GH₵ ${value.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;

function clothingType(type: unknown): ClothingType {
  const value = String(type ?? '').toLowerCase();
  if (value.includes('set')) return 'sets';
  if (value.includes('trouser') || value.includes('pant')) return 'trousers';
  if (value.includes('top') || value.includes('shirt') || value.includes('tunic')) return 'tops';
  if (value.includes('accessor')) return 'accessories';
  return 'other';
}

function photoList(list: unknown, prefix: string): ShopPhoto[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((photo, index) => {
    const src = typeof photo?.src === 'string' ? photo.src : '';
    if (!src) return [];
    const uri = src.startsWith('/') ? `${apiBase()}${src}` : src;
    return [{ id: `${prefix}-${index}`, label: index === 0 ? 'Front' : `View ${index + 1}`, image: { uri } }];
  });
}

function sizingFor(id: string, gender: Gender | null, parts: unknown): SizingProfile | undefined {
  const known = productSizing[sizingProductId(id)];
  if (known) return gender && known.gender !== gender ? { ...known, gender } : known;
  if (!gender || !Array.isArray(parts) || !parts.length) return undefined;
  const shirt = parts.includes('shirt');
  const trousers = parts.includes('trousers');
  if (shirt && trousers) return { gender, category: 'long-sleeve-shirt', parts: [{ category: 'long-sleeve-shirt' }, { category: 'trousers' }] };
  if (trousers) return { gender, category: 'trousers' };
  return shirt ? { gender, category: 'long-sleeve-shirt' } : undefined;
}

/** Turns the public API response into the shapes the shop screen and bag use. */
export function mapCatalogue(data: any): { products: ShopProduct[]; collections: ShopCollection[] } {
  if (!data || !Array.isArray(data.products) || !Array.isArray(data.collections)) throw new Error('The catalogue response was incomplete.');
  const products = data.products.flatMap((item: any): ShopProduct[] => {
    if (typeof item?.id !== 'string' || typeof item.name !== 'string' || !Number.isInteger(item.priceMinor)) return [];
    const gender: Gender | null = item.section === 'men' || item.section === 'women' ? item.section : null;
    const photos = photoList(item.photos, item.id);
    const colors: ShopColour[] = (Array.isArray(item.colours) ? item.colours : []).flatMap((colour: any): ShopColour[] => {
      if (typeof colour?.id !== 'string') return [];
      const bySize = new Map<ShopSize, number>();
      for (const size of Array.isArray(colour.sizes) ? colour.sizes : []) {
        if (!SHOP_SIZES.includes(size?.label)) continue;
        const stock = BAND_STOCK[size.availability as keyof typeof BAND_STOCK] ?? 0;
        bySize.set(size.label, Math.max(bySize.get(size.label) ?? 0, stock));
      }
      const inventory = SHOP_SIZES.filter(size => bySize.has(size)).map(size => ({ id: `${item.id}:${colour.id}:${size}`, productId: item.id, colorId: colour.id, size, stock: bySize.get(size)! }));
      return [{
        id: colour.id, name: String(colour.name || 'As shown'), swatch: typeof colour.swatch === 'string' ? colour.swatch : '#A9AAA5', hasSwatch: typeof colour.swatch === 'string',
        group: GROUPS.includes(colour.group) ? colour.group : null, photos: photoList(colour.photos, `${item.id}-${colour.id}`), inventory,
      }];
    });
    const offer = Number.isInteger(item.offerPriceMinor) && item.offerPriceMinor < item.priceMinor ? item.offerPriceMinor : null;
    const priceValue = (offer ?? item.priceMinor) / 100;
    return [{
      id: item.id, name: item.name, description: typeof item.description === 'string' ? item.description : '',
      price: formatGHS(priceValue), priceValue,
      compareAtPrice: offer ? formatGHS(item.priceMinor / 100) : undefined,
      percentOff: offer ? Math.round((1 - offer / item.priceMinor) * 100) : 0,
      image: photos[0]?.image ?? colors.find(colour => colour.photos.length)?.photos[0].image ?? null, photos,
      category: item.section === 'women' ? 'WOMEN' : item.section === 'men' ? 'MEN' : item.section === 'accessories' ? 'ACCESSORIES' : '',
      clothingType: item.section === 'accessories' ? 'accessories' : clothingType(item.type),
      colorGroups: [...new Set(colors.map(colour => colour.group).filter((group): group is ColorGroup => group !== null))],
      colors, isNew: item.isNew === true,
      soldOut: colors.every(colour => colour.inventory.every(variant => variant.stock === 0)),
      sizing: sizingFor(item.id, gender, item.sizing),
    }];
  });
  const collections = data.collections.flatMap((item: any): ShopCollection[] => {
    if (typeof item?.id !== 'string' || typeof item.title !== 'string') return [];
    const productIds = (Array.isArray(item.productIds) ? item.productIds : []).filter((id: unknown) => products.some((product: ShopProduct) => product.id === id));
    const own = photoList(Array.isArray(item.photos) && item.photos.length ? item.photos : item.cover ? [item.cover] : [], item.id);
    const fallback = products.find((product: ShopProduct) => productIds.includes(product.id))?.photos.slice(0, 1) ?? [];
    // "Feature on app" in NY Office: the API keeps at most one collection featured per site.
    return [{ id: item.id, title: item.title, description: typeof item.copy === 'string' ? item.copy : '', photos: own.length ? own : fallback, productIds, featured: item.featuredOn?.app === true }];
  });
  return { products, collections };
}

const CatalogueContext = createContext<Catalogue | null>(null);

export function useShopCatalogue() {
  const catalogue = useContext(CatalogueContext);
  if (!catalogue) throw new Error('ShopCatalogueProvider is missing');
  return catalogue;
}

export function ShopCatalogueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<Catalogue, 'reload'>>({ status: 'loading', products: [], collections: [] });
  const loadedAt = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    fetch(`${apiBase()}/api/shop/catalogue`, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(response => { if (!response.ok) throw new Error('unavailable'); return response.json(); })
      .then(data => {
        const next = mapCatalogue(data);
        loadedAt.current = Date.now();
        setState({ status: 'ready', ...next });
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        // Keep showing the last good catalogue if a refresh fails; never fall back to sample stock.
        setState(current => current.products.length ? current : { status: 'error', products: [], collections: [] });
        if (__DEV__) console.warn('Shop catalogue unavailable', error);
      });
  }, []);

  useEffect(() => {
    load();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active' && Date.now() - loadedAt.current > REFRESH_AFTER_MS) load();
    });
    return () => { subscription.remove(); inFlight.current?.abort(); };
  }, [load]);

  const reload = useCallback(() => {
    setState(current => current.products.length ? current : { ...current, status: 'loading' });
    load();
  }, [load]);

  return <CatalogueContext.Provider value={{ ...state, reload }}>{children}</CatalogueContext.Provider>;
}
