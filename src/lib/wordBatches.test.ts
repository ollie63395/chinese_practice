import { describe, expect, it } from 'vitest';
import { makeWord } from './testWords';
import { importBatches } from './wordBatches';

const at = (...times: number[]) => times.map((createdAt) => makeWord({ createdAt }));
const MINUTE = 60_000;

describe('importBatches', () => {
  it('finds words saved a moment apart, and leaves words added by hand out', () => {
    const batches = importBatches(at(10 * MINUTE, 5 * MINUTE, 5 * MINUTE - 1, 5 * MINUTE - 2, MINUTE));
    expect(batches).toHaveLength(1);
    expect(batches[0].time).toBe(5 * MINUTE);
    expect(batches[0].words.map((w) => w.createdAt)).toEqual([5 * MINUTE, 5 * MINUTE - 1, 5 * MINUTE - 2]);
  });

  it('keeps separate imports apart, newest first, whatever order the words come in', () => {
    const batches = importBatches(at(MINUTE, 9 * MINUTE, MINUTE - 1, 9 * MINUTE - 1));
    expect(batches.map((b) => b.time)).toEqual([9 * MINUTE, MINUTE]);
    expect(batches.map((b) => b.words.length)).toEqual([2, 2]);
  });

  it('still sees one import after words in the middle of it were deleted', () => {
    expect(importBatches(at(MINUTE, MINUTE - 30, MINUTE - 90))).toHaveLength(1);
  });

  it('leaves out a word added by hand just before an import', () => {
    const [batch] = importBatches(at(MINUTE, MINUTE - 1, MINUTE - 2, MINUTE - 800));
    expect(batch.words.map((w) => w.createdAt)).toEqual([MINUTE, MINUTE - 1, MINUTE - 2]);
  });

  it('counts words saved at the very same moment as one import', () => {
    expect(importBatches(at(MINUTE, MINUTE))[0].words).toHaveLength(2);
  });

  it('finds nothing in an empty bank or one added by hand', () => {
    expect(importBatches([])).toEqual([]);
    expect(importBatches(at(MINUTE, 2 * MINUTE, 3 * MINUTE))).toEqual([]);
  });

  it('doesn’t change the list it was given', () => {
    const words = at(MINUTE, 2 * MINUTE);
    const order = words.slice();
    importBatches(words);
    expect(words).toEqual(order);
  });
});
