import { describe, expect, it } from 'vitest';
import { checkWord } from './wordRules';

describe('checkWord', () => {
  it('tidies the fields and turns tone numbers into marks', () => {
    expect(checkWord({ word: ' 你好 ', reading: 'ni3 hao3', meaning: ' xin chào ' })).toEqual({
      value: { word: '你好', reading: 'nǐ hǎo', meaning: 'xin chào' },
      errors: {},
    });
  });

  it('requires every field', () => {
    expect(checkWord({ word: ' ', reading: '', meaning: '' }).errors).toEqual({
      word: 'Hãy nhập từ bằng chữ Hán.',
      reading: 'Hãy nhập pinyin của từ.',
      meaning: 'Hãy nhập nghĩa của từ.',
    });
  });

  it('catches Chinese characters, leftover numbers and Vietnamese letters in the pinyin', () => {
    const reading = (text: string) => checkWord({ word: '你', reading: text, meaning: 'bạn' }).errors.reading;
    expect(reading('你')).toMatch(/không nhận chữ Hán/);
    expect(reading('ni9')).toMatch(/Còn số/);
    expect(reading('ẻ')).toMatch(/dấu tiếng Việt/);
    expect(reading('nǐ')).toBeUndefined();
  });

  it('enforces the lengths the database allows', () => {
    const { errors } = checkWord({ word: '字'.repeat(501), reading: 'a'.repeat(1001), meaning: 'x'.repeat(5001) });
    expect(Object.keys(errors).sort()).toEqual(['meaning', 'reading', 'word']);
  });
});
