import { describe, expect, it } from 'vitest';
import { fold, foldPinyin, matchesSearch } from './search';
import { makeWord } from './testWords';

const nihao = makeWord({ word: '你好', reading: 'nǐ hǎo', meaning: 'xin chào', tags: ['chào hỏi'] });
const chi = makeWord({ word: '吃', reading: 'chī', meaning: 'ăn', tags: ['động từ'] });
const xuexiao = makeWord({ word: '学校', reading: 'xuéxiào', meaning: 'trường học' });
const lv = makeWord({ word: '绿', reading: 'lǜ', meaning: 'màu xanh lá' });
const xian = makeWord({ word: '西安', reading: "Xī'ān", meaning: 'Tây An' });

describe('fold', () => {
  it.each([
    ['Trường học', 'truong hoc'],
    ['ĐI ĐƯỜNG', 'di duong'],
    ['ệ ở ữ', 'e o u'],
    ['nǐ hǎo', 'ni hao'],
    ['lǜ', 'lu'],
    ['学校', '学校'],
  ])('%s → %s', (text, expected) => {
    expect(fold(text)).toBe(expected);
  });
});

describe('foldPinyin', () => {
  it.each([
    ['nǐ hǎo', 'nihao'],
    ['ni3 hao3', 'nihao'],
    ['Nǐhǎo', 'nihao'],
    ["Xī'ān", 'xian'],
    ['lǜ', 'lu'],
    ['lv4', 'lu'],
    ['nu:3', 'nu'],
    ['学校', ''],
  ])('%s → %s', (text, expected) => {
    expect(foldPinyin(text)).toBe(expected);
  });
});

describe('matchesSearch', () => {
  it('matches everything for an empty query', () => {
    expect(matchesSearch(nihao, '  ')).toBe(true);
  });

  it.each(['你好', '你', 'nihao', 'ni3hao3', 'ni3 hao3', 'nǐ hǎo', 'NǏ HǍO', 'hao', 'xin chào', 'xin chao', 'chao hoi'])(
    'finds 你好 by “%s”',
    (query) => {
      expect(matchesSearch(nihao, query)).toBe(true);
    },
  );

  it('matches Vietnamese with or without diacritics', () => {
    expect(matchesSearch(chi, 'an')).toBe(true);
    expect(matchesSearch(chi, 'ăn')).toBe(true);
    expect(matchesSearch(xuexiao, 'truong hoc')).toBe(true);
    expect(matchesSearch(xuexiao, 'Trường')).toBe(true);
    expect(matchesSearch(chi, 'dong tu')).toBe(true);
  });

  it('matches pinyin with or without tones, and v for ü', () => {
    expect(matchesSearch(xuexiao, 'xuexiao')).toBe(true);
    expect(matchesSearch(xuexiao, 'xue2xiao4')).toBe(true);
    expect(matchesSearch(lv, 'lv')).toBe(true);
    expect(matchesSearch(lv, 'lü')).toBe(true);
    expect(matchesSearch(xian, 'xian')).toBe(true);
    expect(matchesSearch(xian, "xi'an")).toBe(true);
  });

  it('does not match unrelated words', () => {
    expect(matchesSearch(nihao, 'chi')).toBe(false);
    expect(matchesSearch(chi, '你')).toBe(false);
    // Characters must never fall through to an empty pinyin query that matches everything.
    expect(matchesSearch(xuexiao, '猫')).toBe(false);
    expect(matchesSearch(xuexiao, '?')).toBe(false);
  });
});
