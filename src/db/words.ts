import { uid } from '../lib/id';
import { db } from './db';
import type { Word } from './types';

export interface WordDraft {
  word: string;
  reading: string;
  meaning: string;
  tags: string[];
  /** A new image to store, `null` to remove the current one, or `undefined` to leave it as is. */
  image?: Blob | null;
}

/** Creates a word, or updates the word with the given id. */
export async function saveWord(draft: WordDraft, id?: string): Promise<Word> {
  return db.transaction('rw', db.words, db.images, async () => {
    const existing = id ? await db.words.get(id) : undefined;
    const now = Date.now();
    let imageId = existing?.imageId;

    if (draft.image !== undefined) {
      if (imageId) await db.images.delete(imageId);
      imageId = undefined;
      if (draft.image) {
        imageId = uid();
        await db.images.add({ id: imageId, blob: draft.image });
      }
    }

    const word: Word = {
      id: id ?? uid(),
      word: draft.word,
      reading: draft.reading,
      meaning: draft.meaning,
      tags: draft.tags,
      ...(imageId ? { imageId } : {}),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await db.words.put(word);
    return word;
  });
}

export async function deleteWord(id: string): Promise<void> {
  await db.transaction('rw', db.words, db.images, async () => {
    const existing = await db.words.get(id);
    if (!existing) return;
    if (existing.imageId) await db.images.delete(existing.imageId);
    await db.words.delete(id);
  });
}
