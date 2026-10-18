import { describe, expect, it } from 'vitest';
import { convertWhileTyping, finalizeReading, hasDigit, hasHanzi, hasVietnameseLetters } from './pinyin';

/** Types text one key at a time at the end of the field, the way a person would. */
function type(text: string): string {
  let value = '';
  for (const key of text) value = convertWhileTyping(value + key, value.length + 1).value;
  return value;
}

/** Types the text, then leaves the field. */
const typeAndBlur = (text: string) => finalizeReading(type(text));

describe('typing pinyin with tone numbers', () => {
  it.each([
    ['ni3', 'nǐ'],
    ['hao3', 'hǎo'],
    ['ma1', 'mā'],
    ['ma2', 'má'],
    ['ma4', 'mà'],
    ['chi1', 'chī'],
    ['zhong1', 'zhōng'],
    ['xue2', 'xué'],
  ])('%s → %s as soon as the digit is typed', (input, expected) => {
    expect(type(input)).toBe(expected);
  });

  it.each([
    ['ni3 hao3', 'nǐ hǎo'],
    ['ni3hao3', 'nǐhǎo'],
    ['xue2xiao4', 'xuéxiào'],
    ['lao3shi1', 'lǎoshī'],
    ['zuo2tian1', 'zuótiān'],
    ['zhong1guo2', 'zhōngguó'],
    ['dui4 bu5 qi3', 'duì bu qǐ'],
  ])('keeps spaces, or writes syllables together: %s → %s', (input, expected) => {
    expect(typeAndBlur(input)).toBe(expected);
  });

  it.each([
    ['xie4xie5', 'xièxie'],
    ['ma5', 'ma'],
    ['de0', 'de'],
    ['peng2you5', 'péngyou'],
  ])('uses 5 or 0 for the neutral tone: %s → %s', (input, expected) => {
    expect(typeAndBlur(input)).toBe(expected);
  });

  it.each([
    ['lv4', 'lǜ'],
    ['nv3', 'nǚ'],
    ['lve4', 'lüè'],
    ['nu:3', 'nǚ'],
    ['lu:e4', 'lüè'],
    ['Lv4', 'Lǜ'],
    ['nv3er2', 'nǚér'],
  ])('turns v and u: into ü: %s → %s', (input, expected) => {
    expect(typeAndBlur(input)).toBe(expected);
  });

  it('shows ü straight away, before the tone number', () => {
    expect(type('lv')).toBe('lü');
    expect(type('nu:')).toBe('nü');
  });

  it.each([
    // a or e takes the mark…
    ['jia1', 'jiā'],
    ['mei2', 'méi'],
    ['xie4', 'xiè'],
    ['guai4', 'guài'],
    ['xiang3', 'xiǎng'],
    ['yue4', 'yuè'],
    // …otherwise the o of ou…
    ['dou1', 'dōu'],
    ['you3', 'yǒu'],
    ['zhou1', 'zhōu'],
    // …otherwise the last vowel.
    ['liu2', 'liú'],
    ['jiu3', 'jiǔ'],
    ['gui4', 'guì'],
    ['shui3', 'shuǐ'],
    ['duo1', 'duō'],
    ['xiong2', 'xióng'],
    ['er2', 'ér'],
    ['huar1', 'huār'],
  ])('puts the mark on the right vowel: %s → %s', (input, expected) => {
    expect(typeAndBlur(input)).toBe(expected);
  });

  it('marks only the last syllable when tone numbers were left out before it', () => {
    expect(typeAndBlur('nihao3')).toBe('nihǎo');
    expect(typeAndBlur('ganxie4')).toBe('ganxiè');
    expect(typeAndBlur('zhongguo2')).toBe('zhongguó');
  });

  it.each([
    ['Bei3jing1', 'Běijīng'],
    ['A1', 'Ā'],
    ['Ou1zhou1', 'Ōuzhōu'],
    ['ER2', 'ÉR'],
    ['LV4', 'LǛ'],
  ])('keeps capitals: %s → %s', (input, expected) => {
    expect(typeAndBlur(input)).toBe(expected);
  });

  it.each([
    ["xi1'an1", "xī'ān"],
    ["Tian1'an1men2", "Tiān'ānmén"],
    ['pi2’ao3', 'pí’ǎo'],
  ])('keeps apostrophes: %s → %s', (input, expected) => {
    expect(typeAndBlur(input)).toBe(expected);
  });

  it.each([
    ['n2', 'ń'],
    ['ng4', 'ǹg'],
    ['m2', 'ḿ'],
  ])('marks the nasal interjections: %s → %s', (input, expected) => {
    expect(typeAndBlur(input)).toBe(expected);
  });

  it('changes a tone when another number is typed after the syllable', () => {
    expect(type('hao34')).toBe('hào');
    expect(type('hao35')).toBe('hao');
    expect(convertWhileTyping('nǐhǎo1', 6)).toEqual({ value: 'nǐhāo', caret: 5 });
  });

  it('leaves tone-marked pinyin and Chinese characters alone', () => {
    for (const text of ['nǐ hǎo', 'lǜsè', 'Běijīng', "Xī'ān", '你好', 'nǐ hǎo! 你好']) {
      expect(convertWhileTyping(text, text.length)).toEqual({ value: text, caret: text.length });
      expect(finalizeReading(text)).toBe(text);
    }
  });

  it('accepts pasted pinyin with tone numbers', () => {
    const pasted = 'wo3 xue2 Zhong1wen2';
    expect(convertWhileTyping(pasted, pasted.length).value).toBe('wǒ xué Zhōngwén');
  });

  it('leaves numbers it can’t place', () => {
    expect(type('3')).toBe('3');
    expect(type('x3')).toBe('x3');
    expect(type('ni6')).toBe('ni6');
    expect(type('hao 3')).toBe('hao 3');
  });

  it('keeps the caret in place when typing in the middle of the text', () => {
    let state = { value: 'hǎo', caret: 0 };
    for (const key of 'ni3 ') {
      const raw = state.value.slice(0, state.caret) + key + state.value.slice(state.caret);
      state = convertWhileTyping(raw, state.caret + 1);
    }
    expect(state).toEqual({ value: 'nǐ hǎo', caret: 3 });
  });

  it('converts a number typed in the middle of a word', () => {
    expect(convertWhileTyping('ni3hao', 3)).toEqual({ value: 'nǐhao', caret: 2 });
  });
});

