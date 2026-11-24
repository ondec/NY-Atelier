// Size charts published from NY Office ("Edit size chart" on a product, or a collection's
// size defaults). The same feed the customer app reads: GET <portal>/api/size-charts.
import { useEffect, useState } from 'react';

const SIZE_ORDER = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const MAX_AGE_MS = 60_000;
let cache = null;

const sizingProductId = id => String(id).replace(/^shop-/, '');

function isPublication(data) {
  return data && Array.isArray(data.charts) && data.products && typeof data.products === 'object' && data.collections && typeof data.collections === 'object';
}

export function loadPublishedSizing() {
  if (cache && Date.now() - cache.at < MAX_AGE_MS) return cache.promise;
  const base = (import.meta.env?.VITE_SIZE_GUIDE_URL ?? '').replace(/\/$/, '');
  const promise = fetch(`${base}/api/size-charts`, { cache: 'no-store' })
    .then(response => response.ok ? response.json() : null)
    .then(data => isPublication(data) ? data : null)
    .catch(() => null);
  cache = { at: Date.now(), promise };
  return promise;
}

/** The published charts, or null while loading or when the feed is unavailable. */
export function usePublishedSizing() {
  const [publication, setPublication] = useState(null);
  useEffect(() => {
    let active = true;
    void loadPublishedSizing().then(data => { if (active) setPublication(data); });
    return () => { active = false; };
  }, []);
  return publication;
}

/**
 * The Office sizing profile for a product: its own chart first, otherwise its collection's
 * size defaults for the product's section (or the only default when the section is not set).
 */
export function publishedProfile(product, publication) {
  if (!publication) return null;
  const key = sizingProductId(product.id);
  const direct = publication.products[key] ?? publication.products[`shop-${key}`];
  if (direct) return direct;
  const matches = Object.values(publication.collections).filter(item =>
    Array.isArray(item?.productIds) && item.productIds.some(id => sizingProductId(id) === key) &&
    (!product.gender || product.gender === 'accessories' || item.profile?.gender === product.gender));
  // Two different defaults (for example men and women) need a section or a product chart to choose.
  return matches.length === 1 ? matches[0].profile : null;
}

/** Published chart parts for a product, in the store's chart shape. Empty when Office has none. */
export function publishedCharts(product, publication) {
  const profile = publishedProfile(product, publication);
  if (!profile) return [];
  const parts = profile.parts?.length ? profile.parts : [profile];
  return parts.flatMap((part, index) => {
    const chartId = part.chartId ?? (index === 0 ? profile.chartId : undefined);
    const chart = publication.charts.find(item => item.id === chartId);
    if (!chart || chart.gender !== profile.gender || chart.category !== part.category || !Array.isArray(chart.rows)) return [];
    const rows = [...chart.rows].filter(row => SIZE_ORDER.includes(row.size)).sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
    const columns = [...new Set([...(chart.required ?? []), ...rows.flatMap(row => Object.keys(row.measurements ?? {}))])];
    return [{
      key: `${part.category}-${index}`, part: part.category === 'trousers' ? 'trousers' : 'shirt', gender: profile.gender,
      label: part.label ?? (part.category === 'trousers' ? 'Trousers' : part.category === 'short-sleeve-shirt' ? 'Short-sleeve top' : 'Long-sleeve top'),
      source: 'product', unit: chart.unit === 'in' ? 'in' : 'cm', measurementType: chart.measurementType, mode: chart.mode, fit: chart.fit,
      required: chart.required ?? [], fitAllowance: chart.fitAllowance ?? {}, columns,
      rows: rows.map(row => ({ size: row.size, measurements: row.measurements ?? {}, labels: row.labels ?? {} })),
    }];
  });
}
