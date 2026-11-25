"use client";

import Image from 'next/image';
import {useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent} from 'react';
import {compressPhoto} from '@/lib/image-compression';
import {Check, Plus, Upload, X} from '@/components/icons';
import {fittingMediaUrl, fittingUploadLimits, measurementUnit, measurementValue, type FittingAttachment, type MeasurementUnit, type PieceOption} from '@/lib/fitting-measurements';
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

type CustomRow = {id: number; group: string; label: string; value: string; saved: boolean; error?: string};
type AddedPiece = {id: number; key: string; title: string; fields: string[]};

export default function FittingFields({fields, pieceOptions = {}, template, previous, unit, busy, onAttachmentsChange, onPreparingChange, allowMedia = true}: {
  fields: Record<string, string>; pieceOptions?: Record<string, PieceOption>; template?: MeasurementTemplate; previous?: Fitting;
  unit: MeasurementUnit; busy: boolean; onAttachmentsChange: (files: File[]) => void;
  /** True while chosen photos are being compressed, so the form can hold saving until they are ready. */
  onPreparingChange?: (preparing: boolean) => void;
  /** Inspiration now belongs to orders; fittings record measurements only. */
  allowMedia?: boolean;
}) {
  const [groups, setGroups] = useState(() => (template?.groups ?? [{title: 'Measurements', fields: Object.keys(fields)}]).map(group => ({...group, fields: [...group.fields]})));
  const [custom, setCustom] = useState<CustomRow[]>([]);
  const [pieces, setPieces] = useState<AddedPiece[]>([]);
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [mediaError, setMediaError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const nextId = useRef(0);
  const focusCustomLabel = useRef<number | null>(null);
  const focusPiece = useRef<number | null>(null);
  const urls = useRef(new Set<string>());
  const uploadInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const activeUrls = urls.current;
    return () => { activeUrls.forEach(url => URL.revokeObjectURL(url)); activeUrls.clear(); };
  }, []);
  const active = new Set(groups.flatMap(group => group.fields));
  const presetGroups = template?.groups ?? [{title: 'Measurements', fields: Object.keys(fields)}];
  // A piece can be added once, and not when the garment already has a section with that name.
  const usedTitles = new Set([...groups.map(group => group.title.toLowerCase()), ...pieces.map(piece => piece.title.trim().toLowerCase())]);
  const availablePieces = Object.entries(pieceOptions).filter(([key, option]) => key !== 'custom' && option.title && !pieces.some(piece => piece.key === key) && !usedTitles.has(option.title.toLowerCase()));

  function addCustom(group: string) {
    const id = nextId.current++;
    focusCustomLabel.current = id;
    setCustom(current => [...current, {id, group, label: '', value: '', saved: false}]);
  }
  function updateCustom(id: number, change: Partial<CustomRow>) {
    setCustom(current => current.map(row => row.id === id ? {...row, ...change, error: undefined} : row));
  }
  /** Confirms a new label and value, so it reads like any other measurement in the form. */
  function saveCustom(row: CustomRow, groupTitle: string, taken: string[]) {
    const label = row.label.trim();
    const duplicate = taken.includes(label.toLowerCase()) || custom.some(other => other.id !== row.id && other.group === row.group && other.label.trim().toLowerCase() === label.toLowerCase());
    const error = !label ? 'Enter a label.' : duplicate ? `${groupTitle} already has ${label}.`
      : !(Number(row.value) >= 0.1 && Number(row.value) <= 999) ? 'Enter a value between 0.1 and 999.' : undefined;
    setCustom(current => current.map(item => item.id === row.id ? {...item, label, saved: !error, error} : item));
  }
  function addPiece(key: string) {
    const option = pieceOptions[key];
    if (!option) return;
    const id = nextId.current++;
    focusPiece.current = id;
    setPieces(current => [...current, {id, key, title: option.title ?? '', fields: [...option.fields]}]);
  }
  function removeField(groupIndex: number, key: string) {
    setGroups(current => current.map((row, index) => index === groupIndex ? {...row, fields: row.fields.filter(field => field !== key)} : row));
  }

  function customRows(groupKey: string, groupTitle: string, taken: string[]) {
    return custom.filter(row => row.group === groupKey).map(row => {
      const enter = (event: KeyboardEvent<HTMLInputElement>) => {if (event.key === 'Enter') {event.preventDefault(); saveCustom(row, groupTitle, taken);}};
      return row.saved
        ? <div className="fitting-edit-field fitting-custom-field is-saved" key={row.id}>
          <div className="fitting-field-heading"><label htmlFor={`custom-value-${row.id}`}>{row.label} ({unit})</label><span className="fitting-field-actions"><button type="button" className="fitting-text-button" onClick={() => updateCustom(row.id, {saved: false})}>Edit</button><button type="button" aria-label={`Remove ${row.label}`} onClick={() => setCustom(current => current.filter(item => item.id !== row.id))}><X size={15}/></button></span></div>
          <input id={`custom-value-${row.id}`} name="additional_value" type="number" inputMode="decimal" min="0.1" max="999" step="0.01" required value={row.value} onChange={event => updateCustom(row.id, {value: event.target.value})}/>
          <input name="additional_label" type="hidden" value={row.label}/><input name="additional_group" type="hidden" value={groupTitle}/>
        </div>
        : <div className="fitting-edit-field fitting-custom-field" key={row.id}>
          <div className="fitting-field-heading"><label htmlFor={`custom-label-${row.id}`}>New measurement</label><button type="button" aria-label="Remove new measurement" onClick={() => setCustom(current => current.filter(item => item.id !== row.id))}><X size={15}/></button></div>
          <input ref={node => {if (node && focusCustomLabel.current === row.id) {focusCustomLabel.current = null; node.focus();}}} id={`custom-label-${row.id}`} name="additional_label" placeholder="Label, e.g. Cuff width" required maxLength={80} value={row.label} onChange={event => updateCustom(row.id, {label: event.target.value})} onKeyDown={enter}/>
          <div className="fitting-custom-value">
            <input aria-label={`Value (${unit})`} name="additional_value" type="number" inputMode="decimal" min="0.1" max="999" step="0.01" required placeholder={`Value (${unit})`} value={row.value} onChange={event => updateCustom(row.id, {value: event.target.value})} onKeyDown={enter}/>
            <button type="button" className="fitting-custom-save" onClick={() => saveCustom(row, groupTitle, taken)}><Check size={16}/>Save</button>
          </div>
          {row.error && <small className="collection-error" role="alert">{row.error}</small>}
          <input name="additional_group" type="hidden" value={groupTitle}/>
        </div>;
    });
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
      <legend><span>{group.title}</span><button className="fitting-add-button" type="button" aria-label={`Add a measurement to ${group.title}`} disabled={custom.length >= 30} onClick={() => addCustom(`g${groupIndex}`)}><Plus size={20}/></button></legend>
      <div className="inventory-form-grid">
        {group.fields.map(key => <div className="fitting-edit-field" key={key}>
          <div className="fitting-field-heading"><label htmlFor={`measurement-${key}`}>{fields[key]} ({measurementUnit(unit, key)})</label><button type="button" aria-label={`Remove ${fields[key]}`} onClick={() => removeField(groupIndex, key)}><X size={15}/></button></div>
          <input id={`measurement-${key}`} type="number" inputMode="decimal" name={key} min="0.1" max="999" step="0.01" defaultValue={template || previous?.values[key] === undefined ? undefined : measurementValue(previous.values[key], unit, key)}/>
          {template && previous?.values[key] !== undefined && <small className="consultation-muted">Previous · {measurementValue(previous.values[key], unit, key)} {measurementUnit(unit, key)}</small>}
        </div>)}
        {customRows(`g${groupIndex}`, group.title, [...active].map(key => fields[key].toLowerCase()))}
      </div>
      {presetGroups[groupIndex].fields.some(key => !active.has(key)) && <label className="fitting-restore-field"><span className="sr-only">Restore a field to {group.title}</span><select aria-label={`Restore a field to ${group.title}`} value="" onChange={event => {
        const key = event.target.value;
        if (key) setGroups(current => current.map((row, index) => index === groupIndex ? {...row, fields: [...row.fields, key]} : row));
      }}><option value="">Restore a field</option>{presetGroups[groupIndex].fields.filter(key => !active.has(key)).map(key => <option value={key} key={key}>{fields[key]}</option>)}</select></label>}
      {!group.fields.length && !custom.some(row => row.group === `g${groupIndex}`) && <p className="consultation-muted">Use + to add a measurement.</p>}
    </fieldset>)}
    {pieces.map(piece => {
      const groupKey = `p${piece.id}`;
      const title = piece.title.trim() || 'New piece';
      const optionFields = pieceOptions[piece.key]?.fields ?? [];
      return <fieldset className="showroom-measurement-group fitting-edit-group fitting-added-piece" key={piece.id} disabled={busy}>
        <legend><span>{title}</span>
          <span className="fitting-field-actions"><button className="fitting-add-button" type="button" aria-label={`Add a measurement to ${title}`} disabled={custom.length >= 30} onClick={() => addCustom(groupKey)}><Plus size={20}/></button>
            <button className="fitting-add-button" type="button" aria-label={`Remove ${title}`} onClick={() => {setPieces(current => current.filter(row => row.id !== piece.id)); setCustom(current => current.filter(row => row.group !== groupKey));}}><X size={18}/></button></span></legend>
        <input type="hidden" name="piece_id" value={piece.id}/><input type="hidden" name="piece_key" value={piece.key}/>
        {piece.key === 'custom' ? <label className="fitting-piece-name">Piece name<input ref={node => {if (node && focusPiece.current === piece.id) {focusPiece.current = null; node.focus();}}} name="piece_title" required maxLength={60} placeholder="e.g. Bow tie" value={piece.title}
          onChange={event => setPieces(current => current.map(row => row.id === piece.id ? {...row, title: event.target.value} : row))}/></label> : <input type="hidden" name="piece_title" value={piece.title}/>}
        <div className="inventory-form-grid">
          {piece.fields.map(key => <div className="fitting-edit-field" key={key}>
            <div className="fitting-field-heading"><label htmlFor={`piece-${piece.id}-${key}`}>{fields[key]} ({measurementUnit(unit, key)})</label><button type="button" aria-label={`Remove ${fields[key]} from ${title}`} onClick={() => setPieces(current => current.map(row => row.id === piece.id ? {...row, fields: row.fields.filter(field => field !== key)} : row))}><X size={15}/></button></div>
            <input ref={node => {if (node && piece.key !== 'custom' && focusPiece.current === piece.id && key === piece.fields[0]) {focusPiece.current = null; node.focus();}}} id={`piece-${piece.id}-${key}`} type="number" inputMode="decimal" name={`piece-${piece.id}-${key}`} min="0.1" max="999" step="0.01"/>
          </div>)}
          {customRows(groupKey, title, piece.fields.map(key => fields[key].toLowerCase()))}
        </div>
        {optionFields.some(key => !piece.fields.includes(key)) && <label className="fitting-restore-field"><span className="sr-only">Restore a field to {title}</span><select aria-label={`Restore a field to ${title}`} value="" onChange={event => {
          const key = event.target.value;
          if (key) setPieces(current => current.map(row => row.id === piece.id ? {...row, fields: [...row.fields, key]} : row));
        }}><option value="">Restore a field</option>{optionFields.filter(key => !piece.fields.includes(key)).map(key => <option value={key} key={key}>{fields[key]}</option>)}</select></label>}
        {!piece.fields.length && !custom.some(row => row.group === groupKey) && <p className="consultation-muted">Use + to add a measurement.</p>}
      </fieldset>;
    })}
    {Object.keys(pieceOptions).length > 0 && pieces.length < 6 && <label className="fitting-add-piece"><Plus size={18}/><span className="sr-only">Add a piece to this fitting</span>
      <select aria-label="Add a piece to this fitting" value="" disabled={busy} onChange={event => addPiece(event.target.value)}>
        <option value="">Add a piece (e.g. a shirt)</option>
        {availablePieces.map(([key, option]) => <option key={key} value={key}>{option.title}</option>)}
        {pieceOptions.custom && <option value="custom">Other piece (name it)</option>}
      </select></label>}
    {allowMedia && <section className="fitting-inspiration" aria-label="Upload fitting inspiration">
      <div className="fitting-inspiration-heading"><div><h3>Inspiration</h3><p className="consultation-muted">Photos and videos for this fitting.</p></div><button type="button" className="inventory-quiet-button" disabled={busy || preparing || media.length >= 6} onClick={() => uploadInput.current?.click()}><Upload size={17}/>Add photos or videos</button></div>
      <input className="sr-only" ref={uploadInput} type="file" aria-label="Choose inspiration photos and videos" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm,.mov,.heic,.heif" multiple disabled={busy} onChange={addFiles}/>
      <p className="fitting-upload-limit">Up to 6 files · 20 MB each · 60 MB total</p>
      {preparing && <p className="consultation-muted" role="status">Optimising photos for upload…</p>}
      {mediaError && <p className="collection-error" role="alert">{mediaError}</p>}
      {!!media.length && <div className="fitting-media-grid">{media.map(item => <figure key={item.id}>
        {item.file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(item.file.name) ? <video src={item.url} controls playsInline preload="metadata" aria-label={item.file.name}/> : <Image unoptimized src={item.url} alt={item.file.name} width={320} height={240}/>}
        <button type="button" className="fitting-remove-media" disabled={busy} aria-label={`Remove ${item.file.name}`} onClick={() => removeMedia(item.id)}><X size={16}/></button><figcaption>{item.file.name}</figcaption>
      </figure>)}</div>}
    </section>}
  </>;
}
