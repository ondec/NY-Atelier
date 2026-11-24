// Size guide data: the mobile app's reference chart (apps/mobile/src/data/size-charts.json,
// "International Clothing Size Guide", GH market). These are BODY measurements, not garment
// dimensions, and the regional labels are approximate. Replace with NY Atelier's approved
// garment charts when the atelier publishes them (as the app does through its overrides).

export const REGIONS = [
  { id: 'GH', label: 'GH / International' },
  { id: 'UK', label: 'United Kingdom' },
  { id: 'US', label: 'United States' },
  { id: 'EU', label: 'Europe' },
];

const fmtIn = value => Number.isInteger(value) ? String(value) : value.toFixed(1);

/** Charts by gender, then garment part. Ranges are [min, max] in cm. */
export const CHARTS = {
  men: {
    shirt: {
      label: 'Shirts & tops', measure: 'chest', measureLabel: 'Chest',
      rows: [
        { size: 'S', range: [91, 96], uk: 15.5, eu: '39–40' },
        { size: 'M', range: [97, 101], uk: 16, eu: '41–42' },
        { size: 'L', range: [102, 106], uk: 17, eu: '43–44' },
        { size: 'XL', range: [107, 111], uk: 17.5, eu: '45–46' },
        { size: '2XL', range: [112, 116], uk: 18.5, eu: '47–48' },
        { size: '3XL', range: [117, 121], uk: 19.5, eu: '49–50' },
      ].map(row => ({ ...row, labels: { UK: `Collar ${fmtIn(row.uk)}″`, US: `Collar ${fmtIn(row.uk)}″`, EU: `Collar ${row.eu}` } })),
    },
    trousers: {
      label: 'Trousers', measure: 'waist', measureLabel: 'Waist',
      rows: [
        { size: 'S', range: [76, 82], uk: [30, 32], eu: '46' },
        { size: 'M', range: [83, 89], uk: [33, 35], eu: '48' },
        { size: 'L', range: [90, 97], uk: [36, 38], eu: '50' },
        { size: 'XL', range: [98, 105], uk: [39, 41], eu: '52' },
        { size: '2XL', range: [106, 113], uk: [42, 44], eu: '54' },
        { size: '3XL', range: [114, 121], uk: [45, 47], eu: '56' },
      ].map(row => ({ ...row, labels: { UK: `W${row.uk[0]}–${row.uk[1]}`, US: `W${row.uk[0]}–${row.uk[1]}`, EU: row.eu } })),
    },
  },
  women: {
    shirt: {
      label: 'Shirts & tops', measure: 'bust', measureLabel: 'Bust', reference: true,
      rows: [['S', 90, '10', '6', '38'], ['M', 95, '12', '8', '40'], ['L', 100, '14', '10', '42'], ['XL', 105, '16', '12', '44'], ['2XL', 112, '18', '14', '46'], ['3XL', 119, '20', '16', '48']]
        .map(([size, value, uk, us, eu]) => ({ size, range: [value, value], labels: { UK: uk, US: us, EU: eu } })),
    },
    trousers: {
      label: 'Trousers', measure: 'waist', measureLabel: 'Waist', reference: true,
      rows: [['S', 70, '10', '6', '38'], ['M', 75, '12', '8', '40'], ['L', 80, '14', '10', '42'], ['XL', 85, '16', '12', '44'], ['2XL', 92, '18', '14', '46'], ['3XL', 99, '20', '16', '48']]
        .map(([size, value, uk, us, eu]) => ({ size, range: [value, value], labels: { UK: uk, US: us, EU: eu } })),
    },
  },
};

/** Trouser inside-leg lengths from the same reference (not yet sold as separate options). */
export const TROUSER_LENGTHS = [
  { label: 'Short', code: 'L30', inches: 30 },
  { label: 'Regular', code: 'L32', inches: 32 },
  { label: 'Long', code: 'L34', inches: 34 },
  { label: 'Extra long', code: 'L36', inches: 36 },
];

export const MEASURE_LABELS = { chest: 'Chest', bust: 'Bust', waist: 'Waist', hip: 'Hips', shoulder: 'Shoulder', sleeveLength: 'Sleeve length', shirtLength: 'Top length', inseam: 'Inside leg', outseam: 'Outseam' };
const SIZE_ORDER = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

