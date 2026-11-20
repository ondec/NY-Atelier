export const ALPHA_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'] as const;
export type AlphaSize = typeof ALPHA_SIZES[number];
export type Unit = 'cm' | 'in';
export type Gender = 'men' | 'women';
export type GarmentCategory = 'long-sleeve-shirt' | 'short-sleeve-shirt' | 'trousers';
export type Region = 'GH' | 'UK' | 'US' | 'EU';
export const MEASUREMENTS = ['chest', 'bust', 'waist', 'hip', 'shoulder', 'sleeveLength', 'shirtLength', 'inseam', 'outseam'] as const;
export type Measurement = typeof MEASUREMENTS[number];
export type Dimension = number | [number, number];
export type Fit = 'regular' | 'slim' | 'relaxed';
export type ChartRow = { size: AlphaSize; measurements: Partial<Record<Measurement, Dimension>>; labels: Partial<Record<Region, string>> };
export type SizingChart = {
  id: string; gender: Gender; category: GarmentCategory; source: 'reference' | 'vendor' | 'product';
  unit: Unit; measurementType: 'body' | 'garment'; mode: 'range' | 'reference-point' | 'maximum';
  fit: Fit; required: Measurement[]; rows: ChartRow[];
  // Garment dimensions require an explicitly approved allowance for every input dimension.
  fitAllowance?: Partial<Record<Measurement, number>>;
};
export type SizingPart = { category: GarmentCategory; label?: string; fit?: Fit; chartId?: string; vendorChartId?: string };
export type SizingProfile = SizingPart & { gender: Gender; parts?: SizingPart[] };
export type ResolvedSizingPart = { profile: SizingProfile; chart: SizingChart | undefined; label: string };
export type PurchasableVariant = { id: string; productId: string; colorId: string; size: AlphaSize; stock: number; length?: { code: string; value: number; unit: Unit } };
export type VariantProduct = { id: string; colors: { id: string; stock?: Partial<Record<AlphaSize, number>>; inventory?: PurchasableVariant[] }[] };

