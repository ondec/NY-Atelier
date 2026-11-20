import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { atelier } from '@/atelier-theme';
import { ShopActionIcon } from '@/components/shop-action-icon';
import { NyIcon } from '@/components/ny-icon';
import { useAccountMeasurements } from '@/lib/account-measurements';
import { canonicalMeasurement } from '@/lib/account-settings';
import { sizingAccountKeys } from '@/lib/measurement-history';
import { approvedSizingCharts, referenceSizing } from '@/data/sizing-data';
import {
  ALPHA_SIZES, convertMeasurement, formatMeasurement, recommendProductSize, regionalLabel, resolveProductSizing, selectVariant,
  type AlphaSize, type Measurement, type PurchasableVariant,
  type Recommendation, type Region, type SizingChart, type SizingProfile, type Unit,
} from '@/lib/sizing';

const names: Record<Measurement, string> = { chest: 'Chest', bust: 'Bust', waist: 'Waist', hip: 'Hips', shoulder: 'Shoulder', sleeveLength: 'Sleeve length', shirtLength: 'Shirt length', inseam: 'Inseam', outseam: 'Outseam' };
const regionNames: Record<Region, string> = { GH: 'Ghana / International', UK: 'United Kingdom', US: 'United States', EU: 'Europe' };
function SizingTable({ chart, region, unit, selectedSize }: { chart: SizingChart; region: Region; unit: Unit; selectedSize?: AlphaSize }) {
  const keys = [...new Set(chart.rows.flatMap(row => Object.keys(row.measurements) as Measurement[]))];
  const hasLabels = region !== 'GH' && chart.rows.some(row => row.labels[region]);
  return <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel="Size measurement table" style={s.table} contentContainerStyle={s.tableContent}>
    <View style={{ flexGrow: 1, minWidth: 64 + (hasLabels ? 120 : 0) + keys.length * 120 }}>
      <View style={s.tableRow}><Text style={[s.cell, s.sizeCell, s.cellHead]}>Size</Text>{hasLabels && <Text style={[s.cell, s.cellHead]}>{region} ≈</Text>}{keys.map(key => <Text key={key} style={[s.cell, s.cellHead]}>{names[key]} ({unit})</Text>)}</View>
      {chart.rows.map((row, index) => <View key={row.size} accessible accessibilityLabel={`${row.size}, ${regionalLabel(row, row.size, region)}, ${keys.map(key => `${names[key]} ${row.measurements[key] === undefined ? 'not supplied' : formatMeasurement(row.measurements[key]!, chart.unit, unit) + ' ' + unit}`).join(', ')}`} style={[s.tableRow, index === chart.rows.length - 1 && s.lastRow, selectedSize === row.size && s.highlight]}>
        <Text style={[s.cell, s.sizeCell, selectedSize === row.size && s.selectedCell]}>{row.size}</Text>{hasLabels && <Text style={s.cell}>{row.labels[region] ?? '—'}</Text>}{keys.map(key => <Text key={key} style={s.cell}>{row.measurements[key] === undefined ? '—' : formatMeasurement(row.measurements[key]!, chart.unit, unit)}</Text>)}
      </View>)}
    </View>
  </ScrollView>;
}
function Choice({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} aria-checked={selected} aria-disabled={disabled} disabled={disabled} onPress={onPress} style={[s.choice, selected && s.chosen, disabled && s.disabled]}><Text style={[s.choiceText, selected && s.chosenText]}>{label}</Text></Pressable>;
}
export type SizeGuideProps = {
  profile?: SizingProfile; variants: PurchasableVariant[]; selectedVariantId: string | null;
  onSelectVariant: (variant: PurchasableVariant | null) => void;
  referenceCharts?: SizingChart[]; overrideCharts?: SizingChart[]; cachedChart?: boolean;
};
export function SizeGuide({ profile, variants, selectedVariantId, onSelectVariant, referenceCharts = referenceSizing.charts, overrideCharts = approvedSizingCharts, cachedChart = false }: SizeGuideProps) {
  const { fittings, ready: measurementsReady, loadError, saveMeasurements } = useAccountMeasurements();
  const editSession = useRef<string | null>(null);
  const saveRevision = useRef(0);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const selected = variants.find(v => v.id === selectedVariantId);
  const [pendingSize, setPendingSize] = useState<AlphaSize | null>(selected?.size ?? null);
  const [expanded, setExpanded] = useState(false);
  const [unit, setUnit] = useState<Unit>('cm');
  const [region, setRegion] = useState<Region>('GH');
  const [regionOpen, setRegionOpen] = useState(false);
  const [input, setInput] = useState<Partial<Record<Measurement, { text: string; unit: Unit }>>>({});
  const [result, setResult] = useState<Recommendation | null>(null);
  const parts = resolveProductSizing(profile, referenceCharts, overrideCharts);
  const chart = parts[0]?.chart;
  const hasTrousers = parts.some(part => part.profile.category === 'trousers');
  const lengthVariants = variants.filter(v => v.size === (selected?.size ?? pendingSize) && v.length);
  const availableSizes = ALPHA_SIZES.filter(size => variants.some(v => v.size === size));
  const fields = [...new Set(parts.flatMap(part => part.chart ? [...part.chart.required, ...part.chart.rows.flatMap(row => Object.keys(row.measurements) as Measurement[])] : []))];
  const required = new Set(parts.flatMap(part => part.chart?.required ?? []));
  if (hasTrousers && !fields.includes('inseam')) fields.push('inseam');
  const summaries = selected ? parts.flatMap(part => {
    const row = part.chart?.rows.find(row => row.size === selected.size);
    return row ? [`${parts.length > 1 ? part.label + ': ' : ''}${Object.entries(row.measurements).map(([key, value]) => `${names[key as Measurement]} ${formatMeasurement(value!, part.chart!.unit, unit)} ${unit}`).join(', ')}`] : [];
  }) : [];
  function draftFor(key: Measurement) {
    return input[key] ?? (fittings[0]?.values[sizingAccountKeys[key]] ? { text: fittings[0].values[sizingAccountKeys[key]], unit: 'cm' as const } : undefined);
  }
  const savedSummary = fields.flatMap(key => {
    const value = fittings[0]?.values[sizingAccountKeys[key]];
    return value ? [`${names[key]} ${formatMeasurement(Number(value), 'cm', unit)} ${unit}`] : [];
  });
  function updateInput(key: Measurement, text: string) {
    setInput(current => ({ ...current, [key]: { text, unit } }));
    setResult(null); setSaveError(''); setSaveMessage('');
    const revision = ++saveRevision.current;
    if (!text.trim()) { setSaveMessage('Your saved value is kept until you enter a new measurement.'); return; }
    const value = canonicalMeasurement(text, sizingAccountKeys[key], unit);
    if (value === null) { setSaveError('Enter a positive measurement up to two decimal places, within 0.1–999 cm. Your saved value has been kept.'); return; }
    editSession.current ??= `product-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setSaveMessage('Saving to your account…');
    void saveMeasurements({ [sizingAccountKeys[key]]: value }, { editSession: editSession.current }).then(() => {
      if (saveRevision.current === revision) setSaveMessage('Saved to Account · Measurements');
    }).catch(() => { if (saveRevision.current === revision) { setSaveMessage(''); setSaveError('Could not save this measurement. Try entering it again.'); } });
  }
  const changeUnit = (next: Unit) => {
    // Keep each original input and unit; converted display values never replace it.
    setUnit(next); setResult(null);
  };
  function chooseSize(size: AlphaSize) {
    setPendingSize(size);
    const options = variants.filter(v => v.size === size && v.stock > 0);
    onSelectVariant(options.some(v => v.length) ? null : selectVariant(variants, size) ?? null);
  }
  function recommend() {
    const body: Partial<Record<Measurement, number>> = {};
    for (const key of fields) {
      const draft = draftFor(key);
      if (!draft?.text.trim()) continue;
      const numeric = Number(draft.text.trim().replace(',', '.'));
      body[key] = Number.isFinite(numeric) ? convertMeasurement(numeric, draft.unit, unit) : NaN;
    }
    setResult(recommendProductSize(parts, body, unit, variants));
  }
  return <View style={s.root}>
    <Text style={s.label}>SELECT SIZE</Text>
    <View style={s.wrap} accessibilityRole="radiogroup" accessibilityLabel="Available product sizes">
      {availableSizes.map(size => {
        const options = variants.filter(v => v.size === size);
        const stock = options.reduce((sum, v) => sum + v.stock, 0);
        const label = regionalLabel(chart?.rows.find(r => r.size === size), size, region);
        return <Choice key={size} label={`${label}${stock === 2 ? ' · 2 left' : stock === 0 ? ' · Sold out' : ''}`} selected={(selected?.size ?? pendingSize) === size} disabled={stock === 0} onPress={() => chooseSize(size)} />;
      })}
    </View>
    {!availableSizes.length && <Text style={s.note}>No sizes are listed for this option.</Text>}
    {lengthVariants.length > 0 && <View style={s.section}>
      <Text style={s.label}>INSEAM LENGTH</Text>
      <View style={s.wrap} accessibilityRole="radiogroup" accessibilityLabel="Available inseam lengths">
        {lengthVariants.map(v => <Choice key={v.id} label={`${v.length!.code} · ${formatMeasurement(v.length!.value, v.length!.unit, unit)} ${unit}`} disabled={v.stock === 0} selected={selected?.id === v.id} onPress={() => onSelectVariant(v)} />)}
      </View>
      {!selected && <Text style={s.note}>Select an inseam to complete your size selection.</Text>}
    </View>}
    {hasTrousers && !variants.some(v => v.length) && <Text style={s.note}>Trouser inside-leg length has not been listed yet.</Text>}
    {selected && <Text accessibilityLiveRegion="polite" style={s.summary}>
      {summaries.length ? `${selected.size} · ${parts.every(part => part.chart?.measurementType === 'body') ? parts.every(part => part.chart?.source === 'reference') ? 'Body reference' : 'Body measurements' : 'Measurements'}: ${summaries.join(' · ')}.` : `Size ${selected.size} selected. Measurements for this garment have not been provided.`}
    </Text>}
    {selected && savedSummary.length > 0 && <Text style={s.note}>Your saved measurements: {savedSummary.join(', ')}.</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => setExpanded(v => !v)} style={s.toggle}><Text style={s.label}>SIZE GUIDE & FIT</Text><ShopActionIcon name={expanded ? 'minus' : 'plus'} color={atelier.petrol} size={18} /></Pressable>
    {expanded && <View style={s.panel}>
      <View style={s.guideTop}>
        <View>{profile && <Text style={s.context}>{profile.gender === 'men' ? 'Men' : 'Women'}{parts.length > 1 ? ' · Two-piece set' : ''}</Text>}</View>
      </View>
      <View style={s.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Sizing region: ${regionNames[region]}`} accessibilityState={{ expanded: regionOpen }} aria-expanded={regionOpen} onPress={() => setRegionOpen(value => !value)} style={s.regionButton}>
          <View><Text style={s.controlLabel}>SIZE SYSTEM</Text><Text style={s.regionValue}>{region === 'GH' ? 'GH / International' : regionNames[region]}</Text></View><NyIcon name={regionOpen ? 'chevron-up' : 'chevron-down'} color={atelier.petrol} size={16} />
        </Pressable>
        <View style={s.unitControl} accessibilityRole="radiogroup" accessibilityLabel="Measurement units">{(['cm', 'in'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={value === 'cm' ? 'Centimetres' : 'Inches'} accessibilityState={{ checked: unit === value }} aria-checked={unit === value} onPress={() => changeUnit(value)} style={[s.unitOption, unit === value && s.unitSelected]}><Text style={[s.unitText, unit === value && s.chosenText]}>{value}</Text></Pressable>)}</View>
      </View>
      {regionOpen && <View style={s.regionMenu} accessibilityRole="radiogroup" accessibilityLabel="Sizing region">{(['GH', 'UK', 'US', 'EU'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={regionNames[value]} aria-checked={region === value} accessibilityState={{ checked: region === value }} onPress={() => { setRegion(value); setRegionOpen(false); }} style={s.regionItem}><Text style={s.regionCode}>{value === 'GH' ? 'GH / INT' : value}</Text><Text style={s.regionName}>{regionNames[value]}</Text><View style={s.regionCheck}>{region === value && <NyIcon name="check" color={atelier.petrol} size={16} />}</View></Pressable>)}</View>}
      <Text style={s.note}>{region === 'GH' ? 'International alpha sizes · ' : 'Regional labels are approximate · '}{unit === 'cm' ? 'Measurements in centimetres' : 'Measurements in inches'}</Text>
      {cachedChart && <Text style={s.note}>Showing the last saved chart. Reconnect to get the latest updates.</Text>}
      {parts.map((part, index) => <View key={`${part.profile.category}:${index}`} style={s.chartSection}>
        <Text accessibilityRole="header" style={s.subheading}>{part.label}</Text>
        <Text style={s.chartNote}>{part.chart?.source === 'reference' ? 'Body reference, not garment dimensions' : part.chart ? `${part.chart.measurementType === 'body' ? 'Body fit ranges' : 'Garment measurements'} · ${part.chart.fit} fit` : 'Measurements have not been supplied for this garment.'}{part.chart?.mode === 'reference-point' ? ' · Reference points, not fit limits' : ''}</Text>
        {part.chart && <SizingTable chart={part.chart} region={region} unit={unit} selectedSize={selected?.size} />}
        {part.profile.category === 'short-sleeve-shirt' && part.chart?.source === 'reference' && <Text style={s.note}>Shirt body reference. Short-sleeve garment measurements have not been supplied.</Text>}
      </View>)}
      {!parts.length && <Text style={s.note}>Size measurements have not been supplied for this garment.</Text>}
      <Text style={s.note}>Size availability is shown in the selector above.</Text>
      {parts.length > 0 && <View style={s.section}>
        <Text accessibilityRole="header" style={s.subheading}>Your measurements · optional</Text>
        <Text style={s.note}>Enter body measurements in {unit === 'cm' ? 'centimetres' : 'inches'}. Valid entries save automatically to Account · Measurements and are reused across pieces. Required fields are marked *.</Text>
        <View style={s.inputs}>{fields.map(key => {
          const draft = draftFor(key);
          const display = draft ? draft.unit === unit || !Number.isFinite(Number(draft.text.replace(',', '.'))) || !draft.text.trim() ? draft.text : formatMeasurement(Number(draft.text.replace(',', '.')), draft.unit, unit) : '';
          return <View key={key} style={s.inputField}><Text style={s.inputLabel}>{names[key]}{required.has(key) ? ' *' : ''} ({unit})</Text><TextInput accessibilityLabel={`${names[key]} in ${unit === 'cm' ? 'centimetres' : 'inches'}${required.has(key) ? ', required for recommendation' : ', optional'}`} keyboardType="decimal-pad" inputMode="decimal" editable={measurementsReady && !loadError} value={display} onChangeText={value => updateInput(key, value)} aria-required={required.has(key)} style={s.input} placeholder="—" placeholderTextColor={atelier.muted} /></View>;
        })}</View>
        {(loadError || saveError) ? <Text accessibilityRole="alert" style={s.error}>{loadError || saveError}</Text> : <Text accessibilityLiveRegion="polite" style={s.note}>{!measurementsReady ? 'Loading your saved measurements…' : saveMessage || (savedSummary.length ? 'Using your saved account measurements.' : '')}</Text>}
        <Pressable accessibilityRole="button" onPress={recommend} style={s.action}><Text style={s.chosenText}>Find my size</Text></Pressable>
        {result && <View accessibilityLiveRegion="polite" style={s.feedback}><Text style={s.summary}>{result.message}</Text>{result.status === 'match' && <Pressable accessibilityRole="button" onPress={() => { setPendingSize(result.size); onSelectVariant(result.variants.some(v => v.length) ? null : result.variants[0]); }} style={s.choice}><Text style={s.choiceText}>Use size {result.size}</Text></Pressable>}</View>}
      </View>}

    </View>}
  </View>;
}
const s = StyleSheet.create({
  root: { marginVertical: 10 }, label: { fontFamily: atelier.body, fontWeight: '700', fontSize: 11, letterSpacing: 1.2, color: atelier.petrol },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 }, choice: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: atelier.line, backgroundColor: 'transparent', justifyContent: 'center' },
  chosen: { backgroundColor: atelier.petrol, borderColor: atelier.petrol }, choiceText: { fontFamily: atelier.body, color: atelier.petrol, fontSize: 14 }, chosenText: { fontFamily: atelier.body, color: atelier.white, fontSize: 14, fontWeight: '700' }, disabled: { opacity: 0.45 },
  note: { fontFamily: atelier.body, color: atelier.muted, fontSize: 13, lineHeight: 20, marginVertical: 8 }, summary: { fontFamily: atelier.body, color: atelier.petrol, fontSize: 13, lineHeight: 21, marginVertical: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: atelier.line, paddingVertical: 18, marginTop: 10 },
  panel: { paddingTop: 12, paddingBottom: 10 }, subheading: { fontFamily: atelier.body, fontWeight: '700', color: atelier.petrol, fontSize: 17 },
  section: { marginTop: 12 }, table: { borderTopWidth: 1, borderTopColor: atelier.line, marginTop: 12 }, tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: atelier.line }, tableContent: { flexGrow: 1 }, cell: { width: 120, flexGrow: 1, flexShrink: 0, padding: 12, fontFamily: atelier.body, color: atelier.petrol, fontSize: 13 }, sizeCell: { width: 64, flexGrow: 0 }, cellHead: { fontWeight: '700' }, highlight: { backgroundColor: 'rgba(18,60,69,0.05)' }, lastRow: { borderBottomWidth: 0 }, selectedCell: { fontWeight: '700' },
  inputs: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, inputField: { flexGrow: 1, flexBasis: 140 }, inputLabel: { fontFamily: atelier.body, color: atelier.petrol, fontSize: 13, fontWeight: '700', marginBottom: 6 }, input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: atelier.line, padding: 12, color: atelier.petrol, fontFamily: atelier.body, fontSize: 16 },
  guideTop: { marginBottom: 12 }, context: { fontFamily: atelier.body, fontSize: 13, color: atelier.muted, marginTop: 3 }, toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  regionButton: { minHeight: 50, flexGrow: 1, flexBasis: 170, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 6, paddingRight: 12 }, controlLabel: { fontFamily: atelier.body, fontSize: 9, fontWeight: '700', letterSpacing: 1.1, color: atelier.muted }, regionValue: { fontFamily: atelier.body, fontSize: 14, fontWeight: '700', color: atelier.petrol, marginTop: 5 },
  unitControl: { flexDirection: 'row', borderWidth: 1, borderColor: atelier.line, borderRadius: 999, padding: 3 }, unitOption: { minWidth: 44, minHeight: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }, unitSelected: { backgroundColor: atelier.petrol }, unitText: { fontFamily: atelier.body, fontSize: 13, fontWeight: '700', color: atelier.muted },
  regionMenu: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: atelier.line, marginTop: 10, paddingVertical: 4 }, regionItem: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 12 }, regionCode: { width: 65, fontFamily: atelier.body, fontSize: 11, fontWeight: '700', color: atelier.petrol }, regionName: { flex: 1, fontFamily: atelier.body, fontSize: 13, color: atelier.muted }, regionCheck: { width: 18 }, chartSection: { marginTop: 20, marginBottom: 12 }, chartNote: { fontFamily: atelier.body, color: atelier.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  error: { fontFamily: atelier.body, color: '#A33732', fontSize: 13, lineHeight: 20, marginTop: 10 },
  action: { backgroundColor: atelier.petrol, minHeight: 46, borderRadius: 999, justifyContent: 'center', alignItems: 'center', marginTop: 16, padding: 12 }, feedback: { backgroundColor: atelier.alabaster, padding: 12, borderRadius: 12, marginTop: 12 },
});
