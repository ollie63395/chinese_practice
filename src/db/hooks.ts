import { useMemo } from 'react';
import { countTags } from '../lib/tags';
import { useAccount } from './auth';
import { fetchPractice, fetchPractices } from './practices';
import { fetchAccountSummaries, fetchProfile } from './profiles';
import { useQuery } from './store';
import type { Word } from './types';
import { fetchWords } from './words';

// Cache keys start with the owner's id, so a change to one account reloads only what shows it.

/** An account's words (the signed-in one's by default), newest first. `undefined` while loading. */
export function useWords(ownerId?: string): Word[] | undefined {
  const owner = useOwner(ownerId);
  return useQuery(`${owner}/words`, () => fetchWords(owner));
}

/** An account's practice logs (the signed-in one's by default), newest first. `undefined` while loading. */
export function usePractices(ownerId?: string) {
  const owner = useOwner(ownerId);
  return useQuery(`${owner}/practices`, () => fetchPractices(owner));
}

/** One practice log: `undefined` while loading, `null` if there's no such log. */
export function usePractice(ownerId: string, id: string) {
  return useQuery(`${ownerId}/practice/${id}`, () => fetchPractice(ownerId, id));
}

/** `undefined` while loading, `null` if there's no such account (or it can't be seen). */
export function useProfile(id: string) {
  return useQuery(`${id}/profile`, () => fetchProfile(id));
}

/** Every account with its totals. Only teachers see anyone but themselves. */
export function useAccountSummaries() {
  return useQuery('accounts', fetchAccountSummaries);
}

export function useTagCounts(words: Word[] | undefined) {
  return useMemo(() => countTags(words ?? []), [words]);
}

function useOwner(ownerId: string | undefined): string {
  const me = useAccount().id;
  return ownerId ?? me;
}
