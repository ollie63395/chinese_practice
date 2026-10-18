import type { Word } from '../db/types';

let next = 0;

/** A word for tests, with sensible defaults. */
export function makeWord(overrides: Partial<Word> = {}): Word {
  next += 1;
  return {
    id: `word-${next}`,
    word: '吃',
    reading: 'chī',
    meaning: 'ăn',
    tags: [],
    createdAt: next,
    updatedAt: next,
    ...overrides,
  };
}
