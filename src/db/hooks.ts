import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { countTags } from '../lib/tags';
import { db } from './db';
import type { Word } from './types';

/** All words, newest first. `undefined` while loading. */
export function useWords(): Word[] | undefined {
  return useLiveQuery(() => db.words.orderBy('createdAt').reverse().toArray(), []);
}

/** All practice logs, newest first. `undefined` while loading. */
export function usePractices() {
  return useLiveQuery(() => db.practices.orderBy('startedAt').reverse().toArray(), []);
}

export function useTagCounts(words: Word[] | undefined) {
  return useMemo(() => countTags(words ?? []), [words]);
}
