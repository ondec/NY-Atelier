export type SizeMeasurement = { label: string; value: number; max?: number };
export type SizeChart = { unit: 'cm' | 'in'; kind: 'body' | 'garment'; sizes: Record<string, SizeMeasurement[]> };
export type SizeCharts = { products: Record<string, SizeChart>; clothingTypes: Record<string, SizeChart> };

// Populate only with NY Atelier's approved charts. No sample dimensions are shown to customers.
export const sizeCharts: SizeCharts = { products: {}, clothingTypes: {} };
const clothingKeys: Record<string, string> = { 'Tops & shirts': 'tops', Trousers: 'trousers', 'Two-piece sets': 'sets', Kaftans: 'kaftans', Agbadas: 'agbadas', Suits: 'suits', Dresses: 'dresses', Skirts: 'skirts' };

export function getSizeChart(productId: string, clothingType: string, charts = sizeCharts): SizeChart | undefined {
  return charts.products[productId.replace(/^shop-/, '')] ?? charts.clothingTypes[clothingKeys[clothingType] ?? clothingType];
}

export function selectedSizeSummary(productId: string, clothingType: string, size: string, charts = sizeCharts, displayUnit?: 'cm' | 'in') {
  const chart = getSizeChart(productId, clothingType, charts);
  const measurements = chart?.sizes[size];
  if (!chart || !measurements?.length) return `Size ${size} · Measurements will be available once NY Atelier adds the size chart.`;
  const unit = displayUnit ?? chart.unit;
  const convert = (value: number) => Number((chart.unit === unit ? value : unit === 'in' ? value / 2.54 : value * 2.54).toFixed(2));
  const values = measurements.map(item => `${item.label} ${convert(item.value)}${item.max !== undefined ? `–${convert(item.max)}` : ''} ${unit}`).join(', ');
  return `Size ${size} · ${chart.kind === 'body' ? 'Body measurements' : 'Garment measurements'}: ${values}.`;
}
