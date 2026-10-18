import Dexie, { type EntityTable } from 'dexie';
import type { PracticeLog, StoredImage, Word } from './types';

export const db = new Dexie('cihui') as Dexie & {
  words: EntityTable<Word, 'id'>;
  images: EntityTable<StoredImage, 'id'>;
  practices: EntityTable<PracticeLog, 'id'>;
};

db.version(1).stores({
  words: 'id, word, createdAt, *tags',
  // Images live in their own table so listing words never has to load image data.
  images: 'id',
  practices: 'id, startedAt',
});
