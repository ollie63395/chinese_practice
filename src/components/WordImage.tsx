import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { cn } from '../lib/cn';
import { useObjectUrl } from '../lib/hooks';

interface WordImageProps {
  imageId: string | undefined;
  alt: string;
  className?: string;
}

/** A word's picture, loaded from IndexedDB on demand. Renders nothing for words without one. */
export function WordImage({ imageId, alt, className }: WordImageProps) {
  const record = useLiveQuery(() => (imageId ? db.images.get(imageId) : undefined), [imageId]);
  const url = useObjectUrl(record?.blob);
  if (!imageId) return null;
  if (!url) return <div className={cn(className, 'bg-sunken')} aria-hidden />;
  return <img src={url} alt={alt} className={className} draggable={false} />;
}
