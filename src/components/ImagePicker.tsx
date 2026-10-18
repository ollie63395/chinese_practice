import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { useObjectUrl } from '../lib/hooks';
import { prepareImage } from '../lib/image';
import { buttonClass } from './ui';

interface ImagePickerProps {
  value: Blob | null;
  onChange: (image: Blob | null) => void;
}

/** Picks a single image by file chooser, drag and drop, or pasting from the clipboard. */
export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const preview = useObjectUrl(value);

  const accept = useCallback(
    async (file: Blob) => {
      setError(null);
      setBusy(true);
      try {
        onChange(await prepareImage(file));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không dùng được hình ảnh này.');
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  // Paste an image anywhere on the page. Pasting text into a field still works normally.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (!file) return;
      const target = event.target instanceof Element ? event.target : null;
      const inTextField = target?.closest('input, textarea, [contenteditable="true"]');
      if (inTextField && event.clipboardData?.getData('text/plain')) return;
      event.preventDefault();
      void accept(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [accept]);

  const choose = () => fileInput.current?.click();

  return (
    <div
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) void accept(file);
      }}
    >
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Chọn hình ảnh"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void accept(file);
        }}
      />
      {value && preview ? (
        <div className={cn('rounded-2xl border border-line bg-sunken p-3 transition', dragging && 'ring-3 ring-accent/30')}>
          <img src={preview} alt="Ảnh đã chọn" className="mx-auto max-h-52 rounded-xl object-contain" />
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" onClick={choose} disabled={busy} className={buttonClass('secondary', 'sm')}>
              <RefreshCw /> Đổi ảnh
            </button>
            <button type="button" onClick={() => onChange(null)} disabled={busy} className={buttonClass('danger', 'sm')}>
              <Trash2 /> Xóa ảnh
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={choose}
          disabled={busy}
          className={cn(
            'flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 text-center transition',
            dragging ? 'border-accent bg-accent-soft/60' : 'border-line bg-sunken/50 hover:border-accent/50 hover:bg-accent-soft/30',
          )}
        >
          <ImagePlus className="size-7 text-faint" />
          <span className="text-sm font-medium text-ink">{busy ? 'Đang xử lý…' : 'Thêm hình ảnh'}</span>
          <span className="text-xs text-muted">Nhấn để chọn, kéo thả tệp vào đây hoặc dán ảnh</span>
        </button>
      )}
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
