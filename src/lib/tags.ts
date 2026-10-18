import type { Word } from '../db/types';

export function cleanTag(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Splits typed or pasted text on commas, including the Chinese 、 and full-width ，. */
export function splitTags(raw: string): string[] {
  return raw.split(/[,、，]/);
}

/**
 * Adds a tag unless it's blank or already present (ignoring case).
 * If the tag already exists on other words, their spelling is reused.
 */
export function addTag(tags: string[], raw: string, known: readonly string[] = []): string[] {
  const tag = cleanTag(raw);
  if (!tag) return tags;
  const key = tag.toLowerCase();
  if (tags.some((t) => t.toLowerCase() === key)) return tags;
  return [...tags, known.find((t) => t.toLowerCase() === key) ?? tag];
}

export interface TagCount {
  tag: string;
  count: number;
}

export function countTags(words: readonly Word[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const word of words) {
    for (const tag of word.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, 'vi'));
}

/** Words that carry at least one of the given tags. */
export function wordsWithAnyTag(words: readonly Word[], tags: readonly string[]): Word[] {
  const wanted = new Set(tags);
  return words.filter((w) => w.tags.some((t) => wanted.has(t)));
}
