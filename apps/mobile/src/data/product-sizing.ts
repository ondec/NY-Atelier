import type { SizingProfile } from '../lib/sizing';
export const productSizing: Record<string, SizingProfile> = {
  ember: { gender: 'men', category: 'long-sleeve-shirt' },
  'heritage-stripe-navy': { gender: 'men', category: 'long-sleeve-shirt', parts: [{ category: 'long-sleeve-shirt' }, { category: 'trousers' }] },
  'redclover-navy': { gender: 'men', category: 'short-sleeve-shirt', parts: [{ category: 'short-sleeve-shirt' }, { category: 'trousers' }] },
  'old-money': { gender: 'men', category: 'long-sleeve-shirt', parts: [{ category: 'long-sleeve-shirt' }, { category: 'trousers' }] },
  aegis: { gender: 'men', category: 'long-sleeve-shirt', parts: [{ category: 'long-sleeve-shirt' }, { category: 'trousers' }] },
  'milano-pants': { gender: 'men', category: 'trousers', fit: 'relaxed' },
  amani: { gender: 'men', category: 'long-sleeve-shirt', parts: [{ category: 'long-sleeve-shirt' }, { category: 'trousers' }] },
  arctic: { gender: 'men', category: 'short-sleeve-shirt', parts: [{ category: 'short-sleeve-shirt' }, { category: 'trousers' }] },
  'aurel-tunic': { gender: 'men', category: 'long-sleeve-shirt', label: 'Long-sleeve tunic' },
};
