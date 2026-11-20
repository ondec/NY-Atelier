'use client';
import { useCallback, useEffect, useState } from 'react';
import { NyIcon } from '@/components/icons';
import {
  ALPHA_SIZES, convertMeasurement, emptyPublishedSizing, publishedProductProfile, sizingProductId, validateChart, validatePublishedSizing,
  type AlphaSize, type Dimension, type Fit, type GarmentCategory, type Gender, type Measurement, type PublishedSizing, type Region, type SizingChart, type SizingProfile, type Unit,
} from '../../../mobile/src/lib/sizing';

const categories: GarmentCategory[] = ['long-sleeve-shirt', 'short-sleeve-shirt', 'trousers'];
const categoryNames: Record<GarmentCategory,string> = { 'long-sleeve-shirt':'Long-sleeve top', 'short-sleeve-shirt':'Short-sleeve top', trousers:'Trousers' };
const labels: Record<Measurement,string> = { chest:'Chest',bust:'Bust',waist:'Waist',hip:'Hips',shoulder:'Shoulder',sleeveLength:'Sleeve length',shirtLength:'Top length',inseam:'Inside-leg length',outseam:'Outseam' };
type RowDraft = { measurements: Partial<Record<Measurement,string>>; labels: Partial<Record<Region,string>> };
type PartDraft = { category: GarmentCategory; enabled: boolean; fit: Fit; unit: Unit; basis: 'body'|'garment'; required: Measurement[]; rows: Record<AlphaSize,RowDraft>; ease: Partial<Record<Measurement,string>> };
const fieldsFor = (category: GarmentCategory, gender: Gender): Measurement[] => category === 'trousers' ? ['waist','hip','inseam','outseam'] : [gender === 'men' ? 'chest' : 'bust', ...(gender === 'women' ? ['waist' as const] : []), 'shoulder','sleeveLength','shirtLength'];
const primaryFor = (category: GarmentCategory, gender: Gender): Measurement => category === 'trousers' ? 'waist' : gender === 'men' ? 'chest' : 'bust';
function partDraft(category: GarmentCategory, gender: Gender, enabled: boolean, chart?: SizingChart): PartDraft {
  return { category, enabled, fit:chart?.fit ?? 'regular',unit:chart?.unit ?? 'cm',basis:chart?.measurementType ?? 'garment',required:chart?.required ?? [primaryFor(category,gender)],
    rows:Object.fromEntries(ALPHA_SIZES.map(size=>{const row=chart?.rows.find(row=>row.size===size);return [size,{measurements:Object.fromEntries(Object.entries(row?.measurements??{}).map(([key,value])=>[key,Array.isArray(value)?value.join('–'):String(value)])),labels:row?.labels??{}}];})) as Record<AlphaSize,RowDraft>,
    ease:Object.fromEntries(Object.entries(chart?.fitAllowance??{}).map(([key,value])=>[key,String(value)])),
  };
}
function parseDimension(text: string): Dimension {
  const values=text.trim().replaceAll(',','.').split(/\s*[–-]\s*/).map(Number);
  if (!/^[\d.,\s–-]+$/.test(text) || values.length>2 || values.some(value=>!Number.isFinite(value)||value<=0) || (values.length===2&&values[0]>values[1])) throw new Error('Use a positive number, or a minimum–maximum range.');
  return values.length===2?[values[0],values[1]]:values[0];
}
export default function SizeChartEditor({scope,targetId,title,initialProfile,productIds=[]}:{scope:'product'|'collection';targetId:string;title:string;initialProfile?:SizingProfile;productIds?:string[]}) {
  const [publication,setPublication]=useState<PublishedSizing>(emptyPublishedSizing);
  const [gender,setGender]=useState<Gender>(initialProfile?.gender??'men');
  const [parts,setParts]=useState<PartDraft[]>([]);
  const [editing,setEditing]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const assignmentKey=(sex:Gender)=>scope==='collection'?`${targetId}:${sex}`:sizingProductId(targetId);
  const prepare=useCallback((data:PublishedSizing,sex:Gender)=>{
    const own=scope==='collection'?data.collections[`${targetId}:${sex}`]?.profile:data.products[sizingProductId(targetId)];
    const profile=own?.gender===sex?own:scope==='product'?publishedProductProfile(targetId,initialProfile,data):initialProfile;
    const selectedParts=profile?.parts??(profile?[profile]:[{category:'long-sleeve-shirt' as const}]);
    return categories.map(category=>{
      const part=selectedParts.find(part=>part.category===category);
      const chart=profile?.gender===sex?data.charts.find(chart=>chart.id===part?.chartId&&chart.gender===sex):undefined;
      return partDraft(category,sex,Boolean(part),chart);
    });
  },[scope,targetId,initialProfile]);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try {const response=await fetch('/api/size-charts',{cache:'no-store'});if(!response.ok)throw new Error('Could not load size charts.');const data=validatePublishedSizing(await response.json());setPublication(data);
      const sex=scope==='product'?data.products[sizingProductId(targetId)]?.gender??initialProfile?.gender??'men':initialProfile?.gender??'men';setGender(sex);setParts(prepare(data,sex));
    }catch(failure){setError(failure instanceof Error?failure.message:'Could not load charts.');}finally{setLoading(false);}
  },[scope,targetId,initialProfile,prepare]);
  useEffect(()=>{queueMicrotask(()=>{void load();});},[load]);
  const own=scope==='product'?publication.products[assignmentKey(gender)]:publication.collections[assignmentKey(gender)]?.profile;
  function update(category:GarmentCategory,change:(part:PartDraft)=>PartDraft){setParts(current=>current.map(part=>part.category===category?change(part):part));setNotice('');}
  function changePartUnit(category:GarmentCategory,next:Unit) {
    const part=parts.find(part=>part.category===category);if(!part||part.unit===next)return;
    try {
      const convert=(text:string)=>{if(!text.trim())return text;const value=parseDimension(text);return Array.isArray(value)?value.map(number=>convertMeasurement(number,part.unit,next)).join('–'):String(convertMeasurement(value,part.unit,next));};
      const rows=Object.fromEntries(ALPHA_SIZES.map(size=>[size,{...part.rows[size],measurements:Object.fromEntries(Object.entries(part.rows[size].measurements).map(([key,text])=>[key,convert(text!)]))}])) as PartDraft['rows'];
      const ease=Object.fromEntries(Object.entries(part.ease).map(([key,text])=>[key,text?.trim()?String(convertMeasurement(Number(text),part.unit,next)):text]));
      update(category,current=>({...current,unit:next,rows,ease}));setError('');
    }catch{setError('Complete the measurement values before changing units.');}
  }
  async function persist(action:'publish'|'default') {
    setSaving(true);setError('');setNotice('');
    try {
      const enabled=parts.filter(part=>part.enabled);
      if(action==='publish'&&!enabled.length)throw new Error('Choose at least one garment part.');
      const charts=action==='default'?[]:enabled.map(part=>{
        const rows=ALPHA_SIZES.flatMap(size=>{
          const draft=part.rows[size];const populated=Object.values(draft.measurements).some(value=>value?.trim())||Object.values(draft.labels).some(value=>value?.trim());
          if(!populated)return [];
          const measurements=Object.fromEntries(Object.entries(draft.measurements).filter(([,value])=>value?.trim()).map(([key,value])=>[key,parseDimension(value!)]));
          if(part.basis==='body'&&Object.values(measurements).some(value=>!Array.isArray(value)))throw new Error(`${categoryNames[part.category]}, ${size}: body sizes need minimum–maximum ranges.`);
          return [{size,measurements,labels:Object.fromEntries(Object.entries(draft.labels).filter(([,value])=>value?.trim()).map(([key,value])=>[key,value!.trim()]))}];
        });
        const used=new Set(rows.flatMap(row=>Object.keys(row.measurements) as Measurement[]));
        const fitAllowance=part.basis==='garment'?Object.fromEntries([...used].map(key=>{const raw=part.ease[key];if(raw===undefined||!raw.trim()||!Number.isFinite(Number(raw))||Number(raw)<0)throw new Error(`${categoryNames[part.category]}: enter an approved fit allowance for ${labels[key]} (zero is allowed).`);return [key,Number(raw)];})):undefined;
        return validateChart({id:`staff-${scope}-${assignmentKey(gender)}-${part.category}`,gender,category:part.category,source:'product',unit:part.unit,measurementType:part.basis,mode:part.basis==='body'?'range':'maximum',fit:part.fit,required:part.required,rows,...(fitAllowance?{fitAllowance}:{})});
      });
      const profile=charts.length?{gender,category:charts[0].category,parts:charts.map(chart=>({category:chart.category,chartId:chart.id,fit:chart.fit}))}:undefined;
      const response=await fetch('/api/size-charts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope,targetId:assignmentKey(gender),action,revision:publication.revision,profile,charts,productIds})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.message??'Could not publish this chart.');
      const next=validatePublishedSizing(payload);setPublication(next);setParts(prepare(next,gender));setEditing(false);setNotice(action==='default'?'Default sizing restored.':'Size chart saved. The customer guide will receive this update.');
    }catch(failure){setError(failure instanceof Error?failure.message:'Could not save this chart.');}finally{setSaving(false);}
  }
  return <section className="panel sizing-editor">
    <div className="panel-heading"><div><div className="eyebrow">CUSTOMER SIZE GUIDE</div><h2>{scope==='collection'?'Collection size defaults':'Size chart'}</h2></div><button className="inventory-quiet-button" type="button" disabled={loading||saving} onClick={()=>{setEditing(value=>!value);setError('');}}><NyIcon name="ruler" size={17}/>{editing?'Close editor':'Edit size chart'}</button></div>
    <div className="sizing-editor-body"><p>{scope==='collection'?'Set separate men’s and women’s defaults for garments in this collection. A garment’s own chart takes priority.':'Define the measurements shown with this garment in the customer app.'}</p>
      {scope==='collection'&&<div className="sizing-gender-tabs" role="group" aria-label="Collection chart gender">{(['men','women'] as const).map(sex=><button type="button" key={sex} disabled={saving||loading} aria-pressed={gender===sex} className="inventory-quiet-button" onClick={()=>{setGender(sex);setParts(prepare(publication,sex));setError('');setNotice('');}}>{sex==='men'?'Men':'Women'}</button>)}</div>}
      <p className="sizing-status">{loading?'Loading charts…':own?`${gender==='men'?'Men':'Women'} · Custom chart published`:scope==='product'?'Using collection defaults or the general body reference':'No default published for this gender'}</p>
      {notice&&<p role="status" className="inventory-message" data-tone="success">{notice}</p>}
      {error&&<p role="alert" className="collection-error">{error} <button type="button" className="text-link" disabled={saving} onClick={()=>{void load();}}>Reload charts</button></p>}
      {editing&&!loading&&<div className="sizing-form">
        <p className="portal-form-help">{title}: enter approved measurements only. Empty size rows are left out. Stock quantities remain in garment inventory.</p>
        {scope==='product'&&<label className="sizing-gender-field">Clothing for<select value={gender} disabled={saving} onChange={event=>{const next=event.target.value as Gender;setGender(next);setParts(prepare(publication,next));}}><option value="men">Men</option><option value="women">Women</option></select></label>}
        <fieldset className="sizing-part-picker"><legend>Garment parts</legend>{parts.map(part=><label key={part.category}><input type="checkbox" checked={part.enabled} disabled={saving} onChange={event=>update(part.category,current=>({...current,enabled:event.target.checked}))}/>{categoryNames[part.category]}</label>)}</fieldset>
        {parts.filter(part=>part.enabled).map(part=>{const fields=fieldsFor(part.category,gender);return <fieldset className="sizing-part" key={part.category}><legend>{categoryNames[part.category]}</legend>
          <div className="inventory-form-grid"><label>Measurements describe<select value={part.basis} disabled={saving} onChange={event=>update(part.category,current=>({...current,basis:event.target.value as PartDraft['basis']}))}><option value="garment">Finished garment</option><option value="body">Body size ranges</option></select></label><label>Units<select value={part.unit} disabled={saving} onChange={event=>changePartUnit(part.category,event.target.value as Unit)}><option value="cm">Centimetres</option><option value="in">Inches</option></select></label><label>Fit<select value={part.fit} disabled={saving} onChange={event=>update(part.category,current=>({...current,fit:event.target.value as Fit}))}><option value="regular">Regular</option><option value="slim">Slim</option><option value="relaxed">Relaxed</option></select></label></div>
          <p className="portal-form-help">{part.basis==='body'?'Enter body ranges such as 91–96. These ranges must already account for the intended fit.':'Enter actual garment measurements. Fit allowance is the space the garment leaves beyond the body measurement; enter the approved amount for each used dimension, including 0 where appropriate.'} Regional labels are approximate.</p>
          <div className="table-wrap"><table className="sizing-entry-table"><caption className="sr-only">{categoryNames[part.category]} size measurements</caption><thead><tr><th>Size</th>{fields.map(key=><th key={key}>{labels[key]} ({part.unit})<label className="sizing-required"><input type="checkbox" checked={part.required.includes(key)} disabled={saving||key===primaryFor(part.category,gender)} onChange={event=>update(part.category,current=>({...current,required:event.target.checked?[...current.required,key]:current.required.filter(item=>item!==key)}))}/>Required for fit</label>{part.basis==='garment'&&<input aria-label={`${categoryNames[part.category]} ${labels[key]} fit allowance in ${part.unit}`} inputMode="decimal" type="number" min="0" step="0.01" placeholder="Fit allowance" value={part.ease[key]??''} disabled={saving} onChange={event=>update(part.category,current=>({...current,ease:{...current.ease,[key]:event.target.value}}))}/>}</th>)}{(['UK','US','EU'] as const).map(region=><th key={region}>{region} ≈</th>)}</tr></thead><tbody>{ALPHA_SIZES.map(size=><tr key={size}><th scope="row">{size}</th>{fields.map(key=><td key={key}><input aria-label={`${categoryNames[part.category]} ${size} ${labels[key]} in ${part.unit}`} inputMode={part.basis==='garment'?'decimal':'text'} placeholder={part.basis==='body'?'Min–max':'—'} value={part.rows[size].measurements[key]??''} disabled={saving} onChange={event=>update(part.category,current=>({...current,rows:{...current.rows,[size]:{...current.rows[size],measurements:{...current.rows[size].measurements,[key]:event.target.value}}}}))}/></td>)}{(['UK','US','EU'] as const).map(region=><td key={region}><input aria-label={`${categoryNames[part.category]} ${size} ${region} label`} maxLength={40} value={part.rows[size].labels[region]??''} disabled={saving} onChange={event=>update(part.category,current=>({...current,rows:{...current.rows,[size]:{...current.rows[size],labels:{...current.rows[size].labels,[region]:event.target.value}}}}))}/></td>)}</tr>)}</tbody></table></div>
        </fieldset>;})}
        <div className="inventory-form-footer"><span>Publishes to linked customer product guides.</span><div className="inventory-actions">{own&&<button type="button" className="inventory-quiet-button" disabled={saving} onClick={()=>{void persist('default');}}>{scope==='product'?'Use collection / reference default':'Remove this default'}</button>}<button type="button" disabled={saving} onClick={()=>{void persist('publish');}}>{saving?'Saving…':'Save and publish chart'}</button></div></div>
      </div>}
    </div>
  </section>;
}
