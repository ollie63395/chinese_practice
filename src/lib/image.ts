const MAX_DIMENSION = 1024;
const KEEP_ORIGINAL_UNDER_BYTES = 400_000;

/**
 * Scales an image down for storage. Small images are kept as they are
 * (which also keeps GIF animation); larger ones are re-encoded.
 */
export async function prepareImage(file: Blob): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Tệp này không phải là hình ảnh.');

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    // SVGs without an intrinsic size report 0 × 0; there's nothing to scale.
    if (longest === 0) return file;
    const scale = Math.min(1, MAX_DIMENSION / longest);
    if (scale === 1 && file.size <= KEEP_ORIGINAL_UNDER_BYTES) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không xử lý được hình ảnh này.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const webp = await toBlob(canvas, 'image/webp');
    if (webp?.type === 'image/webp') return webp;

    // Safari can't encode WebP. JPEG has no transparency, so paint white behind the image.
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const jpeg = await toBlob(canvas, 'image/jpeg');
    if (!jpeg) throw new Error('Không xử lý được hình ảnh này.');
    return jpeg;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không đọc được hình ảnh này. Hãy thử ảnh JPEG, PNG hoặc WebP.'));
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
}
