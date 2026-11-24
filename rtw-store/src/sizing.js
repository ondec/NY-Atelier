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

export const chartsFor = product => (product.sizing ?? []).map(part => ({ part, ...CHARTS[product.gender === 'women' ? 'women' : 'men'][part] }));

export function formatRange([min, max], unit) {
  const convert = value => unit === 'in' ? (value / 2.54).toFixed(1) : String(value);
  return min === max ? convert(min) : `${convert(min)}–${convert(max)}`;
}


/**
 * Recommend a size from body measurements (in the given unit). For a set, each part is sized
 * on its own and the larger size is suggested, as a tailor would for a matching set.
 */
export function recommendSize(charts, values, unit) {
  const order = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
  const picks = [];
  for (const chart of charts) {
    const raw = Number(String(values[chart.measure] ?? '').replace(',', '.'));
    if (!raw || raw <= 0) return { status: 'missing', message: `Enter your ${chart.measureLabel.toLowerCase()} to get a suggestion.` };
    const cm = unit === 'in' ? raw * 2.54 : raw;
    const rows = chart.rows;
    if (cm < rows[0].range[0] - 4) return { status: 'outside', message: `Your ${chart.measureLabel.toLowerCase()} is below this chart. The atelier can make this piece to your measurements.` };
    const row = rows.find(r => cm <= r.range[1]) ?? (cm <= rows.at(-1).range[1] + 4 ? rows.at(-1) : null);
    if (!row) return { status: 'outside', message: `Your ${chart.measureLabel.toLowerCase()} is above this chart. The atelier can make this piece to your measurements.` };
    picks.push({ chart, size: row.size });
  }
  if (!picks.length) return null;
  const size = picks.reduce((best, pick) => order.indexOf(pick.size) > order.indexOf(best) ? pick.size : best, picks[0].size);
  const split = picks.length > 1 && picks.some(pick => pick.size !== size);
  return {
    status: 'match', size,
    message: split
      ? `We suggest ${size}: ${picks.map(pick => `${pick.chart.label.toLowerCase()} ${pick.size}`).join(', ')}. For a set in two sizes, ask the atelier.`
      : `We suggest size ${size}, based on the reference body chart.`,
  };
}
