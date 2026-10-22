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

/** Words to add and words to change, from a spreadsheet. */
export interface WordImport {
  /** In the order they should be listed: the first one counts as the newest. */
  add: { word: string; reading: string; meaning: string; tags: string[] }[];
  /** Words already in the bank, with their new meaning and tags. */
  update: { previous: Word; meaning: string; tags: string[] }[];
}

/** What an import did, so it can be undone. */
export interface ImportReceipt {
  addedIds: string[];
  /** The changed words as they were before. */
  previous: Word[];
}

const CHUNK = 500;

function toRow(word: Word, ownerId: string) {
  return {
    owner_id: ownerId,
    id: word.id,
    word: word.word,
    reading: word.reading,
    meaning: word.meaning,
    tags: word.tags,
    image_path: word.imagePath ?? null,
    created_at: new Date(word.createdAt).toISOString(),
    updated_at: new Date(word.updatedAt).toISOString(),
  };
}

/** Adds and changes many of the signed-in account's words at once. */
export async function importWords({ add, update }: WordImport): Promise<ImportReceipt> {
  const owner = await myId();
  const now = Date.now();
  const newRows = add.map((word, i) => ({
    ...word,
    owner_id: owner,
    id: uid(),
    // A millisecond apart, so the list (newest first) keeps the spreadsheet's order.
    created_at: new Date(now - i).toISOString(),
    updated_at: new Date(now).toISOString(),
  }));
  const changedRows = update.map(({ previous, meaning, tags }) => ({
    ...toRow(previous, owner),
    meaning,
    tags,
    updated_at: new Date(now).toISOString(),
  }));
  const receipt: ImportReceipt = { addedIds: [], previous: [] };
  try {
    for (let i = 0; i < newRows.length; i += CHUNK) {
      const chunk = newRows.slice(i, i + CHUNK);
      check(await supabase.from('words').insert(chunk));
      receipt.addedIds.push(...chunk.map((row) => row.id));
    }
    for (let i = 0; i < changedRows.length; i += CHUNK) {
      check(await supabase.from('words').upsert(changedRows.slice(i, i + CHUNK), { onConflict: 'owner_id,id' }));
      receipt.previous.push(...update.slice(i, i + CHUNK).map((u) => u.previous));
    }
  } catch (err) {
    const saved = receipt.addedIds.length + receipt.previous.length;
    if (saved === 0 || !(err instanceof Error)) throw err;
    throw new Error(
      `Đã lưu ${saved}/${add.length + update.length} từ thì gặp lỗi: ${err.message} Hãy nhập lại cùng tệp đó: những từ đã lưu sẽ được bỏ qua.`,
      { cause: err },
    );
  } finally {
    changed(owner);
  }
  return receipt;
}

/** Puts things back as they were before an import. */
export async function undoImport({ addedIds, previous }: ImportReceipt): Promise<void> {
  const owner = await myId();
  try {
    // The ids go in the request's address, so fewer at a time.
    for (let i = 0; i < addedIds.length; i += 100) {
      const deleted = check(
        await supabase
          .from('words')
          .delete()
          .eq('owner_id', owner)
          .in('id', addedIds.slice(i, i + 100))
          .select('image_path'),
      );
      // A picture may have been added since.
      await removeImages(deleted.flatMap((row) => (row.image_path ? [row.image_path] : [])));
    }
    const rows = previous.map((word) => toRow(word, owner));
    for (let i = 0; i < rows.length; i += CHUNK) {
      check(await supabase.from('words').upsert(rows.slice(i, i + CHUNK), { onConflict: 'owner_id,id' }));
    }
  } finally {
    changed(owner);
  }
}

export async function deleteWord(id: string): Promise<void> {
  const owner = await myId();
  const deleted = check(await supabase.from('words').delete().eq('owner_id', owner).eq('id', id).select('image_path'));
  await removeImages(deleted.flatMap((row) => (row.image_path ? [row.image_path] : [])));
  changed(owner);
}
