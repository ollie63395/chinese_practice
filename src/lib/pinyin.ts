/** Tones 1–4 as combining marks: ā á ǎ à. */
const TONE_MARKS = ['\u0304', '\u0301', '\u030C', '\u0300'];
const ANY_TONE_MARK = /[\u0300\u0301\u0304\u030C]/g;

/** Latin letters (possibly already tone-marked), then a tone number: ni3, hǎo4, xie5. */
const LETTERS_THEN_TONE = /([\p{Script=Latin}\p{M}]+)([0-5])/gu;

/** A pinyin syllable ends with its vowels, then at most n, ng or r. */
const CODAS = ['', 'n', 'ng', 'r'];

const isVowel = (letter: string) => /^[aeiou]/i.test(letter);

/** Which of a syllable's vowels takes the mark: a or e; otherwise the o of ou; otherwise the last one. */
function markIndex(vowels: string): number {
  const ae = vowels.search(/[ae]/);
  if (ae >= 0) return ae;
  const ou = vowels.indexOf('ou');
  return ou >= 0 ? ou : vowels.length - 1;
}

/**
 * Puts a tone mark on the last syllable of a run of letters, replacing any mark it had.
 * Tone 5 (or 0) is the neutral tone: no mark. Returns null if there's no syllable to mark.
 */
function applyTone(letters: string, tone: number): string | null {
  // One entry per letter with its accents, e.g. "ü" is u + ¨ and "ǐ" is i + ˇ.
  const chars = letters.normalize('NFD').match(/\P{M}\p{M}*/gu) ?? [];
  const plain = chars.map((c) => c.replace(ANY_TONE_MARK, ''));
  const mark = tone >= 1 && tone <= 4 ? TONE_MARKS[tone - 1] : '';

  let end = plain.length;
  while (end > 0 && !isVowel(plain[end - 1])) end--;
  let start: number;
  let target: number;

  if (end === 0) {
    // No vowel: only the nasal interjections take a tone (嗯 ńg, 呣 ḿ, 哼 hng).
    if (!/^(h?m|h?n|h?ng)$/i.test(plain.join(''))) return null;
    start = 0;
    end = plain.length;
    target = plain.findIndex((c) => /^[mn]/i.test(c));
  } else {
    if (!CODAS.includes(plain.slice(end).join('').toLowerCase())) return null;
    // The last run of vowels belongs to the last syllable: "nǐhao" → "ao".
    start = end;
    while (start > 0 && isVowel(plain[start - 1])) start--;
    const vowelsFrom = (from: number) =>
      plain
        .slice(from, end)
        .map((c) => c[0].toLowerCase())
        .join('');

    // A vowel that already has a mark ends an earlier syllable (nǚ + er2 → nǚér), unless the
    // mark sits where this syllable's own goes: then the tone is being changed (hǎo + 4 → hào).
    const marked: number[] = [];
    for (let i = start; i < end; i++) if (chars[i] !== plain[i]) marked.push(i);
    if (marked.length > 1) start = marked[marked.length - 2] + 1;
    target = start + markIndex(vowelsFrom(start));
    const lastMarked = marked.at(-1);
    if (lastMarked !== undefined && lastMarked !== target) {
      start = lastMarked + 1;
      if (start === end) return null;
      target = start + markIndex(vowelsFrom(start));
    }
  }

  return chars
    .map((c, i) => (i < start || i >= end ? c : plain[i] + (i === target ? mark : '')))
    .join('')
    .normalize('NFC');
}

function convert(text: string): string {
  return text
    .replace(/u:/g, 'ü')
    .replace(/U:/g, 'Ü')
    .replace(/v/g, 'ü')
    .replace(/V/g, 'Ü')
    .replace(LETTERS_THEN_TONE, (match, letters: string, digit: string) => applyTone(letters, Number(digit)) ?? match)
    .normalize('NFC');
}

/**
 * Turns tone numbers into tone marks while the user is typing (ni3 → nǐ), and v into ü.
 * Text on either side of the caret is converted separately so the caret stays put.
 */
export function convertWhileTyping(value: string, caret: number): { value: string; caret: number } {
  const head = convert(value.slice(0, caret));
  const tail = convert(value.slice(caret));
  return { value: head + tail, caret: head.length };
}

/**
 * Final conversion once typing is done (blur or submit): catches tone numbers that
 * couldn't be converted while typing, and swaps a breve some sites use (ă) for the caron (ǎ).
 */
export function finalizeReading(value: string): string {
  return convert(value.trim())
    .normalize('NFD')
    .replace(/([aeiou])\u0306(?!\p{M})/giu, '$1\u030C')
    .normalize('NFC');
}

export function hasDigit(text: string): boolean {
  return /\d/.test(text);
}

export function hasHanzi(text: string): boolean {
  return /\p{Script=Han}/u.test(text);
}

/**
 * True when the text has letters pinyin never uses but a Vietnamese keyboard (Telex/VNI)
 * produces, such as ẻ (from "er"), đ (from "dd"), ơ, ư, ã or ạ.
 */
export function hasVietnameseLetters(text: string): boolean {
  return /[đĐ]|[aoAO]\u0302|[\u0303\u0306\u0309\u031B\u0323]/.test(text.normalize('NFD'));
}
