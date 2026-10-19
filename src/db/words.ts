import { uid } from '../lib/id';
import { check, myId, supabase } from '../lib/supabase';
import type { Database } from './database.types';
import { removeImages, uploadImage } from './images';
import { changed } from './store';
import type { Word } from './types';

type WordRow = Database['public']['Tables']['words']['Row'];

export function toWord(row: WordRow): Word {
  return {
    id: row.id,
    word: row.word,
    reading: row.reading,
    meaning: row.meaning,
    tags: row.tags,
    ...(row.image_path ? { imagePath: row.image_path } : {}),
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

/** All of an account's words, newest first. */
export async function fetchWords(ownerId: string): Promise<Word[]> {
  const rows = check(
    await supabase.from('words').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
  );
  return rows.map(toWord);
}

export async function fetchWord(ownerId: string, id: string): Promise<Word | null> {
  const row = check(await supabase.from('words').select('*').eq('owner_id', ownerId).eq('id', id).maybeSingle());
  return row && toWord(row);
}

export interface WordDraft {
  word: string;
  reading: string;
  meaning: string;
  tags: string[];
  /** A new image to store, `null` to remove the current one, or `undefined` to leave it as is. */
  image?: Blob | null;
}

/** Creates a word, or updates the signed-in account's word with the given id. */
export async function saveWord(draft: WordDraft, id?: string): Promise<Word> {
  const owner = await myId();
  const now = new Date().toISOString();
  const previousImage = id && draft.image !== undefined ? (await fetchWord(owner, id))?.imagePath : undefined;
  // The new picture goes up first, so the word never points at one that isn't there.
  const imagePath = draft.image ? await uploadImage(owner, draft.image) : draft.image;

  const fields = {
    word: draft.word,
    reading: draft.reading,
    meaning: draft.meaning,
    tags: draft.tags,
    updated_at: now,
    ...(imagePath !== undefined ? { image_path: imagePath } : {}),
  };
  const result = id
    ? await supabase.from('words').update(fields).eq('owner_id', owner).eq('id', id).select().single()
    : await supabase
        .from('words')
        .insert({ ...fields, id: uid(), owner_id: owner, created_at: now })
        .select()
        .single();
  if (result.error && imagePath) await removeImages([imagePath]);
  const row = check(result);

  if (previousImage && previousImage !== imagePath) await removeImages([previousImage]);
  changed(owner);
  return toWord(row);
}

export async function deleteWord(id: string): Promise<void> {
  const owner = await myId();
  const deleted = check(await supabase.from('words').delete().eq('owner_id', owner).eq('id', id).select('image_path'));
  await removeImages(deleted.flatMap((row) => (row.image_path ? [row.image_path] : [])));
  changed(owner);
}
