import type { Word } from '../db/types';

/**
 * Words saved this close together can only be one import: nobody adds words by hand that fast.
 * Tight on purpose. A big gap deleted from an import only splits it in two, which is easy to see,
 * while a word wrongly counted as part of one could get deleted with it.
 */
const SAME_IMPORT_MS = 100;

export interface WordBatch {
  /** When it was imported. */
  time: number;
  words: Word[];
}

/**
 * The lists of words imported in one go, newest first. Nothing marks them as such, but an import
 * saves its words a millisecond apart (see importWords), so they can be told by their times, even
 * after some of them have been deleted.
 */
export function importBatches(words: readonly Word[]): WordBatch[] {
  const newestFirst = words.slice().sort((a, b) => b.createdAt - a.createdAt);
  const runs: Word[][] = [];
  for (const word of newestFirst) {
    const run = runs.at(-1);
    if (run && run[run.length - 1].createdAt - word.createdAt <= SAME_IMPORT_MS) run.push(word);
    else runs.push([word]);
  }
  return runs.filter((run) => run.length > 1).map((run) => ({ time: run[0].createdAt, words: run }));
}
