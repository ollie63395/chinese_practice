import { listImages, loadImage, removeImages, uploadImage } from '../db/images';
import { fetchPractices, toPracticeRow } from '../db/practices';
import { changed } from '../db/store';
import type { PracticeLog, PracticeWord, Word } from '../db/types';
import { fetchWords } from '../db/words';
import { isRecord, stringArray } from './prefs';
import { check, myId, supabase } from './supabase';

const APP_ID = 'cihui';
const FORMAT_VERSION = 1;

/** A word as written in a backup file: its picture is named by id, without the account's folder. */
export type BackupWord = Omit<Word, 'imagePath'> & { imageId?: string };

interface BackupFile {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  words: BackupWord[];
  images: { id: string; type: string; data: string }[];
  practices: PracticeLog[];
}

export interface BackupContents {
  words: BackupWord[];
  images: { id: string; blob: Blob }[];
  practices: PracticeLog[];
}

/** Picture ids become part of a storage path, so only plain ones are accepted. */
const IMAGE_ID = /^[\w-]{1,100}$/;

const imageIdOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** Everything in the signed-in account, pictures included, as one file. */
export async function createBackup(): Promise<Blob> {
  const owner = await myId();
  const [words, practices] = await Promise.all([fetchWords(owner), fetchPractices(owner)]);
  const images = await Promise.all(
    words.flatMap((word) =>
      word.imagePath
        ? [
            loadImage(word.imagePath).then(async (blob) => ({
              id: imageIdOf(word.imagePath!),
              type: blob.type,
              data: await blobToBase64(blob),
            })),
          ]
        : [],
    ),
  );
  const file: BackupFile = {
    app: APP_ID,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    words: words.map(({ imagePath, ...word }) => ({ ...word, ...(imagePath ? { imageId: imageIdOf(imagePath) } : {}) })),
    images,
    practices,
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `cihui-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/** Reads and validates a backup file. Entries that don't look right are skipped. */
export async function readBackup(file: Blob): Promise<BackupContents> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new Error('Tệp này không phải bản sao lưu của Cíhuì (không phải JSON hợp lệ).');
  }
  return parseBackup(json);
}

export function parseBackup(json: unknown): BackupContents {
  if (!isRecord(json) || json.app !== APP_ID || !Array.isArray(json.words)) {
    throw new Error('Tệp này không phải bản sao lưu của Cíhuì.');
  }
  if (typeof json.version === 'number' && json.version > FORMAT_VERSION) {
    throw new Error('Bản sao lưu này được tạo bởi phiên bản Cíhuì mới hơn.');
  }
  const images = (Array.isArray(json.images) ? json.images : []).flatMap((raw) =>
    isRecord(raw) &&
    typeof raw.id === 'string' &&
    IMAGE_ID.test(raw.id) &&
    typeof raw.data === 'string' &&
    typeof raw.type === 'string'
      ? [{ id: raw.id, blob: base64ToBlob(raw.data, raw.type) }]
      : [],
  );
  const imageIds = new Set(images.map((img) => img.id));
  return {
    words: json.words.flatMap((raw) => {
      const word = parseWord(raw);
      if (!word) return [];
      // Drop references to images that aren't in the file.
      if (word.imageId && !imageIds.has(word.imageId)) delete word.imageId;
      return [word];
    }),
    images,
    practices: (Array.isArray(json.practices) ? json.practices : []).flatMap((raw) => {
      const log = parsePractice(raw);
      return log ? [log] : [];
    }),
  };
}

/**
 * Merges a backup into the signed-in account: everything in the file is added,
 * and anything with the same id is replaced by the version from the file.
 */
export async function restoreBackup(contents: BackupContents): Promise<void> {
  const owner = await myId();
  // Pictures first, so no word ever points at a picture that isn't there.
  for (let i = 0; i < contents.images.length; i += 4) {
    await Promise.all(contents.images.slice(i, i + 4).map((img) => uploadImage(owner, img.blob, img.id)));
  }
  const wordRows = contents.words.map((word) => ({
    owner_id: owner,
    id: word.id,
    word: word.word,
    reading: word.reading,
    meaning: word.meaning,
    tags: word.tags,
    image_path: word.imageId ? `${owner}/${word.imageId}` : null,
    created_at: new Date(word.createdAt).toISOString(),
    updated_at: new Date(word.updatedAt).toISOString(),
  }));
  const practiceRows = contents.practices.map((log) => toPracticeRow(log, owner));
  try {
    for (let i = 0; i < wordRows.length; i += 500) {
      check(await supabase.from('words').upsert(wordRows.slice(i, i + 500), { onConflict: 'owner_id,id' }));
    }
    for (let i = 0; i < practiceRows.length; i += 500) {
      check(await supabase.from('practices').upsert(practiceRows.slice(i, i + 500), { onConflict: 'owner_id,id' }));
    }
    // A restored word may point at an older picture than the one stored here; drop the orphans.
    const inUse = new Set((await fetchWords(owner)).map((w) => w.imagePath));
    await removeImages((await listImages(owner)).filter((path) => !inUse.has(path)));
  } finally {
    changed(owner);
  }
}

function parseWord(raw: unknown): BackupWord | null {
  if (!isRecord(raw)) return null;
  const { id, word, reading, meaning } = raw;
  if (typeof id !== 'string' || typeof word !== 'string' || typeof reading !== 'string' || typeof meaning !== 'string') {
    return null;
  }
  if (!id || id.length > 100 || !word || !reading || !meaning) return null;
  const now = Date.now();
  return {
    id,
    word,
    reading,
    meaning,
    tags: stringArray(raw.tags),
    ...(typeof raw.imageId === 'string' ? { imageId: raw.imageId } : {}),
    createdAt: validTime(raw.createdAt) ?? now,
    updatedAt: validTime(raw.updatedAt) ?? now,
  };
}

function parsePractice(raw: unknown): PracticeLog | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id || raw.id.length > 100 || !Array.isArray(raw.words)) {
    return null;
  }
  const startedAt = validTime(raw.startedAt);
  if (startedAt === undefined) return null;
  const words = raw.words.flatMap((w): PracticeWord[] =>
    isRecord(w) && typeof w.id === 'string' && typeof w.word === 'string'
      ? [
          {
            id: w.id,
            word: w.word,
            reading: typeof w.reading === 'string' ? w.reading : '',
            meaning: typeof w.meaning === 'string' ? w.meaning : '',
            used: w.used === true,
          },
        ]
      : [],
  );
  const seconds = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  return {
    id: raw.id,
    startedAt,
    endedAt: validTime(raw.endedAt) ?? startedAt,
    timeLimitSec: seconds(raw.timeLimitSec),
    spokenSec: seconds(raw.spokenSec),
    endedEarly: raw.endedEarly === true,
    words,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  };
}

/** A timestamp that can be stored as a date (milliseconds since 1970). */
function validTime(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 8.64e15 ? value : undefined;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}
