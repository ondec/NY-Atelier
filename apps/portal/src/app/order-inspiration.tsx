"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Upload, X } from "@/components/icons";
import { compressPhoto } from "@/lib/image-compression";
import { fittingUploadLimits, type FittingAttachment } from "@/lib/fitting-measurements";
import FittingMediaViewer from "./fitting-media-viewer";

export const orderMediaUrl = (reference: string, id: string) => `/api/staff-order-media/${encodeURIComponent(reference)}/${encodeURIComponent(id)}`;
const accepted = /^(image\/(jpeg|png|webp|gif|heic|heif)|video\/(mp4|quicktime|webm))$/;
const extension = /\.(jpe?g|png|webp|gif|heic|heif|mp4|mov|webm)$/i;
export const mediaAccept = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm,.mov,.heic,.heif";
const isVideo = (file: { type?: string; mime_type?: string; name: string }) => (file.mime_type ?? file.type ?? "").startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);

/** Checks and compresses chosen photos and videos; returns an error message instead of files when they don't fit. */
export async function prepareMedia(chosen: File[], alreadyChosen: File[]): Promise<{ files?: File[]; error?: string }> {
  if (alreadyChosen.length + chosen.length > fittingUploadLimits.files) return { error: "Choose up to 6 photos and videos at a time." };
  if (chosen.some((file) => file.type ? !accepted.test(file.type) : !extension.test(file.name))) return { error: "Choose JPG, PNG, WebP, GIF, HEIC, MP4, MOV or WebM files." };
  const files = await Promise.all(chosen.map(compressPhoto));
  const all = [...alreadyChosen, ...files];
  if (all.some((file) => file.size > fittingUploadLimits.fileBytes) || all.reduce((sum, file) => sum + file.size, 0) > fittingUploadLimits.totalBytes) {
    return { error: "Keep each file under 20 MB and all of them under 60 MB." };
  }
  return { files };
}