export function convertMeasurement(value: number, from: Unit, to: Unit): number {
  if (!Number.isFinite(value)) throw new Error('Measurement must be finite.');
  return from === to ? value : from === 'in' ? value * 2.54 : value / 2.54;
}
export function formatMeasurement(value: Dimension, from: Unit, to: Unit): string {
  const format = (n: number) => Number(convertMeasurement(n, from, to).toFixed(2)).toString();
  return Array.isArray(value) ? `${format(value[0])}–${format(value[1])}` : format(value);
}
function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object.');
}
function positive(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error('Expected a positive measurement.');
}
function dimension(value: unknown): asserts value is Dimension {
  if (Array.isArray(value)) {
    if (value.length !== 2) throw new Error('A measurement range needs two numbers.');
    value.forEach(positive);
    if (value[0] > value[1]) throw new Error('Reversed measurement range.');
  } else positive(value);
}
function enumValue<T extends string>(value: unknown, values: readonly T[]): asserts value is T {
  if (!values.includes(value as T)) throw new Error(`Invalid value: ${String(value)}`);
}
export function validateChart(value: unknown): SizingChart {
  record(value);
  if (typeof value.id !== 'string' || !value.id.trim()) throw new Error('Chart ID is required.');
  enumValue(value.gender, ['men', 'women']); enumValue(value.category, ['long-sleeve-shirt', 'short-sleeve-shirt', 'trousers']);
  enumValue(value.source, ['reference', 'vendor', 'product']); enumValue(value.unit, ['cm', 'in']);
  enumValue(value.measurementType, ['body', 'garment']); enumValue(value.mode, ['range', 'reference-point', 'maximum']);
  enumValue(value.fit, ['regular', 'slim', 'relaxed']);
  if (!Array.isArray(value.required) || !value.required.length || new Set(value.required).size !== value.required.length) throw new Error('Required measurements are missing or duplicated.');
  value.required.forEach(key => enumValue(key, MEASUREMENTS));
  const primary = value.category === 'trousers' ? 'waist' : value.gender === 'men' ? 'chest' : 'bust';
  if (!value.required.includes(primary)) throw new Error(`Chart requires ${primary} as its primary body measurement.`);
  if (!Array.isArray(value.rows) || !value.rows.length) throw new Error('Chart rows are missing.');
  const sizes = new Set<string>();
  for (const row of value.rows) {
    record(row); enumValue(row.size, ALPHA_SIZES);
    if (sizes.has(row.size)) throw new Error('Duplicate chart size.');
    sizes.add(row.size); record(row.measurements); record(row.labels);
    for (const [key, measurement] of Object.entries(row.measurements)) { enumValue(key, MEASUREMENTS); dimension(measurement); }
    for (const key of value.required) if (row.measurements[key] === undefined) throw new Error(`Missing ${key} for ${row.size}.`);
    for (const [region, label] of Object.entries(row.labels)) { enumValue(region, ['GH', 'UK', 'US', 'EU']); if (typeof label !== 'string' || !label.trim()) throw new Error('Invalid regional label.'); }
  }
  if (value.fitAllowance !== undefined) {
    record(value.fitAllowance);
    for (const [key, allowance] of Object.entries(value.fitAllowance)) {
      enumValue(key, MEASUREMENTS);
      if (typeof allowance !== 'number' || !Number.isFinite(allowance) || allowance < 0) throw new Error('Invalid fit allowance.');
    }
  }
  return value as unknown as SizingChart;
}
export function validateOverrides(value: unknown): SizingChart[] {
  record(value);
  if (value.version !== '1.0' || !Array.isArray(value.charts)) throw new Error('Invalid chart registry.');
  const charts = value.charts.map(validateChart);
  if (new Set(charts.map(c => c.id)).size !== charts.length) throw new Error('Duplicate chart ID.');
  return charts;
}
export function parseReferenceDataset(value: unknown): { charts: SizingChart[]; lengths: { label: string; code: string; inseamIn: number }[] } {
  record(value);
  if (value.version !== '1.0' || value.market !== 'GH' || value.defaultUnit !== 'cm' || value.measurementType !== 'body' || value.fit !== 'regular' || value.conversionConfidence !== 'approximate' || value.ghanaSizeSystem !== 'international-alpha' || JSON.stringify(value.sizes) !== JSON.stringify(ALPHA_SIZES)) throw new Error('Invalid reference metadata.');
  record(value.charts);
  const charts: SizingChart[] = [];
  for (const gender of ['men', 'women'] as const) {
    const group = value.charts[gender]; record(group);
    for (const kind of ['shirts', 'trousers'] as const) {
      const raw = group[kind]; record(raw);
      const category = kind === 'shirts' ? 'long-sleeve-shirt' : 'trousers';
      if (raw.category !== category || !Array.isArray(raw.rows) || raw.rows.length !== 6) throw new Error('Invalid reference chart.');
      const expectedPrimary = kind === 'trousers' ? 'waistCm' : gender === 'men' ? 'chestCm' : 'bustCm';
      if (raw.primaryMeasurement !== expectedPrimary || (gender === 'women' && raw.measurementMode !== 'reference-point')) throw new Error('Invalid reference measurement metadata.');
      const required = [expectedPrimary.replace(/Cm$/, '') as Measurement];
      if (raw.secondaryMeasurement !== undefined) {
        if (raw.secondaryMeasurement !== 'hipCm' || gender !== 'women' || kind !== 'trousers') throw new Error('Invalid secondary measurement.');
        required.push('hip');
      }
      const rows = raw.rows.map((item: unknown) => {
        record(item); enumValue(item.size, ALPHA_SIZES);
        const measurements: ChartRow['measurements'] = {};
        for (const key of MEASUREMENTS) if (item[`${key}Cm`] !== undefined) { dimension(item[`${key}Cm`]); measurements[key] = item[`${key}Cm`] as Dimension; }
        const labels: ChartRow['labels'] = {};
        for (const region of ['uk', 'us', 'eu'] as const) if (item[region] !== undefined) { if (typeof item[region] !== 'string') throw new Error('Invalid regional label.'); labels[region.toUpperCase() as Region] = item[region]; }
        if (item.collarUkUsIn !== undefined) { positive(item.collarUkUsIn); labels.UK = labels.US = `${item.collarUkUsIn} in collar`; }
        if (item.collarEuCm !== undefined) { if (typeof item.collarEuCm !== 'string') throw new Error('Invalid collar label.'); labels.EU = `${item.collarEuCm} cm collar`; }
        if (item.ukUsWaistIn !== undefined) { dimension(item.ukUsWaistIn); labels.UK = labels.US = `${formatMeasurement(item.ukUsWaistIn, 'in', 'in')} in waist`; }
        return { size: item.size, measurements, labels };
      });
      charts.push(validateChart({ id: `reference-${gender}-${category}`, gender, category, source: 'reference', unit: 'cm', measurementType: 'body', mode: gender === 'women' ? 'reference-point' : 'range', fit: 'regular', required, rows }));
    }
  }
  if (!Array.isArray(value.trouserLengths)) throw new Error('Missing reference lengths.');
  const lengths = value.trouserLengths.map((item: unknown) => {
    record(item); positive(item.inseamIn);
    if (typeof item.label !== 'string' || typeof item.code !== 'string') throw new Error('Invalid reference length.');
    return { label: item.label, code: item.code, inseamIn: item.inseamIn };
  });
  return { charts, lengths };
}
export function resolveChart(profile: SizingProfile, references: SizingChart[], overrides: SizingChart[]): SizingChart | undefined {
  const id = profile.chartId ?? profile.vendorChartId;
  const chart = id ? overrides.find(c => c.id === id) : references.find(c => c.gender === profile.gender && c.category === profile.category);
  if (chart?.gender === profile.gender && chart.category === profile.category) return chart;
  if (id || profile.category !== 'short-sleeve-shirt') return undefined;
  // Shared body circumferences can inform either shirt style. Never reuse long-sleeve
  // garment dimensions or collar conversions as a short-sleeve product chart.
  const shirt = references.find(c => c.gender === profile.gender && c.category === 'long-sleeve-shirt' && c.source === 'reference' && c.measurementType === 'body');
  return shirt && { ...shirt, id: `reference-${profile.gender}-short-sleeve-body`, category: 'short-sleeve-shirt', rows: shirt.rows.map(row => ({ ...row, labels: {}, measurements: Object.fromEntries(Object.entries(row.measurements).filter(([key]) => ['chest', 'bust', 'waist', 'hip'].includes(key))) })) };
}
export function resolveProductSizing(profile: SizingProfile | undefined, references: SizingChart[], overrides: SizingChart[]): ResolvedSizingPart[] {
  if (!profile) return [];
  const parts = profile.parts?.length ? profile.parts : [profile];
  return parts.map(part => {
    const primary = part.category === profile.category;
    const single: SizingProfile = { ...part, gender: profile.gender, fit: part.fit ?? profile.fit, chartId: part.chartId ?? (primary ? profile.chartId : undefined), vendorChartId: part.vendorChartId ?? (primary ? profile.vendorChartId : undefined) };
    return { profile: single, chart: resolveChart(single, references, overrides), label: part.label ?? (part.category === 'trousers' ? 'Trousers' : part.category === 'short-sleeve-shirt' ? 'Short-sleeve top' : 'Long-sleeve top') };
  });
}
export function regionalLabel(row: ChartRow | undefined, size: AlphaSize, region: Region): string {
  return region === 'GH' ? size : row?.labels[region] ? `${row.labels[region]} · ${size}` : size;
}
export function productVariants(product: VariantProduct, colorId: string): PurchasableVariant[] {
  const color = product.colors.find(c => c.id === colorId);
  const variants: PurchasableVariant[] = color?.inventory ?? ALPHA_SIZES.flatMap(size => color?.stock?.[size] === undefined ? [] : [{ id: `${product.id}:${colorId}:${size}`, productId: product.id, colorId, size, stock: color.stock[size]! }]);
  const ids = new Set<string>();
  const combinations = new Set<string>();
  for (const variant of variants) {
    enumValue(variant.size, ALPHA_SIZES);
    if (!variant.id || ids.has(variant.id) || variant.productId !== product.id || variant.colorId !== colorId || !Number.isInteger(variant.stock) || variant.stock < 0) throw new Error('Invalid product inventory.');
    const combination = `${variant.size}:${variant.length?.code ?? ""}`;
    if (combinations.has(combination)) throw new Error("Duplicate purchasable size and length.");
    combinations.add(combination);
    ids.add(variant.id);
    if (variant.length) { positive(variant.length.value); enumValue(variant.length.unit, ['cm', 'in']); if (!variant.length.code) throw new Error('Missing length code.'); }
  }
  return variants;
}
export function selectVariant(variants: PurchasableVariant[], size: AlphaSize, lengthCode?: string): PurchasableVariant | undefined {
  return variants.find(v => v.size === size && v.stock > 0 && (v.length ? v.length.code === lengthCode : lengthCode === undefined));
}
export type Recommendation = { status: 'match'; size: AlphaSize; variants: PurchasableVariant[]; message: string } | { status: 'insufficient' | 'invalid' | 'out-of-range' | 'unavailable'; message: string };
export function recommendSize(chart: SizingChart | undefined, body: Partial<Record<Measurement, number>>, unit: Unit, variants: PurchasableVariant[], fit?: Fit): Recommendation {
  if (Object.values(body).some(v => v === undefined || !Number.isFinite(v) || v <= 0)) return { status: 'invalid', message: 'Enter positive numbers for your measurements.' };
  if (!chart || chart.source === 'reference' || chart.mode === 'reference-point') return { status: 'insufficient', message: 'A product or vendor fit chart is needed for a reliable recommendation. The reference guide alone cannot confirm your fit.' };
  if (fit && fit !== chart.fit) return { status: 'insufficient', message: 'The chart does not describe this product’s fit. Ask NY Atelier to confirm sizing.' };
  if (chart.required.some(key => body[key] === undefined)) return { status: 'insufficient', message: `Enter all required measurements: ${chart.required.join(', ')}.` };
  const entries = Object.entries(body).map(([key, n]) => [key as Measurement, convertMeasurement(n!, unit, chart.unit)] as const);
  const relevant = entries.filter(([key]) => key !== 'inseam');
  if (chart.rows.some(row => relevant.some(([key]) => row.measurements[key] === undefined)) || (chart.measurementType === 'garment' && relevant.some(([key]) => chart.fitAllowance?.[key] === undefined))) return { status: 'insufficient', message: 'The product chart needs measurements and approved fit allowances for every dimension you supplied.' };
  const capacity = (row: ChartRow, key: Measurement) => {
    const value = row.measurements[key]!;
    return (Array.isArray(value) ? (chart.measurementType === 'body' ? value[1] : value[0]) : value) - (chart.measurementType === 'garment' ? chart.fitAllowance![key]! : 0);
  };
  if (chart.measurementType === 'body' && chart.mode === 'range' && relevant.some(([key, n]) => n < Math.min(...chart.rows.map(r => { const v = r.measurements[key]!; return Array.isArray(v) ? v[0] : v; })))) return { status: 'out-of-range', message: 'Your measurements fall below the range covered by this product chart. Please ask NY Atelier for fit advice.' };
  const fitting = [...chart.rows].sort((a, b) => ALPHA_SIZES.indexOf(a.size) - ALPHA_SIZES.indexOf(b.size)).filter(row => relevant.every(([key, n]) => n <= capacity(row, key) + 1e-8));
  if (!fitting.length) return { status: 'out-of-range', message: 'No size in this product chart accommodates all your measurements. Please contact NY Atelier for a fitting.' };
  for (const row of fitting) {
    let available = variants.filter(v => v.size === row.size && v.stock > 0);
    if (body.inseam !== undefined) {
      if (!variants.some(v => v.length)) return { status: 'insufficient', message: 'This product has no verified inseam lengths. We cannot recommend a trouser length yet.' };
      available = available.filter(v => v.length && convertMeasurement(v.length.value, v.length.unit, unit) + 1e-8 >= body.inseam!);
      if (available.length) { const shortest = Math.min(...available.map(v => convertMeasurement(v.length!.value, v.length!.unit, 'cm'))); available = available.filter(v => convertMeasurement(v.length!.value, v.length!.unit, 'cm') === shortest); }
    }
    if (available.length) return { status: 'match', size: row.size, variants: available, message: `${row.size} is the smallest stocked size that accommodates all supplied measurements for this ${chart.fit} fit.${available[0].length ? ` Recommended inseam: ${formatMeasurement(available[0].length.value, available[0].length.unit, unit)} ${unit} (${available[0].length.code}). Select this length in the inseam options.` : ''}` };
  }
  return { status: 'unavailable', message: 'A size fits the chart, but no matching size and length is currently in stock.' };
}

