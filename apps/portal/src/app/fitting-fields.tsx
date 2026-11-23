"use client";

import Image from 'next/image';
import {useEffect, useRef, useState, type ChangeEvent} from 'react';
import {compressPhoto} from '@/lib/image-compression';
import {Plus, Upload, X} from '@/components/icons';
import {fittingMediaUrl, fittingUploadLimits, measurementUnit, measurementValue, type FittingAttachment, type MeasurementUnit} from '@/lib/fitting-measurements';
import type {Fitting, MeasurementTemplate} from './customers-workspace';
import FittingMediaViewer from './fitting-media-viewer';

type PendingMedia = {id: string; file: File; url: string};

export function FittingMedia({customerId, fittingId, attachments}: {customerId: number; fittingId: number; attachments: FittingAttachment[]}) {
  const [viewing, setViewing] = useState<number>();
  if (!attachments.length) return null;
  return <section className="fitting-inspiration" aria-label="Fitting inspiration">
    <h3>Inspiration</h3>
    <div className="fitting-media-grid">{attachments.map((file, index) => {
      const url = fittingMediaUrl(customerId, fittingId, file.id);
      return <figure key={file.id}>
        {file.mime_type.startsWith('video/') ? <video controls playsInline preload="metadata" src={url} aria-label={file.name}/> :
          <button type="button" className="fitting-media-open" aria-label={`View inspiration: ${file.name}`} onClick={() => setViewing(index)}><Image unoptimized src={url} alt={file.name} width={320} height={240}/></button>}
        <figcaption><button type="button" className="fitting-media-open" onClick={() => setViewing(index)}>{file.name}</button></figcaption>
      </figure>;
    })}</div>
    {viewing !== undefined && <FittingMediaViewer key={`${customerId}-${fittingId}`} customerId={customerId} fittingId={fittingId} attachments={attachments} start={viewing} onClose={() => setViewing(undefined)}/>}
  </section>;
}

