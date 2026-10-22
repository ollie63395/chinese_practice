import { finalizeReading, hasDigit, hasHanzi, hasVietnameseLetters } from './pinyin';

export type WordField = 'word' | 'reading' | 'meaning';

export interface WordFields {
  word: string;
  reading: string;
  meaning: string;
}

/** The longest each field may be, as the database allows. */
export const MAX_LENGTH: Record<WordField, number> = { word: 500, reading: 1000, meaning: 5000 };

/**
 * Tidies a word's fields as they'll be saved (trimmed, tone numbers turned into marks)
 * and says what's wrong with them, if anything. Shared by the word form and imports.
 */
export function checkWord(fields: WordFields): { value: WordFields; errors: Partial<Record<WordField, string>> } {
  const value = { word: fields.word.trim(), reading: finalizeReading(fields.reading), meaning: fields.meaning.trim() };
  const errors: Partial<Record<WordField, string>> = {};

  if (!value.word) errors.word = 'Hãy nhập từ bằng chữ Hán.';
  else if (value.word.length > MAX_LENGTH.word) errors.word = `Từ dài quá (tối đa ${MAX_LENGTH.word} ký tự).`;

  if (!value.reading) errors.reading = 'Hãy nhập pinyin của từ.';
  else if (hasHanzi(value.reading)) errors.reading = 'Ô này chỉ nhận pinyin, không nhận chữ Hán.';
  else if (hasDigit(value.reading)) {
    errors.reading = 'Còn số chưa chuyển thành dấu thanh. Hãy gõ số ngay sau âm tiết, ví dụ ni3 → nǐ.';
  } else if (hasVietnameseLetters(value.reading)) {
    errors.reading = 'Pinyin bị lẫn dấu tiếng Việt (như ẻ, đ). Hãy tắt bộ gõ tiếng Việt (Telex/VNI) rồi gõ lại.';
  } else if (value.reading.length > MAX_LENGTH.reading) {
    errors.reading = `Pinyin dài quá (tối đa ${MAX_LENGTH.reading} ký tự).`;
  }

  if (!value.meaning) errors.meaning = 'Hãy nhập nghĩa của từ.';
  else if (value.meaning.length > MAX_LENGTH.meaning) errors.meaning = `Nghĩa dài quá (tối đa ${MAX_LENGTH.meaning} ký tự).`;

  return { value, errors };
}
