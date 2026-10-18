import { describe, expect, it } from 'vitest';
import { pickRandom, sample, shuffle } from './random';

describe('shuffle', () => {
  it('returns the same items in a new array without touching the original', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle(items);
    expect(result).not.toBe(items);
    expect([...result].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('sample', () => {
  it('picks the requested number of distinct items', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    for (let run = 0; run < 50; run++) {
      const picked = sample(items, 5);
      expect(picked).toHaveLength(5);
      expect(new Set(picked).size).toBe(5);
      for (const item of picked) expect(items).toContain(item);
    }
  });

  it('returns everything when asked for more than there is', () => {
    expect(sample([1, 2, 3], 10)).toHaveLength(3);
  });

  it('eventually picks every item', () => {
    const seen = new Set<number>();
    for (let run = 0; run < 200; run++) sample([1, 2, 3, 4, 5], 1).forEach((n) => seen.add(n));
    expect(seen.size).toBe(5);
  });
});

describe('pickRandom', () => {
  it('returns undefined for an empty list', () => {
    expect(pickRandom([])).toBeUndefined();
  });
});
