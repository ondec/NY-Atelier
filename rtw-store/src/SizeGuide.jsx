import { useState } from 'react';
import { Minus, Plus } from './NyIcons.jsx';
import { MEASURE_LABELS, REGIONS, TROUSER_LENGTHS, formatValue, measuresFor, recommendSize } from './sizing.js';

/** "Size guide & fit", following the app's SizeGuide: size system, cm/in, charts and Find my size. */
export function SizeGuide({ product, charts, selectedSize, onUseSize, open, onToggle }) {
  const [unit, setUnit] = useState('cm');
  const [region, setRegion] = useState('GH');
  const [values, setValues] = useState({});
  const [result, setResult] = useState(null);
  if (!charts.length) return null;
  const measures = measuresFor(charts).map(key => [key, MEASURE_LABELS[key] ?? key]);

  function changeUnit(next) {
    if (next === unit) return;
    // Convert anything already typed so the numbers keep their meaning.
    setValues(current => Object.fromEntries(Object.entries(current).map(([key, value]) => {
      const n = Number(String(value).replace(',', '.'));
      return [key, n > 0 ? String(Number((next === 'in' ? n / 2.54 : n * 2.54).toFixed(1))) : value];
    })));
    setUnit(next); setResult(null);
  }

  return <div className="rtw-size-guide">
    <button type="button" className="rtw-size-guide-toggle" aria-expanded={open} aria-controls="size-guide-panel" onClick={onToggle}>
      <span>SIZE GUIDE &amp; FIT</span>{open ? <Minus size={16}/> : <Plus size={16}/>}
    </button>
    {open && <div className="rtw-size-guide-panel" id="size-guide-panel">
      <p className="rtw-size-context">{charts[0].gender === 'women' ? 'Women' : 'Men'}{charts.length > 1 ? ' · Two-piece set' : ''}</p>
      <div className="rtw-size-toolbar">
        <label className="rtw-size-region"><span>SIZE SYSTEM</span>
          <select value={region} onChange={event => { setRegion(event.target.value); }}>{REGIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        </label>
        <div className="rtw-unit-toggle" role="radiogroup" aria-label="Measurement units">
          {['cm', 'in'].map(value => <button key={value} type="button" role="radio" aria-checked={unit === value} aria-label={value === 'cm' ? 'Centimetres' : 'Inches'} onClick={() => { changeUnit(value); }}>{value}</button>)}
        </div>
      </div>
      <p className="rtw-size-note">{region === 'GH' ? 'International alpha sizes' : 'Regional labels are approximate'} · Measurements in {unit === 'cm' ? 'centimetres' : 'inches'}</p>
      {charts.map(chart => <div key={chart.key} className="rtw-size-chart">
        <h3>{chart.label}</h3>
        <p className="rtw-size-note">{chart.source === 'product'
          ? `NY Atelier chart for this piece · ${chart.measurementType === 'garment' ? 'Finished garment measurements' : 'Body measurements'}${chart.fit ? ` · ${chart.fit[0].toUpperCase()}${chart.fit.slice(1)} fit` : ''}`
          : `Body reference, not garment dimensions${chart.mode === 'reference-point' ? ' · Reference points, not fit limits' : ''}`}</p>
        <div className="rtw-size-table-wrap" tabIndex={0} aria-label={`${chart.label} size table`}>
          <table className="rtw-size-table">
            <thead><tr><th scope="col">Size</th>{region !== 'GH' && <th scope="col">{region} ≈</th>}{chart.columns.map(key => <th key={key} scope="col">{MEASURE_LABELS[key] ?? key} ({unit})</th>)}</tr></thead>
            <tbody>{chart.rows.map(row => <tr key={row.size} className={row.size === selectedSize ? 'is-selected' : ''}>
              <th scope="row">{row.size}</th>{region !== 'GH' && <td>{row.labels[region] ?? '—'}</td>}{chart.columns.map(key => <td key={key}>{formatValue(row.measurements[key], chart.unit, unit)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        {chart.part === 'trousers' && chart.source === 'reference' && <p className="rtw-size-note">Inside-leg lengths in the reference: {TROUSER_LENGTHS.map(length => `${length.label} ${unit === 'cm' ? Math.round(length.inches * 2.54) : length.inches}`).join(' · ')} {unit}. Length options are not listed for this piece yet; the atelier can adjust hems.</p>}
      </div>)}

      <form className="rtw-find-size" onSubmit={event => { event.preventDefault(); setResult(recommendSize(charts, values, unit)); }}>
        <h3>Find my size <small>optional</small></h3>
        <p className="rtw-size-note">Enter your body measurements in {unit === 'cm' ? 'centimetres' : 'inches'}. They stay in this page and are not saved.</p>
        <div className="rtw-find-size-fields">{measures.map(([key, label]) => <label key={key}>{label} ({unit})
          <input inputMode="decimal" value={values[key] ?? ''} placeholder="—" onChange={event => { setValues(current => ({ ...current, [key]: event.target.value })); setResult(null); }}/>
        </label>)}</div>
        <button type="submit" className="button button-solid">FIND MY SIZE</button>
        {result && <div className="rtw-find-size-result" role="status"><p>{result.message}</p>
          {result.status === 'match' && <button type="button" className="rtw-chip-button" onClick={() => { onUseSize(result.size); }}>Use size {result.size}</button>}
        </div>}
      </form>
      <p className="rtw-size-note">Between sizes or want it made to measure? The atelier can advise before you order.</p>
    </div>}
  </div>;
}
