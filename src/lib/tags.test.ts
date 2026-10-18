import { describe, expect, it } from 'vitest';
import { addTag, countTags, splitTags, wordsWithAnyTag } from './tags';
import { makeWord } from './testWords';

describe('addTag', () => {
  it('cleans up whitespace', () => {
    expect(addTag([], '  HSK   1 ')).toEqual(['HSK 1']);
  });

  it('ignores blank tags', () => {
    expect(addTag(['đồ ăn'], '   ')).toEqual(['đồ ăn']);
  });

  it('ignores a tag the word already has, whatever its case', () => {
    expect(addTag(['Đồ ăn'], 'đồ ăn')).toEqual(['Đồ ăn']);
  });

  it('reuses the spelling of a tag that already exists on other words', () => {
    expect(addTag([], 'động từ', ['Động từ', 'đồ ăn'])).toEqual(['Động từ']);
  });
});

describe('splitTags', () => {
  it('splits on English and Chinese commas', () => {
    expect(splitTags('đồ ăn, động từ、动词，hsk1')).toEqual(['đồ ăn', ' động từ', '动词', 'hsk1']);
  });
});

describe('countTags', () => {
  it('counts words per tag, in Vietnamese alphabetical order', () => {
    const words = [makeWord({ tags: ['động từ', 'đồ ăn'] }), makeWord({ tags: ['đồ ăn'] }), makeWord({ tags: ['con người'] }), makeWord()];
    expect(countTags(words)).toEqual([
      { tag: 'con người', count: 1 },
      { tag: 'đồ ăn', count: 2 },
      { tag: 'động từ', count: 1 },
    ]);
  });
});

describe('wordsWithAnyTag', () => {
  it('includes words with any of the tags', () => {
    const eat = makeWord({ tags: ['động từ', 'đồ ăn'] });
    const rice = makeWord({ tags: ['đồ ăn'] });
    const run = makeWord({ tags: ['động từ'] });
    const hello = makeWord({ tags: ['chào hỏi'] });
    expect(wordsWithAnyTag([eat, rice, run, hello], ['đồ ăn', 'động từ'])).toEqual([eat, rice, run]);
  });

  it('includes nothing when no tags are chosen', () => {
    expect(wordsWithAnyTag([makeWord({ tags: ['đồ ăn'] })], [])).toEqual([]);
  });
});
