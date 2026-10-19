import { uid } from '../lib/id';
import { check, supabase } from '../lib/supabase';

const BUCKET = 'word-images';

/** Downloaded pictures, by path. A path always holds the same picture: replacing one uses a new path. */
const blobs = new Map<string, Promise<Blob>>();

export function loadImage(path: string): Promise<Blob> {
  let blob = blobs.get(path);
  if (!blob) {
    blob = supabase.storage
      .from(BUCKET)
      .download(path)
      .then((result) => check(result));
    blobs.set(path, blob);
    blob.catch(() => blobs.delete(path));
  }
  return blob;
}

/** Stores a picture in the owner's folder and returns its path. */
export async function uploadImage(ownerId: string, blob: Blob, id = uid()): Promise<string> {
  const path = `${ownerId}/${id}`;
  check(await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: true }));
  blobs.set(path, Promise.resolve(blob));
  return path;
}

/** Deletes pictures. Failing to is harmless (they are only unused files), so errors are ignored. */
export async function removeImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  for (const path of paths) blobs.delete(path);
  await supabase.storage.from(BUCKET).remove(paths);
}

/** Every picture in the owner's folder. */
export async function listImages(ownerId: string): Promise<string[]> {
  const paths: string[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const files = check(await supabase.storage.from(BUCKET).list(ownerId, { limit: pageSize, offset }));
    paths.push(...files.map((file) => `${ownerId}/${file.name}`));
    if (files.length < pageSize) return paths;
  }
}