/** The built-in reference chart for one part, in the same shape as an Office chart. */
function referenceChart(gender, part) {
  const chart = CHARTS[gender][part];
  return {
    key: part, part, gender, label: chart.label, source: 'reference', unit: 'cm', measurementType: 'body',
    mode: chart.reference ? 'reference-point' : 'range', required: [chart.measure], fitAllowance: {}, columns: [chart.measure],
    rows: chart.rows.map(row => ({ size: row.size, measurements: { [chart.measure]: row.range }, labels: row.labels })),
  };
}

/**
 * Charts for a product page. Charts published in NY Office win; otherwise the reference body
 * chart for the parts listed on the product. `publication` comes from published-sizing.js.
 */
export function chartsFor(product, publication, publishedCharts) {
  const published = publishedCharts ? publishedCharts(product, publication) : [];
  if (published.length) return published;
  const gender = product.gender === 'women' ? 'women' : 'men';
  return (product.sizing ?? []).filter(part => CHARTS[gender][part]).map(part => referenceChart(gender, part));
}

const toUnit = (value, from, to) => from === to ? value : from === 'cm' ? value / 2.54 : value * 2.54;
export function formatValue(value, from, to) {
  const show = n => { const v = toUnit(n, from, to); return Number.isInteger(v) ? String(v) : v.toFixed(1); };
  if (value === undefined) return '—';
  return Array.isArray(value) ? (value[0] === value[1] ? show(value[0]) : `${show(value[0])}–${show(value[1])}`) : show(value);
}
/** Measurements Find my size asks for: each chart's required ones. */
export const measuresFor = charts => [...new Set(charts.flatMap(chart => chart.required))];

/** The largest body measurement a row takes, in the chart's unit. */
function capacity(chart, row, key) {
  const value = row.measurements[key];
  if (value === undefined) return undefined;
  const top = Array.isArray(value) ? (chart.measurementType === 'garment' ? value[0] : value[1]) : value;
  return top - (chart.measurementType === 'garment' ? Number(chart.fitAllowance[key] ?? 0) : 0);
}

function sizeFor(chart, values, unit) {
  const inputs = [];
  for (const key of chart.required) {
    const raw = Number(String(values[key] ?? '').replace(',', '.'));
    const label = (MEASURE_LABELS[key] ?? key).toLowerCase();
    if (!raw || raw <= 0) return { status: 'missing', message: `Enter your ${label} to get a suggestion.` };
    inputs.push([key, toUnit(raw, unit, chart.unit), label]);
  }
  const rows = [...chart.rows].sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
  const lowest = (key) => Math.min(...rows.map(row => { const v = row.measurements[key]; return Array.isArray(v) ? v[0] : v; }).filter(Number.isFinite));
  const slack = chart.unit === 'cm' ? 4 : 1.5;
  for (const [key, n, label] of inputs) {
    if (chart.measurementType === 'body' && n < lowest(key) - slack) return { status: 'outside', message: `Your ${label} is below this chart. The atelier can make this piece to your measurements.` };
  }
  const fits = row => inputs.every(([key, n]) => { const top = capacity(chart, row, key); return top !== undefined && n <= top + 1e-8; });
  let row = rows.find(fits);
  // The reference body chart allows a little room above its largest size, as before.
  if (!row && chart.source === 'reference' && inputs.every(([key, n]) => n <= capacity(chart, rows.at(-1), key) + slack)) row = rows.at(-1);
  if (!row) {
    const [, , label] = inputs[0];
    return { status: 'outside', message: `Your ${inputs.length > 1 ? 'measurements are' : `${label} is`} above this chart. The atelier can make this piece to your measurements.` };
  }
  return { status: 'match', size: row.size };
}

/**
 * Recommend a size from body measurements (in the given unit). For a set, each part is sized
 * on its own and the larger size is suggested, as a tailor would for a matching set.
 */
export function recommendSize(charts, values, unit) {
  const picks = [];
  for (const chart of charts) {
    const result = sizeFor(chart, values, unit);
    if (result.status !== 'match') return result;
    picks.push({ chart, size: result.size });
  }
  if (!picks.length) return null;
  const size = picks.reduce((best, pick) => SIZE_ORDER.indexOf(pick.size) > SIZE_ORDER.indexOf(best) ? pick.size : best, picks[0].size);
  const split = picks.length > 1 && picks.some(pick => pick.size !== size);
  const basis = charts.every(chart => chart.source === 'product') ? 'NY Atelier\'s chart for this piece' : 'the reference body chart';
  return {
    status: 'match', size,
    message: split
      ? `We suggest ${size}: ${picks.map(pick => `${pick.chart.label.toLowerCase()} ${pick.size}`).join(', ')}. For a set in two sizes, ask the atelier.`
      : `We suggest size ${size}, based on ${basis}.`,
  };
}
