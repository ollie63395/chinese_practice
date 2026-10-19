import { useEffect, useState } from 'react';
import { loadImage } from '../db/images';
import { cn } from '../lib/cn';
import { useObjectUrl } from '../lib/hooks';

interface WordImageProps {
  /** Where the picture is stored; nothing is shown for words without one. */
  path: string | undefined;
  alt: string;
  className?: string;
}

/** A word's picture, downloaded on demand. */
export function WordImage({ path, alt, className }: WordImageProps) {
  const [loaded, setLoaded] = useState<{ path: string; blob: Blob | null }>();
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    loadImage(path).then(
      (blob) => !cancelled && setLoaded({ path, blob }),
      () => !cancelled && setLoaded({ path, blob: null }),
    );
    return () => {
      cancelled = true;
    };
  }, [path]);
  const blob = loaded && loaded.path === path ? loaded.blob : undefined;
  const url = useObjectUrl(blob);
  if (!path || blob === null) return null;
  if (!url) return <div className={cn(className, 'bg-sunken')} aria-hidden />;
  return <img src={url} alt={alt} className={className} draggable={false} />;
}
