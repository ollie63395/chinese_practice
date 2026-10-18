import type { Word } from '../db/types';

/**
 * Text for loose comparison: lowercase, without accents or tone marks. "Trường học" → "truong hoc",
 * "lǜ" → "lu". đ is a letter of its own rather than d with a mark, so it's mapped by hand.
 */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd');
}

/**
 * Pinyin for loose comparison: no tones, spaces, apostrophes or tone numbers, and v or u: for ü.
 * "Nǐ hǎo", "ni3 hao3" and "nihao" all give "nihao".
 */
export function foldPinyin(text: string): string {
  return fold(text)
    .replace(/u:/g, 'u')
    .replace(/v/g, 'u')
    .replace(/[^a-z]/g, '');
}

/** Matches a word by its characters, pinyin (with or without tones), meaning or tag, with or without accents. */
export function matchesSearch(word: Word, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  if (fold(word.word).includes(q) || fold(word.meaning).includes(q) || word.tags.some((t) => fold(t).includes(q))) {
    return true;
  }
  const pinyin = foldPinyin(query);
  return pinyin !== '' && foldPinyin(word.reading).includes(pinyin);
}
