"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useRef } from "react";
import {useStudioDialogHistory} from './showroom/use-studio-dialog-history';

export async function preparePhoto(file: File, maxDimension: number) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) {
    throw new Error("Choose a JPG, PNG or WebP image up to 15 MB.");
  }

  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the photo.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    image.close();
  }
}

export async function readGallery(data: FormData, existing: string[]) {
  const removed = new Set(data.getAll("removeGalleryPhoto").map(Number));
  const retained = existing.filter((_, index) => !removed.has(index));
  const files = data.getAll("galleryPhotos").filter((file): file is File => file instanceof File && file.size > 0);
  if (retained.length + files.length > 6) throw new Error("A gallery can hold up to six photos.");
  for (const file of files) retained.push(await preparePhoto(file, 720));
  return retained;
}

export function GalleryFields({ photos = [], label }: { photos?: string[]; label: string }) {
  return <fieldset className="inventory-size-entries inventory-gallery-fields">
    <legend>{label}</legend>
    <p>Add up to six JPG, PNG or WebP photos. Select any saved photos you want to remove.</p>
    {photos.length > 0 && <div className="inventory-gallery-existing">
      {photos.map((photo, index) => <label key={index}>
        <Image src={photo} alt={`Photo ${index + 1}`} width={64} height={78} unoptimized />
        <span><input type="checkbox" name="removeGalleryPhoto" value={index} /> Remove</span>
      </label>)}
    </div>}
    <label>Add photos<input type="file" name="galleryPhotos" accept="image/jpeg,image/png,image/webp" multiple /></label>
  </fieldset>;
}

export function InventoryDrawer({ children, label, onClose, fullScreen = false, dismissible = true }: { children: ReactNode; label: string; onClose: () => void; fullScreen?: boolean; dismissible?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useStudioDialogHistory(dialogRef, onClose, !fullScreen, !dismissible);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={dialogRef} className={`inventory-drawer${fullScreen ? ' is-full-screen' : ''}`} aria-label={label} onCancel={(event) => {
    event.preventDefault();
    if (dismissible) onClose();
  }} onClick={(event) => {
    if (dismissible && event.target === event.currentTarget) onClose();
  }}>
    {children}
  </dialog>;
}

