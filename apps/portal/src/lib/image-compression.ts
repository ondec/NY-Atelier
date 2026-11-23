/** Longest side kept for fitting photos: sharp on any screen and in print, far smaller than a raw phone photo. */
export const photoMaxEdge = 3000;
/** JPEG quality for re-encoded photos; 0.85 is visually indistinguishable from the original for photographs. */
export const photoQuality = 0.85;

const compressible = /^image\/(jpeg|png|webp|heic|heif)$/;

/** Target size for a photo: never enlarged, scaled down so its longest side is at most maxEdge. */
export function photoTargetSize(width: number, height: number, maxEdge = photoMaxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), resized: scale < 1 };
}

/** Name for the re-encoded file: the same name with a .jpg extension. */
export function compressedPhotoName(name: string) {
  const base = name.replace(/\.[^./\\]+$/, '') || 'photo';
  return `${base}.jpg`;
}

/** Keep the compressed copy only when it is meaningfully smaller, or when the photo had to be scaled down. */
export function keepCompressed(originalBytes: number, compressedBytes: number, resized: boolean) {
  return resized || compressedBytes < originalBytes * 0.9;
}

/**
 * Re-encodes a photo in the browser before upload: scales it down to photoMaxEdge and saves a high-quality JPEG.
 * Orientation is applied from the camera data, and location and other metadata are dropped.
 * Videos, GIFs and photos the browser cannot decode (for example HEIC outside Safari) are returned unchanged.
 */
export async function compressPhoto(file: File): Promise<File> {
  if (!compressible.test(file.type) || typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { return file; }
  try {
    const target = photoTargetSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = target.width; canvas.height = target.height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.fillStyle = '#ffffff'; // JPEG has no transparency; PNG cut-outs get a white background.
    context.fillRect(0, 0, target.width, target.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', photoQuality));
    if (!blob || !keepCompressed(file.size, blob.size, target.resized)) return file;
    return new File([blob], compressedPhotoName(file.name), { type: 'image/jpeg', lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