export function recommendProductSize(parts: ResolvedSizingPart[], body: Partial<Record<Measurement, number>>, unit: Unit, variants: PurchasableVariant[]): Recommendation {
  if (parts.length === 1) return recommendSize(parts[0].chart, body, unit, variants, parts[0].profile.fit);
  if (!parts.length || parts.some(part => !part.chart || part.chart.source === 'reference' || part.chart.mode === 'reference-point')) return { status: 'insufficient', message: 'Approved fit measurements are needed for every piece in this set before we can recommend a size.' };
  if (Object.values(body).some(value => value === undefined || !Number.isFinite(value) || value <= 0)) return { status: 'invalid', message: 'Enter positive numbers for your measurements.' };
  const forPart = (part: ResolvedSizingPart) => {
    const keys = new Set(part.chart!.rows.flatMap(row => Object.keys(row.measurements)));
    part.chart!.required.forEach(key => keys.add(key));
    if (part.profile.category === 'trousers') keys.add('inseam');
    return Object.fromEntries(Object.entries(body).filter(([key]) => keys.has(key)));
  };
  const known = new Set(parts.flatMap(part => [...part.chart!.required, ...part.chart!.rows.flatMap(row => Object.keys(row.measurements)), ...(part.profile.category === 'trousers' ? ['inseam'] : [])]));
  if (Object.keys(body).some(key => !known.has(key))) return { status: 'insufficient', message: 'The set’s charts do not cover every measurement you supplied.' };
  for (const part of parts) {
    const result = recommendSize(part.chart, forPart(part), unit, variants, part.profile.fit);
    if (result.status !== 'match') return { ...result, message: `${part.label}: ${result.message}` };
  }
  for (const size of ALPHA_SIZES) {
    const candidates = variants.filter(variant => variant.size === size && variant.stock > 0);
    if (!candidates.length) continue;
    const results = parts.map(part => recommendSize(part.chart, forPart(part), unit, candidates, part.profile.fit));
    if (results.every(result => result.status === 'match')) {
      const matching = candidates.filter(variant => results.every(result => result.status === 'match' && result.variants.some(v => v.id === variant.id)));
      if (matching.length) return { status: 'match', size, variants: matching, message: `${size} is the smallest stocked size that accommodates your measurements for every piece in this set.` };
    }
  }
  return { status: 'unavailable', message: 'No stocked size and length accommodates all pieces together. Please contact NY Atelier for fit advice.' };
}