export default function FittingFields({fields, template, previous, unit, busy, onAttachmentsChange, onPreparingChange}: {
  fields: Record<string, string>; template?: MeasurementTemplate; previous?: Fitting;
  unit: MeasurementUnit; busy: boolean; onAttachmentsChange: (files: File[]) => void;
  /** True while chosen photos are being compressed, so the form can hold saving until they are ready. */
  onPreparingChange?: (preparing: boolean) => void;
}) {
  const [groups, setGroups] = useState(() => (template?.groups ?? [{title: 'Measurements', fields: Object.keys(fields)}]).map(group => ({...group, fields: [...group.fields]})));
  const [custom, setCustom] = useState<{id: number; group: number}[]>([]);
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [mediaError, setMediaError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const nextId = useRef(0);
  const focusCustomLabel = useRef<number | null>(null);
  const urls = useRef(new Set<string>());
  const uploadInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const activeUrls = urls.current;
    return () => { activeUrls.forEach(url => URL.revokeObjectURL(url)); activeUrls.clear(); };
  }, []);
  const active = new Set(groups.flatMap(group => group.fields));
  const presetGroups = template?.groups ?? [{title: 'Measurements', fields: Object.keys(fields)}];
  function addCustom(group: number) {
    const id = nextId.current++;
    focusCustomLabel.current = id;
    setCustom(current => [...current, {id, group}]);
  }
  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!chosen.length) return;
    const accepted = /^(image\/(jpeg|png|webp|gif|heic|heif)|video\/(mp4|quicktime|webm))$/;
    const extension = /\.(jpe?g|png|webp|gif|heic|heif|mp4|mov|webm)$/i;
    if (media.length + chosen.length > fittingUploadLimits.files) {setMediaError('Choose up to 6 photos and videos.'); return;}
    if (chosen.some(file => file.type ? !accepted.test(file.type) : !extension.test(file.name))) {setMediaError('Choose JPG, PNG, WebP, GIF, HEIC, MP4, MOV or WebM files.'); return;}
    setPreparing(true); onPreparingChange?.(true); setMediaError('');
    let incoming: File[];
    try { incoming = await Promise.all(chosen.map(compressPhoto)); } finally { setPreparing(false); onPreparingChange?.(false); }
    const all = [...media.map(item => item.file), ...incoming];
    if (all.some(file => file.size > fittingUploadLimits.fileBytes) || all.reduce((sum, file) => sum + file.size, 0) > fittingUploadLimits.totalBytes) {
      setMediaError('Keep each file under 20 MB and all attachments under 60 MB.'); return;
    }
    const additions = incoming.map(file => {
      const url = URL.createObjectURL(file); urls.current.add(url);
      return {id: `media-${nextId.current++}`, file, url};
    });
    const updated = [...media, ...additions];
    setMedia(updated); onAttachmentsChange(updated.map(item => item.file)); setMediaError('');
  }
  function removeMedia(id: string) {
    const item = media.find(row => row.id === id);
    if (item) {URL.revokeObjectURL(item.url); urls.current.delete(item.url);}
    const updated = media.filter(row => row.id !== id);
    setMedia(updated); onAttachmentsChange(updated.map(row => row.file)); setMediaError('');
  }
  return <>
    {groups.map((group, groupIndex) => <fieldset className="showroom-measurement-group fitting-edit-group" key={group.title} disabled={busy}>
      <legend><span>{group.title}</span><button className="fitting-add-button" type="button" aria-label={`Add custom measurement to ${group.title}`} disabled={custom.length >= 30} onClick={() => addCustom(groupIndex)}><Plus size={20}/></button></legend>
      <div className="inventory-form-grid">
        {group.fields.map(key => <div className="fitting-edit-field" key={key}>
          <div className="fitting-field-heading"><label htmlFor={`measurement-${key}`}>{fields[key]} ({measurementUnit(unit, key)})</label><button type="button" aria-label={`Remove ${fields[key]}`} onClick={() => setGroups(current => current.map((row, index) => index === groupIndex ? {...row, fields: row.fields.filter(field => field !== key)} : row))}><X size={15}/></button></div>
          <input id={`measurement-${key}`} type="number" inputMode="decimal" name={key} min="0.1" max="999" step="0.01" defaultValue={template || previous?.values[key] === undefined ? undefined : measurementValue(previous.values[key], unit, key)}/>
          {template && previous?.values[key] !== undefined && <small className="consultation-muted">Previous · {measurementValue(previous.values[key], unit, key)} {measurementUnit(unit, key)}</small>}
        </div>)}
        {custom.filter(row => row.group === groupIndex).map(row => <div className="fitting-edit-field fitting-custom-field" key={row.id}>
          <div className="fitting-field-heading"><label htmlFor={`custom-label-${row.id}`}>Measurement label</label><button type="button" aria-label="Remove custom measurement" onClick={() => setCustom(current => current.filter(item => item.id !== row.id))}><X size={15}/></button></div>
          <input ref={node => {if (node && focusCustomLabel.current === row.id) {focusCustomLabel.current = null; node.focus();}}} id={`custom-label-${row.id}`} name="additional_label" placeholder="e.g. Label length" required maxLength={80}/>
          <label htmlFor={`custom-value-${row.id}`}>Value ({unit})</label><input id={`custom-value-${row.id}`} name="additional_value" type="number" inputMode="decimal" min="0.1" max="999" step="0.01" required/>
          <input name="additional_group" type="hidden" value={group.title}/>
        </div>)}
      </div>
      {presetGroups[groupIndex].fields.some(key => !active.has(key)) && <label className="fitting-restore-field"><span className="sr-only">Restore a field to {group.title}</span><select aria-label={`Restore a field to ${group.title}`} value="" onChange={event => {
        const key = event.target.value;
        if (key) setGroups(current => current.map((row, index) => index === groupIndex ? {...row, fields: [...row.fields, key]} : row));
      }}><option value="">Restore a field</option>{presetGroups[groupIndex].fields.filter(key => !active.has(key)).map(key => <option value={key} key={key}>{fields[key]}</option>)}</select></label>}
      {!group.fields.length && !custom.some(row => row.group === groupIndex) && <p className="consultation-muted">Use + to add a measurement.</p>}
    </fieldset>)}
    <section className="fitting-inspiration" aria-label="Upload fitting inspiration">
      <div className="fitting-inspiration-heading"><div><h3>Inspiration</h3><p className="consultation-muted">Photos and videos for this fitting.</p></div><button type="button" className="inventory-quiet-button" disabled={busy || preparing || media.length >= 6} onClick={() => uploadInput.current?.click()}><Upload size={17}/>Add photos or videos</button></div>
      <input className="sr-only" ref={uploadInput} type="file" aria-label="Choose inspiration photos and videos" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm,.mov,.heic,.heif" multiple disabled={busy} onChange={addFiles}/>
      <p className="fitting-upload-limit">Up to 6 files · 20 MB each · 60 MB total</p>
      {preparing && <p className="consultation-muted" role="status">Optimising photos for upload…</p>}
      {mediaError && <p className="collection-error" role="alert">{mediaError}</p>}
      {!!media.length && <div className="fitting-media-grid">{media.map(item => <figure key={item.id}>
        {item.file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(item.file.name) ? <video src={item.url} controls playsInline preload="metadata" aria-label={item.file.name}/> : <Image unoptimized src={item.url} alt={item.file.name} width={320} height={240}/>}
        <button type="button" className="fitting-remove-media" disabled={busy} aria-label={`Remove ${item.file.name}`} onClick={() => removeMedia(item.id)}><X size={16}/></button><figcaption>{item.file.name}</figcaption>
      </figure>)}</div>}
    </section>
  </>;
}
