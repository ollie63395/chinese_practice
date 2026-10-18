import { db } from '../db/db';
import type { PracticeLog, PracticeWord, StoredImage, Word } from '../db/types';
import { isRecord, stringArray } from './prefs';

const APP_ID = 'cihui';
const FORMAT_VERSION = 1;

interface BackupFile {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  words: Word[];
  images: { id: string; type: string; data: string }[];
  practices: PracticeLog[];
}

export interface BackupContents {
  words: Word[];
  images: StoredImage[];
  practices: PracticeLog[];
}

export async function createBackup(): Promise<Blob> {
  const [words, images, practices] = await db.transaction('r', db.words, db.images, db.practices, () =>
    Promise.all([db.words.toArray(), db.images.toArray(), db.practices.toArray()]),
  );
  const file: BackupFile = {
    app: APP_ID,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    words,
    images: await Promise.all(
      images.map(async (img) => ({ id: img.id, type: img.blob.type, data: await blobToBase64(img.blob) })),
    ),
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
  const images = (Array.isArray(json.images) ? json.images : []).flatMap((raw): StoredImage[] =>
    isRecord(raw) && typeof raw.id === 'string' && typeof raw.data === 'string' && typeof raw.type === 'string'
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
 * Merges a backup into the database: everything in the file is added,
 * and anything with the same id is replaced by the version from the file.
 */
export async function restoreBackup(contents: BackupContents): Promise<void> {
  await db.transaction('rw', db.words, db.images, db.practices, async () => {
    await db.images.bulkPut(contents.images);
    await db.words.bulkPut(contents.words);
    await db.practices.bulkPut(contents.practices);
    // A restored word may point at an older image than the one stored here; drop the orphans.
    const inUse = new Set((await db.words.toArray()).map((w) => w.imageId));
    const imageIds = await db.images.toCollection().primaryKeys();
    await db.images.bulkDelete(imageIds.filter((id) => !inUse.has(id)));
  });
}

function parseWord(raw: unknown): Word | null {
  if (!isRecord(raw)) return null;
  const { id, word, reading, meaning } = raw;
  if (typeof id !== 'string' || typeof word !== 'string' || typeof reading !== 'string' || typeof meaning !== 'string') {
    return null;
  }
  const now = Date.now();
  return {
    id,
    word,
    reading,
    meaning,
    tags: stringArray(raw.tags),
    ...(typeof raw.imageId === 'string' ? { imageId: raw.imageId } : {}),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  };
}

function parsePractice(raw: unknown): PracticeLog | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.startedAt !== 'number' || !Array.isArray(raw.words)) {
    return null;
  }
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
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  return {
    id: raw.id,
    startedAt: raw.startedAt,
    endedAt: num(raw.endedAt, raw.startedAt),
    timeLimitSec: num(raw.timeLimitSec, 0),
    spokenSec: num(raw.spokenSec, 0),
    endedEarly: raw.endedEarly === true,
    words,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  };
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
