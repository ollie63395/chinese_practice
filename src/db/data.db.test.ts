// The app's data functions against local Supabase (`npm run test:db`), signed in as a fresh account.
import { beforeAll, describe, expect, it } from 'vitest';
import { createBackup, parseBackup, readBackup, restoreBackup } from '../lib/backup';
import { supabase } from '../lib/supabase';
import { listImages, loadImage } from './images';
import { addPractice, fetchPractices } from './practices';
import { deleteWord, fetchWord, fetchWords, saveWord } from './words';

const png = (label: string) => new Blob([label], { type: 'image/png' });
const draft = { word: '猫', reading: 'māo', meaning: 'mèo', tags: ['động vật'] };

async function signUpFresh(): Promise<string> {
  const email = `data-${Math.random().toString(36).slice(2, 10)}@example.com`;
  const { data, error } = await supabase.auth.signUp({ email, password: 'mat-khau-1', options: { data: { display_name: 'Thử' } } });
  if (error) throw error;
  return data.user!.id;
}

let me: string;

beforeAll(async () => {
  me = await signUpFresh();
});

describe('saveWord', () => {
  it('creates a word with timestamps', async () => {
    const word = await saveWord(draft);
    expect(await fetchWord(me, word.id)).toMatchObject({ ...draft, id: word.id });
    expect(word.createdAt).toBeGreaterThan(0);
    expect(word.imagePath).toBeUndefined();
  });

  it('keeps the creation time when updating', async () => {
    const created = await saveWord(draft);
    const updated = await saveWord({ ...draft, meaning: 'con mèo' }, created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect((await fetchWord(me, created.id))?.meaning).toBe('con mèo');
  });

  it('stores, keeps, replaces and removes the picture', async () => {
    const created = await saveWord({ ...draft, image: png('first') });
    const firstPath = created.imagePath!;
    expect(firstPath.startsWith(`${me}/`)).toBe(true);
    expect(await (await loadImage(firstPath)).text()).toBe('first');

    // `image: undefined` leaves the picture alone.
    const kept = await saveWord({ ...draft, meaning: 'mèo con' }, created.id);
    expect(kept.imagePath).toBe(firstPath);

    const replaced = await saveWord({ ...draft, image: png('second') }, created.id);
    expect(replaced.imagePath).not.toBe(firstPath);
    expect(await listImages(me)).not.toContain(firstPath);
    expect(await listImages(me)).toContain(replaced.imagePath);

    const removed = await saveWord({ ...draft, image: null }, created.id);
    expect(removed.imagePath).toBeUndefined();
    expect(await listImages(me)).not.toContain(replaced.imagePath);
  });
});

describe('deleteWord', () => {
  it('removes the word and its picture', async () => {
    const word = await saveWord({ ...draft, image: png('cat') });
    await deleteWord(word.id);
    expect(await fetchWord(me, word.id)).toBeNull();
    expect(await listImages(me)).not.toContain(word.imagePath);
  });
});

describe('backups', () => {
  it('restore merges the backup in and drops pictures nothing points at any more', async () => {
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

    expect((await fetchWord(me, local.id))?.imagePath).toBe(`${me}/old-image`);
    expect(await fetchWord(me, 'dog')).toMatchObject({ word: '狗' });
    expect(await listImages(me)).not.toContain(local.imagePath);
    expect(await (await loadImage(`${me}/old-image`)).text()).toBe('old picture');
  });

  it('round-trips everything, pictures included, into another account', async () => {
    await addPractice({
      startedAt: Date.now(),
      endedAt: Date.now(),
      timeLimitSec: 60,
      spokenSec: 42,
      endedEarly: true,
      notes: 'Kể về 猫',
      words: [{ id: 'dog', word: '狗', reading: 'gǒu', meaning: 'chó', used: true }],
    });
    const words = await fetchWords(me);
    const practices = await fetchPractices(me);
    const file = await readBackup(await createBackup());
    expect(file.words).toHaveLength(words.length);
    expect(file.images).toHaveLength(words.filter((w) => w.imagePath).length);

    const other = await signUpFresh();
    await restoreBackup(file);
    const restored = await fetchWords(other);
    expect(restored.map((w) => w.id).sort()).toEqual(words.map((w) => w.id).sort());
    const withPicture = restored.find((w) => w.imagePath)!;
    expect(withPicture.imagePath!.startsWith(`${other}/`)).toBe(true);
    expect((await loadImage(withPicture.imagePath!)).size).toBeGreaterThan(0);
    expect(await fetchPractices(other)).toEqual(practices);
  });
});