export type PublishedSizing = {
  version: '1.0'; revision: number; charts: SizingChart[];
  products: Record<string, SizingProfile>;
  collections: Record<string, { productIds: string[]; profile: SizingProfile }>;
};
export const emptyPublishedSizing: PublishedSizing = { version: '1.0', revision: 0, charts: [], products: {}, collections: {} };
export const sizingProductId = (id: string) => id.replace(/^shop-/, '');
export function validateSizingProfile(value: unknown, charts: SizingChart[]): SizingProfile {
  record(value); enumValue(value.gender, ['men', 'women']);
  const parts = Array.isArray(value.parts) && value.parts.length ? value.parts : [value];
  if (parts.length > 3) throw new Error('Choose at most three garment parts.');
  const seen = new Set<string>();
  const validated = parts.map(part => {
    record(part); enumValue(part.category, ['long-sleeve-shirt', 'short-sleeve-shirt', 'trousers']);
    if (seen.has(part.category)) throw new Error('Duplicate garment part.');
    seen.add(part.category);
    const chart = charts.find(chart => chart.id === part.chartId);
    if (!chart || chart.source === 'reference' || chart.gender !== value.gender || chart.category !== part.category) throw new Error('Each garment part needs a matching approved chart.');
    return { category: part.category, chartId: chart.id, fit: chart.fit, ...(typeof part.label === 'string' && part.label.trim() ? { label: part.label.trim().slice(0, 80) } : {}) };
  });
  return { gender: value.gender, category: validated[0].category, parts: validated };
}
export function validatePublishedSizing(value: unknown): PublishedSizing {
  record(value);
  if (value.version !== '1.0' || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0) throw new Error('Invalid sizing publication.');
  const charts = validateOverrides(value);
  if (charts.length > 300) throw new Error('Too many charts.');
  record(value.products); record(value.collections);
  const products: PublishedSizing['products'] = Object.create(null);
  const collections: PublishedSizing['collections'] = Object.create(null);
  const checkId = (id: string) => { if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(id)) throw new Error('Invalid catalogue ID.'); };
  for (const [id, profile] of Object.entries(value.products)) { checkId(id); products[id] = validateSizingProfile(profile, charts); }
  for (const [id, item] of Object.entries(value.collections)) {
    checkId(id); record(item);
    if (!Array.isArray(item.productIds) || item.productIds.length > 500 || item.productIds.some(id => typeof id !== 'string')) throw new Error('Invalid collection members.');
    item.productIds.forEach(checkId);
    collections[id] = { productIds: [...new Set(item.productIds.map(sizingProductId))], profile: validateSizingProfile(item.profile, charts) };
  }
  return { version: '1.0', revision: value.revision as number, charts, products, collections };
}
export function publishedProductProfile(id: string, base: SizingProfile | undefined, publication: PublishedSizing): SizingProfile | undefined {
  const key = sizingProductId(id);
  const direct = publication.products[key] ?? publication.products[`shop-${key}`];
  if (direct) return direct;
  if (!base) return undefined;
  const matches = Object.values(publication.collections).filter(collection => collection.productIds.some(id => sizingProductId(id) === key) && collection.profile.gender === base.gender);
  // Conflicting defaults require an explicit product choice, rather than an arbitrary winner.
  if (matches.length !== 1) return base;
  const shared = matches[0].profile.parts ?? [matches[0].profile];
  const parts = (base.parts?.length ? base.parts : [base]).map(part => shared.find(sharedPart => sharedPart.category === part.category) ?? part);
  return { ...base, parts };
}
