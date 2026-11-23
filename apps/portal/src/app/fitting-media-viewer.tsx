"use client";

import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ChevronLeft, ChevronRight} from '@/components/icons';
import {fittingMediaUrl, type FittingAttachment} from '@/lib/fitting-measurements';
import {useStudioDialogHistory} from './showroom/use-studio-dialog-history';
import './fitting-media-viewer.css';

export default function FittingMediaViewer({customerId, fittingId, attachments, start, onClose}: {
  customerId: number; fittingId: number; attachments: FittingAttachment[];
  start: number; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [viewport, carousel] = useEmblaCarousel({align: 'start', containScroll: 'keepSnaps', startIndex: start});
  const [index, setIndex] = useState(start);
  useStudioDialogHistory(dialog, onClose);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    return () => {
      element?.querySelectorAll('video').forEach(video => video.pause());
      element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({preventScroll: true});
    };
  }, []);
  useEffect(() => {
    if (!carousel) return;
    const select = () => {
      setIndex(carousel.selectedScrollSnap());
      dialog.current?.querySelectorAll('video').forEach(video => video.pause());
    };
    carousel.on('select', select).on('reInit', select);
    return () => {carousel.off('select', select).off('reInit', select);};
  }, [carousel]);

  return <dialog ref={dialog} className="fitting-media-viewer" aria-label="Fitting inspiration viewer"
    onCancel={event => {event.preventDefault(); onClose();}}
    onKeyDown={event => {
      if (event.target instanceof HTMLVideoElement) return;
      if (event.key === 'ArrowLeft') {event.preventDefault(); carousel?.scrollPrev();}
      if (event.key === 'ArrowRight') {event.preventDefault(); carousel?.scrollNext();}
    }}>
    <div className="fitting-media-viewer-content">
      <header className="fitting-media-viewer-header">
        <button type="button" className="fitting-media-viewer-back" aria-label="Back to fitting" onClick={onClose}><ArrowLeft size={20}/></button>
        <h2>Inspiration</h2>
      </header>
      <div className="fitting-media-viewer-viewport" ref={viewport} role="region" aria-roledescription="carousel" aria-label="Inspiration photos and videos">
        <div className="fitting-media-viewer-track">{attachments.map((file, position) => <div className="fitting-media-viewer-slide" key={file.id} role="group" aria-roledescription="slide" aria-label={`${position + 1} of ${attachments.length}`} inert={position !== index}>
          {file.mime_type.startsWith('video/')
            ? <video controls playsInline preload="metadata" src={fittingMediaUrl(customerId, fittingId, file.id)} aria-label={file.name}/>
            : <Image unoptimized fill sizes="100vw" draggable={false} src={fittingMediaUrl(customerId, fittingId, file.id)} alt={file.name}/>}
        </div>)}</div>
      </div>
      <footer className="fitting-media-viewer-footer">
        <p className="fitting-media-viewer-name">{attachments[index].name}</p>
        <nav aria-label="Browse fitting inspiration">
          {attachments.length > 1 && <button type="button" aria-label="Previous inspiration" disabled={index === 0} onClick={() => carousel?.scrollPrev()}><ChevronLeft size={22}/></button>}
          <span aria-live="polite" aria-atomic="true">{index + 1} / {attachments.length}</span>
          {attachments.length > 1 && <button type="button" aria-label="Next inspiration" disabled={index === attachments.length - 1} onClick={() => carousel?.scrollNext()}><ChevronRight size={22}/></button>}
        </nav>
      </footer>
    </div>
  </dialog>;
}
