import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseBackup, restoreBackup } from '../lib/backup';
import { db } from './db';
import { deleteWord, saveWord } from './words';

const png = (label: string) => new Blob([label], { type: 'image/png' });
const draft = { word: '猫', reading: 'māo', meaning: 'mèo', tags: ['động vật'] };

beforeEach(async () => {
  await Promise.all([db.words.clear(), db.images.clear(), db.practices.clear()]);
});

describe('saveWord', () => {
  it('creates a word with timestamps', async () => {
    const word = await saveWord(draft);
    expect(await db.words.get(word.id)).toMatchObject({ ...draft, id: word.id });
    expect(word.createdAt).toBeGreaterThan(0);
    expect(word.imageId).toBeUndefined();
  });

  it('keeps the creation time when updating', async () => {
    const created = await saveWord(draft);
    const updated = await saveWord({ ...draft, meaning: 'con mèo' }, created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect((await db.words.get(created.id))?.meaning).toBe('con mèo');
  });

  it('stores, keeps, replaces and removes the image', async () => {
    const created = await saveWord({ ...draft, image: png('first') });
    const firstImageId = created.imageId!;
    expect(await (await db.images.get(firstImageId))!.blob.text()).toBe('first');

    // `image: undefined` leaves the picture alone.
    const kept = await saveWord({ ...draft, meaning: 'mèo con' }, created.id);
    expect(kept.imageId).toBe(firstImageId);

    const replaced = await saveWord({ ...draft, image: png('second') }, created.id);
    expect(replaced.imageId).not.toBe(firstImageId);
    expect(await db.images.get(firstImageId)).toBeUndefined();
    expect(await db.images.count()).toBe(1);

    const removed = await saveWord({ ...draft, image: null }, created.id);
    expect(removed.imageId).toBeUndefined();
    expect(await db.images.count()).toBe(0);
  });
});

describe('deleteWord', () => {
  it('removes the word and its image', async () => {
    const word = await saveWord({ ...draft, image: png('cat') });
    await deleteWord(word.id);
    expect(await db.words.count()).toBe(0);
    expect(await db.images.count()).toBe(0);
  });
});

describe('restoreBackup', () => {
  it('merges the backup in and drops images nothing points at any more', async () => {
    const local = await saveWord({ ...draft, image: png('new picture') });
    const backup = parseBackup({
      app: 'cihui',
      version: 1,
      // The backup has an older version of the same word, with a different picture, plus a new word.
      words: [
        { ...draft, id: local.id, imageId: 'old-image', createdAt: 1, updatedAt: 1 },
        { id: 'dog', word: '狗', reading: 'gǒu', meaning: 'chó', tags: [], createdAt: 2, updatedAt: 2 },
      ],
      images: [{ id: 'old-image', type: 'image/png', data: btoa('old picture') }],
      practices: [],
    });

    await restoreBackup(backup);

    expect(await db.words.count()).toBe(2);
    expect((await db.words.get(local.id))?.imageId).toBe('old-image');
    expect(await db.images.toCollection().primaryKeys()).toEqual(['old-image']);
  });
});
