"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Camera, Plus, ScanLine, Trash2, X } from "@/components/icons";
import { createRequestId } from "@/lib/request-id";
import { salaryApi, salaryMoney, type SalaryBatch, type SalaryInput } from "@/lib/salaries";
import type { ScanRow } from "@/lib/salary-scan";

type DraftLine = { description: string; quantity: string; amount: string; order_reference: string };
type DraftEntry = { id: string; name: string; lines: DraftLine[]; adjustment: string; adjustment_reason: string; review?: boolean };
const blankLine = (): DraftLine => ({ description:"Weekly output", quantity:"", amount:"", order_reference:"" });
const blankEntry = (): DraftEntry => ({id:createRequestId(),name:"",lines:[blankLine()],adjustment:"0",adjustment_reason:""});

export default function SalaryEditor({ batch, importPhoto, names, onClose, onSaved }: { batch?: SalaryBatch; importPhoto?: boolean; names: string[]; onClose: () => void; onSaved: (batch: SalaryBatch) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [entries,setEntries] = useState<DraftEntry[]>(() => batch ? batch.entries.map(entry=>({id:entry.id,name:entry.name,adjustment:String(entry.adjustment_minor/100),adjustment_reason:entry.adjustment_reason??"",lines:entry.lines.map(line=>({description:line.description,quantity:line.quantity===null?"":String(line.quantity),amount:String(line.amount_minor/100),order_reference:line.order_reference??""}))})) : [blankEntry()]);
  const [busy,setBusy] = useState(false);
  const [scanning,setScanning] = useState(false);
  const [error,setError] = useState("");
  const [scanText,setScanText] = useState("");
  const [photoUrl,setPhotoUrl] = useState("");
  const [imported,setImported] = useState(false);
  const [reviewed,setReviewed] = useState(false);
  const requestId = useRef(createRequestId());
  const lastPayload = useRef("");
  const requestPayload = useRef<Record<string,unknown> | undefined>(undefined);
  useEffect(()=>{ const previous = document.activeElement as HTMLElement | null; dialog.current?.showModal(); return ()=>previous?.focus(); },[]);
  useEffect(()=>()=>{if(photoUrl) URL.revokeObjectURL(photoUrl);},[photoUrl]);

  function changeEntry(index: number, patch: Partial<DraftEntry>) {setEntries(rows=>rows.map((row,i)=>i===index?{...row,...patch}:row)); setReviewed(false);}
  function changeLine(index: number, lineIndex: number, patch: Partial<DraftLine>) {changeEntry(index,{lines:entries[index].lines.map((line,i)=>i===lineIndex?{...line,...patch}:line)});}
  async function readPhoto(file?: File) {
    if(!file)return;
    setError(""); setScanning(true); setReviewed(false);
    if(file.size>12*1024*1024){setError("Choose a photo smaller than 12 MB.");setScanning(false);return;}
    const data=new FormData();data.set("photo",file);
    try {
      const response=await fetch("/api/staff-salaries/scan",{method:"POST",body:data});
      const scan=await response.json() as {rows:ScanRow[];text:string;message?:string};
      if(!response.ok)throw new Error(scan.message);
      setPhotoUrl(URL.createObjectURL(file));setScanText(scan.text);setImported(true);
      setEntries(scan.rows.length?scan.rows.map(row=>({...blankEntry(),name:row.name,review:row.review,lines:[{...blankLine(),quantity:row.quantity===null?"":String(row.quantity),amount:row.amount_minor===null?"":String(row.amount_minor/100)}]})):[blankEntry()]);
      if(!scan.rows.length)setError("Text was read, but the table could not be matched safely. Use the photo and recognised text to fill the rows below.");
    } catch(failure){setError(failure instanceof Error?failure.message:"Could not read the photo.");}
    finally{setScanning(false);}
  }
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");setBusy(true);
    const form=new FormData(event.currentTarget);
    const input:SalaryInput={label:String(form.get("label")).trim(),period_start:String(form.get("period_start")),period_end:String(form.get("period_end")),prepared_by:String(form.get("prepared_by")).trim(),entries:entries.map(entry=>({id:entry.id,name:entry.name.trim(),lines:entry.lines.map(line=>({description:line.description.trim(),quantity:line.quantity===""?null:Number(line.quantity),amount_minor:Math.round(Number(line.amount)*100),order_reference:line.order_reference.trim()||null})),adjustment_minor:Math.round(Number(entry.adjustment)*100),adjustment_reason:entry.adjustment_reason.trim()||null}))};
    const encoded=JSON.stringify(input);
    if(lastPayload.current!==encoded){requestId.current=createRequestId();lastPayload.current=encoded;requestPayload.current={...input,request_id:requestId.current,...(batch?{action:"save",version:batch.version,actor:input.prepared_by}:{})};}
    try {onSaved(await salaryApi<SalaryBatch>(batch?.id,requestPayload.current));}
    catch(failure){setError(failure instanceof Error?failure.message:"Could not save this batch.");}
    finally{setBusy(false);}
  }
  const total=entries.reduce((sum,entry)=>sum+entry.lines.reduce((value,line)=>value+Math.round(Number(line.amount||0)*100),0)+Math.round(Number(entry.adjustment||0)*100),0);
  return <dialog ref={dialog} className="inventory-drawer salary-drawer" aria-labelledby="salary-editor-title" onCancel={event=>{event.preventDefault();if(!busy&&!scanning)onClose();}} onClick={event=>{if(event.target===event.currentTarget&&!busy&&!scanning)onClose();}}>
    <div className="salary-drawer-body"><div className="salary-drawer-heading"><div><div className="eyebrow">{batch?"EDIT SALARY BATCH":"NEW SALARY BATCH"}</div><h2 id="salary-editor-title">{importPhoto?"Import paper form":batch?"Edit weekly salaries":"Prepare weekly salaries"}</h2></div><button type="button" className="inventory-quiet-button" aria-label="Close salary form" disabled={busy||scanning} onClick={onClose}><X size={18}/></button></div>
    <p className="portal-form-help">Record the agreed earnings for each tailor. Output is a count; the amount is the total for that work line. Saving creates a draft for review.</p>
    {importPhoto&&<section className="salary-scan"><h3><ScanLine size={18}/> Read a paper form</h3><p>Use a clear, straight photo of the front page with all three columns visible. Check every handwritten figure. Dates and sign-offs must be entered below.</p><div className="salary-actions"><label className="inventory-quiet-button">Upload photo<input aria-label="Upload salary form photo" type="file" accept="image/jpeg,image/png" disabled={scanning||busy} onChange={event=>void readPhoto(event.target.files?.[0])}/></label><label className="inventory-quiet-button"><Camera size={16}/> Take photo<input aria-label="Take salary form photo" type="file" accept="image/jpeg,image/png" capture="environment" disabled={scanning||busy} onChange={event=>void readPhoto(event.target.files?.[0])}/></label></div><p className="salary-muted">The local preview reads the photo on this Mac and deletes the uploaded file after reading. Saving keeps the reviewed figures, not the photo.</p>{scanning&&<p role="status">Reading photo… this may take a few seconds.</p>}{photoUrl&&<details><summary>Compare photo and recognised text</summary>{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={photoUrl} alt="Uploaded salary form for review"/><pre>{scanText}</pre></details>}</section>}
    <form onSubmit={save}><div className="inventory-form-grid"><label>Week / batch label<input name="label" placeholder="e.g. November · Week 3" defaultValue={batch?.label} maxLength={100} required/></label><label>Prepared by<input name="prepared_by" defaultValue={batch?.prepared_by} maxLength={150} required/></label><label>Period from<input type="date" name="period_start" defaultValue={batch?.period_start} required/></label><label>Period to<input type="date" name="period_end" defaultValue={batch?.period_end} required/></label></div>
    <div className="salary-entry-list">{entries.map((entry,index)=><fieldset className="salary-entry-editor" key={entry.id}><legend>Tailor {index+1}{entry.review?" · Check photo":""}</legend><div className="salary-entry-name"><TailorNameField label={`Tailor ${index+1} name`} value={entry.name} names={names} onChange={name=>changeEntry(index,{name})}/><button className="inventory-quiet-button" type="button" aria-label={`Remove tailor ${index+1}`} disabled={entries.length===1} onClick={()=>{setEntries(rows=>rows.filter((_,i)=>i!==index));setReviewed(false);}}><Trash2 size={16}/></button></div>
    {entry.lines.map((line,lineIndex)=><div className="salary-work-line" key={lineIndex}><label>Work / garment<input aria-label={`Tailor ${index+1} work ${lineIndex+1}`} value={line.description} onChange={event=>changeLine(index,lineIndex,{description:event.target.value})} maxLength={300} required/></label><label>Output<input aria-label={`Tailor ${index+1} output ${lineIndex+1}`} type="number" min="0" max="10000" step="1" value={line.quantity} onChange={event=>changeLine(index,lineIndex,{quantity:event.target.value})}/></label><label>Line total (GH₵)<input aria-label={`Tailor ${index+1} amount ${lineIndex+1}`} type="number" min="0" max="1000000" step="0.01" value={line.amount} onChange={event=>changeLine(index,lineIndex,{amount:event.target.value})} required/></label><label>Order reference (optional)<input value={line.order_reference} onChange={event=>changeLine(index,lineIndex,{order_reference:event.target.value})} placeholder="NY-CUS-…"/></label>{entry.lines.length>1&&<button type="button" className="inventory-quiet-button" aria-label={`Remove work line ${lineIndex+1}`} onClick={()=>changeEntry(index,{lines:entry.lines.filter((_,i)=>i!==lineIndex)})}><Trash2 size={15}/></button>}</div>)}
    <button type="button" className="text-link" onClick={()=>changeEntry(index,{lines:[...entry.lines,blankLine()]})}><Plus size={15}/> Add work line</button><details className="salary-adjustments"><summary>Adjustment or deduction</summary><div className="inventory-form-grid"><label>Adjustment (GH₵)<input type="number" min="-1000000" max="1000000" step="0.01" value={entry.adjustment} onChange={event=>changeEntry(index,{adjustment:event.target.value})}/></label><label>Reason<input value={entry.adjustment_reason} required={Number(entry.adjustment)!==0} onChange={event=>changeEntry(index,{adjustment_reason:event.target.value})} maxLength={500}/></label></div><p>Use a negative amount for a deduction. Explain every change.</p></details></fieldset>)}</div>
    <button type="button" className="inventory-quiet-button" onClick={()=>{setEntries(rows=>[...rows,blankEntry()]);setReviewed(false);}}><Plus size={16}/> Add tailor</button>
    {imported&&<label className="salary-review-check"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)} required/> I checked all names, output and amounts against the paper form.</label>}
    {error&&<p className="collection-error" role="alert">{error}</p>}
    <div className="salary-form-footer"><div><span>Total payable</span><strong>{salaryMoney(total)}</strong></div><button className="create-bill-button" disabled={busy||scanning||!!(imported&&!reviewed)} type="submit">{busy?"Saving…":"Save draft"}</button></div></form></div>
  </dialog>;
}


function TailorNameField({ label, value, names, onChange }: { label: string; value: string; names: string[]; onChange: (name: string) => void }) {
  const [custom, setCustom] = useState(() => Boolean(value && !names.includes(value)));
  return <div className="salary-tailor-name-field">
    <label>Tailor name<select aria-label={label} value={custom ? "__new_tailor__" : value} required onChange={event => {
      const isNew = event.target.value === "__new_tailor__";
      setCustom(isNew);
      onChange(isNew ? "" : event.target.value);
    }}><option value="" disabled>Select a tailor</option>{names.map(name => <option key={name} value={name}>{name}</option>)}<option value="__new_tailor__">Enter another name…</option></select></label>
    {custom && <label>New tailor name<input aria-label={`${label} · new tailor`} value={value} onChange={event => onChange(event.target.value)} maxLength={150} required /></label>}
  </div>;
}