export async function uploadOrderMedia(reference: string, files: File[]): Promise<FittingAttachment[]> {
  const body = new FormData();
  files.forEach((file) => body.append("attachments[]", file, file.name));
  const response = await fetch(`/api/staff-order-media/${encodeURIComponent(reference)}`, { method: "POST", body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || "The photos didn’t upload.");
  return result.attachments;
}

/** Photos and videos chosen in a form before the order exists; they upload once it is created. */
export function PendingMedia({ onChange, disabled }: { onChange: (files: File[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<{ id: number; file: File; url: string }[]>([]);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const nextId = useRef(0);
  const urls = useRef(new Set<string>());
  useEffect(() => { const active = urls.current; return () => active.forEach((url) => URL.revokeObjectURL(url)); }, []);

  function update(next: typeof items) { setItems(next); onChange(next.map((item) => item.file)); }
  async function add(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!chosen.length) return;
    setPreparing(true); setError("");
    try {
      const result = await prepareMedia(chosen, items.map((item) => item.file));
      if (result.error) { setError(result.error); return; }
      update([...items, ...result.files!.map((file) => { const url = URL.createObjectURL(file); urls.current.add(url); return { id: nextId.current++, file, url }; })]);
    } finally { setPreparing(false); }
  }
  function remove(id: number) {
    const item = items.find((row) => row.id === id);
    if (item) { URL.revokeObjectURL(item.url); urls.current.delete(item.url); }
    update(items.filter((row) => row.id !== id));
  }

  return <section className="fitting-inspiration order-inspiration" aria-label="Inspiration for this order">
    <div className="fitting-inspiration-heading"><div><h3>Inspiration</h3><p className="consultation-muted">Photos and videos of the style for this order.</p></div>
      <button type="button" className="inventory-quiet-button" disabled={disabled || preparing || items.length >= fittingUploadLimits.files} onClick={() => input.current?.click()}><Upload size={17} />Add photos or videos</button></div>
    <input className="sr-only" ref={input} type="file" aria-label="Choose inspiration photos and videos" accept={mediaAccept} multiple disabled={disabled} onChange={add} />
    <p className="fitting-upload-limit">Up to 6 files · 20 MB each · 60 MB total</p>
    {preparing && <p className="consultation-muted" role="status">Optimising photos for upload…</p>}
    {error && <p className="collection-error" role="alert">{error}</p>}
    {!!items.length && <div className="fitting-media-grid">{items.map((item) => <figure key={item.id}>
      {isVideo(item.file) ? <video src={item.url} controls playsInline preload="metadata" aria-label={item.file.name} /> : <Image unoptimized src={item.url} alt={item.file.name} width={320} height={240} />}
      <button type="button" className="fitting-remove-media" disabled={disabled} aria-label={`Remove ${item.file.name}`} onClick={() => remove(item.id)}><X size={16} /></button>
      <figcaption>{item.file.name}</figcaption>
    </figure>)}</div>}
  </section>;
}

/** An order's saved inspiration. Staff who can change the order may add or remove files. */
export default function OrderInspiration({ reference, attachments, canEdit = false, onChange }: { reference: string; attachments: FittingAttachment[]; canEdit?: boolean; onChange?: (attachments: FittingAttachment[]) => void }) {
  const [viewing, setViewing] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  if (!attachments.length && !canEdit) return null;

  async function add(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!chosen.length) return;
    setBusy(true); setError("");
    try {
      const prepared = await prepareMedia(chosen, []);
      if (prepared.error) { setError(prepared.error); return; }
      onChange?.(await uploadOrderMedia(reference, prepared.files!));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The photos didn’t upload."); } finally { setBusy(false); }
  }
  async function remove(file: FittingAttachment) {
    if (!window.confirm(`Remove ${file.name} from this order?`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(orderMediaUrl(reference, file.id), { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Could not remove the file.");
      onChange?.(attachments.filter((item) => item.id !== file.id));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not remove the file."); } finally { setBusy(false); }
  }

  return <section className="fitting-inspiration order-inspiration" aria-label="Order inspiration">
    <div className="fitting-inspiration-heading"><div><h3>Inspiration</h3>{canEdit && <p className="consultation-muted">Photos and videos of the style for this order.</p>}</div>
      {canEdit && <button type="button" className="inventory-quiet-button" disabled={busy || attachments.length >= 12} onClick={() => input.current?.click()}><Upload size={17} />{busy ? "Uploading…" : "Add photos or videos"}</button>}</div>
    {canEdit && <input className="sr-only" ref={input} type="file" aria-label="Choose inspiration photos and videos" accept={mediaAccept} multiple disabled={busy} onChange={add} />}
    {error && <p className="collection-error" role="alert">{error}</p>}
    {!attachments.length ? <p className="consultation-muted">No inspiration added yet.</p> : <div className="fitting-media-grid">{attachments.map((file, index) => {
      const url = orderMediaUrl(reference, file.id);
      return <figure key={file.id}>
        {isVideo(file) ? <video controls playsInline preload="metadata" src={url} aria-label={file.name} /> :
          <button type="button" className="fitting-media-open" aria-label={`View inspiration: ${file.name}`} onClick={() => setViewing(index)}><Image unoptimized src={url} alt={file.name} width={320} height={240} /></button>}
        {canEdit && <button type="button" className="fitting-remove-media" disabled={busy} aria-label={`Remove ${file.name}`} onClick={() => remove(file)}><X size={16} /></button>}
        <figcaption><button type="button" className="fitting-media-open" onClick={() => setViewing(index)}>{file.name}</button></figcaption>
      </figure>;
    })}</div>}
    {viewing !== undefined && <FittingMediaViewer customerId={0} fittingId={0} attachments={attachments} start={viewing} urlFor={(id) => orderMediaUrl(reference, id)} onClose={() => setViewing(undefined)} />}
  </section>;
}
