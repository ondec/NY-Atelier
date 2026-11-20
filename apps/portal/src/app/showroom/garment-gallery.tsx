"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Shirt, X } from "@/components/icons";
import {useStudioDialogHistory} from './use-studio-dialog-history';

function PhotoStrip({ photos, label, start = 0, selected, enlarged = false, onEnlarge, onSelect }: {
  photos: string[]; label: string; start?: number; selected?: number; enlarged?: boolean;
  onEnlarge?: (index: number) => void; onSelect?: (index: number) => void;
}) {
  const [viewport, carousel] = useEmblaCarousel({ align: "start", containScroll: "keepSnaps", startIndex: start });
  const [index, setIndex] = useState(start);
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(photos.length > 1);
  useEffect(() => { if (selected !== undefined) carousel?.scrollTo(selected, true); }, [carousel, selected]);
  useEffect(() => {
    if (!carousel) return;
    const update = () => {
      const selected = carousel.selectedScrollSnap();
      setIndex(selected);
      setCanPrevious(carousel.canScrollPrev());
      setCanNext(carousel.canScrollNext());
      onSelect?.(selected);
    };
    queueMicrotask(update);
    carousel.on("select", update).on("reInit", update);
    return () => { carousel.off("select", update).off("reInit", update); };
  }, [carousel, onSelect]);
  return <div className={`studio-gallery${enlarged ? " studio-gallery-enlarged" : ""}`} role="region" aria-roledescription="carousel" aria-label={`${label} photos`} onKeyDown={event => {
    if (event.key === "ArrowRight") { event.preventDefault(); carousel?.scrollNext(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); carousel?.scrollPrev(); }
  }}>
    <div className="studio-gallery-viewport" ref={viewport}><div className="studio-gallery-track">
      {photos.map((photo, position) => <div className={`studio-gallery-slide${photos.length === 1 ? " studio-gallery-single" : ""}`} key={`${photo}-${position}`} role="group" aria-roledescription="slide" aria-label={`${position + 1} of ${photos.length}`}>
        {enlarged ? <div className="studio-gallery-large-photo"><Image src={photo} alt={`${label}, photo ${position + 1}`} fill unoptimized sizes="90vw" draggable={false} style={{ objectFit: "contain" }} /></div> : <button type="button" className="studio-gallery-photo" aria-label={`Enlarge ${label}, photo ${position + 1}`} onClick={() => onEnlarge?.(position)}>
          <Image src={photo} alt={`${label}, photo ${position + 1}`} fill unoptimized sizes="(max-width: 760px) 85vw, 50vw" priority={position === 0} draggable={false} style={{ objectFit: "cover", objectPosition: "center top" }} />
          <span className="studio-gallery-expand" aria-hidden="true"><Expand size={17} /></span>
        </button>}
      </div>)}
    </div></div>
    <div className="studio-gallery-navigation"><span aria-live="polite" aria-atomic="true">{index + 1} / {photos.length}</span>{photos.length > 1 && <>
      <div className="studio-gallery-dots" role="group" aria-label="Choose a photo">{photos.map((_, position) => <button key={position} type="button" aria-label={`Show photo ${position + 1}`} aria-pressed={index === position} onClick={() => carousel?.scrollTo(position)}><span /></button>)}</div>
      <div className="studio-gallery-arrows"><button type="button" aria-label="Previous photo" disabled={!canPrevious} onClick={() => carousel?.scrollPrev()}><ChevronLeft size={20} /></button><button type="button" aria-label="Next photo" disabled={!canNext} onClick={() => carousel?.scrollNext()}><ChevronRight size={20} /></button></div>
    </>}</div>
  </div>;
}

function PhotoViewer({ photos, label, start, onClose, onSelect }: { photos: string[]; label: string; start: number; onClose: () => void; onSelect: (index: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useStudioDialogHistory(dialog,onClose);
  const lastSelected = useRef(start);
  const select = useCallback((index: number) => { lastSelected.current = index; onSelect(index); }, [onSelect]);
  useEffect(() => {
    const element = dialog.current;
    const gallery = element?.parentElement;
    const opener = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      const photo = gallery?.querySelectorAll<HTMLButtonElement>(".studio-gallery-photo")[lastSelected.current];
      if (photo?.isConnected) photo.focus({ preventScroll: true });
      else if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return <dialog className="studio-photo-viewer" ref={dialog} aria-label={`${label} enlarged photos`} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="studio-photo-viewer-header"><h2>{label}</h2><button type="button" className="showroom-secondary" aria-label="Close enlarged photos" onClick={onClose}><X size={22} /></button></div>
    <PhotoStrip photos={photos} label={label} start={start} enlarged onSelect={select} />
  </dialog>;
}

export default function GarmentGallery({ photos, label }: { photos: string[]; label: string }) {
  const [enlarged, setEnlarged] = useState<number>();
  const [mainIndex, setMainIndex] = useState(0);
  const select = useCallback((index: number) => setMainIndex(index), []);
  if (!photos.length) return <div className="studio-gallery-empty"><Shirt size={70} /><p>No garment photos added yet.</p></div>;
  return <section className="studio-garment-gallery" aria-label="Garment gallery">
    <PhotoStrip photos={photos} label={label} selected={mainIndex} onEnlarge={setEnlarged} />
    {enlarged !== undefined && <PhotoViewer photos={photos} label={label} start={enlarged} onClose={() => setEnlarged(undefined)} onSelect={select} />}
  </section>;
}