describe('finalizeReading', () => {
  it('trims whitespace', () => {
    expect(finalizeReading('  nǐ hǎo ')).toBe('nǐ hǎo');
  });

  it('converts what was left over while typing', () => {
    // A number typed before the syllable it belongs to, with the caret moved back.
    expect(convertWhileTyping('ni3', 2).value).toBe('ni3');
    expect(finalizeReading('ni3')).toBe('nǐ');
    expect(finalizeReading('lv')).toBe('lü');
  });

  it('swaps a breve, used by some sites for the third tone, for the caron', () => {
    expect(finalizeReading('nĭ hăo')).toBe('nǐ hǎo');
  });

  it('turns decomposed tone marks into single characters', () => {
    expect(finalizeReading('nǐ')).toBe('nǐ');
  });
});

describe('checking a reading', () => {
  it('finds tone numbers that weren’t converted', () => {
    expect(hasDigit('ni3')).toBe(true);
    expect(hasDigit('nǐ')).toBe(false);
  });

  it('finds Chinese characters', () => {
    expect(hasHanzi('你hǎo')).toBe(true);
    expect(hasHanzi('nǐ hǎo')).toBe(false);
  });

  it.each([
    ['ẻ', true], // Telex: er
    ['đa', true], // Telex: dd
    ['nỉ', true], // VNI: ni3
    ['hão', true],
    ['ươ', true],
    ['ạ', true],
    ['â', true],
    ['ằ', true],
    ['nǐ hǎo', false],
    ['lǜ', false],
    ['ê', false],
    ['ế', false],
  ])('spots letters from a Vietnamese keyboard: %s → %s', (text, expected) => {
    expect(hasVietnameseLetters(text)).toBe(expected);
  });
});
