import type { Word } from '../db/types';
import { hasHanzi } from './pinyin';
import { addTag } from './tags';
import { isoDate } from './time';
import { checkWord, type WordFields } from './wordRules';

/** Spreadsheets of words: the columns, reading rows into words to import, and writing words out. */

export type Column = 'word' | 'reading' | 'meaning' | 'tags';

export const HEADERS: Record<Column, string> = { word: 'Chữ Hán', reading: 'Pinyin', meaning: 'Nghĩa', tags: 'Nhãn' };
export const TEMPLATE_HEADERS = [HEADERS.word, HEADERS.reading, HEADERS.meaning, HEADERS.tags];
/** Only in exported files; ignored when importing. */
export const ADDED_HEADER = 'Ngày thêm';
export const MAX_IMPORT_ROWS = 2000;

// Compared without case, accents or anything in brackets: "Nhãn (không bắt buộc)" is "nhan".
const ALIASES: Record<Column, string[]> = {
  word: ['chu han', 'han tu', 'tu', 'tu vung', 'tu moi', 'hanzi', 'word', 'character', 'characters', 'chinese', '汉字', '词', '词语', '生词', '中文'],
  reading: ['pinyin', 'phien am', 'reading', '拼音'],
  meaning: ['nghia', 'nghia tieng viet', 'tieng viet', 'meaning', 'vietnamese', 'translation', '意思', '越南语'],
  tags: ['nhan', 'tags', 'tag', 'labels', 'chu de', '标签'],
};

const POSITIONAL: Record<Column, number> = { word: 0, reading: 1, meaning: 2, tags: 3 };

const UTF8_DAMAGE =
  'Chữ Hán đã bị đổi thành dấu “?”, vì tệp CSV không được lưu ở dạng UTF-8. Trong Excel, hãy chọn Lưu thành → “CSV UTF-8”, hoặc dùng tệp .xlsx.';

export interface ImportWord extends WordFields {
  tags: string[];
}

export type ImportRow = {
  /** The row's number in the spreadsheet, counting the header. */
  rowNumber: number;
  value: ImportWord;
} & (
  | { status: 'new'; /** A word with the same characters but another reading is already in the bank. */ sameHanzi?: Word }
  | { status: 'existing'; existing: Word }
  | { status: 'repeat'; /** The earlier row it repeats. */ repeatOf: number }
  | { status: 'error'; error: string }
);

function normalizeHeader(text: string): string {
  return text
    .replace(/\(.*?\)|\[.*?\]|\*/g, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Where each column is, if the row is a header row (it names at least two of the columns). */
function findColumns(row: readonly string[]): Partial<Record<Column, number>> | null {
  const found: Partial<Record<Column, number>> = {};
  row.forEach((cell, index) => {
    const name = normalizeHeader(cell);
    for (const column of Object.keys(ALIASES) as Column[]) {
      if (found[column] === undefined && ALIASES[column].includes(name)) found[column] = index;
    }
  });
  return Object.keys(found).length >= 2 ? found : null;
}

/** Same characters and the same reading, ignoring case, spaces and syllable marks. */
function wordKey(word: string, reading: string): string {
  return `${word}\u0000${reading.normalize('NFC').toLowerCase().replace(/[\s'’-]/g, '')}`;
}

/** Tags in one cell, separated by commas (also 、 and ，), semicolons or bars. */
function readTags(cell: string, known: string[]): string[] {
  const tags = cell.split(/[,;|、，；]/).reduce<string[]>((tags, part) => addTag(tags, part, known), []);
  // Later rows reuse this row's spelling of a new tag.
  for (const tag of tags) if (!known.some((t) => t.toLowerCase() === tag.toLowerCase())) known.push(tag);
  return tags;
}

/**
 * Reads spreadsheet rows (header first, or just the words in the template's column order)
 * into words to import, each checked like the word form checks it and compared with the bank.
 * Throws if the rows can't be read as a word list at all.
 */
export function previewImport(rows: readonly (readonly string[])[], bank: readonly Word[], knownTags: readonly string[]): ImportRow[] {
  const cells = rows.map((row) => row.map((cell) => cell.trim()));
  const firstIndex = cells.findIndex((row) => row.some(Boolean));
  if (firstIndex < 0) throw new Error('Không tìm thấy từ nào. Hãy kiểm tra lại tệp hoặc nội dung đã dán.');

  const header = findColumns(cells[firstIndex]);
  if (header) {
    const missing = (['word', 'reading', 'meaning'] as const).filter((column) => header[column] === undefined);
    if (missing.length) {
      throw new Error(
        `Không tìm thấy cột ${missing.map((c) => `“${HEADERS[c]}”`).join(', ')}. Dòng đầu tiên cần có các cột: ${TEMPLATE_HEADERS.join(', ')}.`,
      );
    }
  }
  const columns = header ?? POSITIONAL;
  const start = header ? firstIndex + 1 : firstIndex;
  const dataRows = cells.flatMap((row, index) => (index >= start && row.some(Boolean) ? [{ row, index }] : []));
  if (dataRows.length === 0) throw new Error('Tệp chỉ có dòng tiêu đề, chưa có từ nào.');
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Mỗi lần nhập được tối đa ${MAX_IMPORT_ROWS} từ, mà ở đây có ${dataRows.length} dòng. Hãy chia thành nhiều lần.`);
  }

  const byKey = new Map<string, Word>();
  const byHanzi = new Map<string, Word>();
  for (const word of bank) {
    const key = wordKey(word.word, word.reading);
    if (!byKey.has(key)) byKey.set(key, word);
    if (!byHanzi.has(word.word)) byHanzi.set(word.word, word);
  }
  const known = [...knownTags];
  const seen = new Map<string, number>();
  const cell = (row: readonly string[], column: Column) => {
    const index = columns[column];
    return index === undefined ? '' : (row[index] ?? '');
  };

  return dataRows.map(({ row, index }): ImportRow => {
    const rowNumber = index + 1;
    const { value: fields, errors } = checkWord({ word: cell(row, 'word'), reading: cell(row, 'reading'), meaning: cell(row, 'meaning') });
    const value = { ...fields, tags: readTags(cell(row, 'tags'), known) };

    const error = value.word.includes('?') && !hasHanzi(value.word) ? UTF8_DAMAGE : (errors.word ?? errors.reading ?? errors.meaning);
    if (error) return { rowNumber, value, status: 'error', error };

    const key = wordKey(value.word, value.reading);
    const repeatOf = seen.get(key);
    if (repeatOf !== undefined) return { rowNumber, value, status: 'repeat', repeatOf };
    seen.set(key, rowNumber);

    const existing = byKey.get(key);
    if (existing) return { rowNumber, value, status: 'existing', existing };
    const sameHanzi = byHanzi.get(value.word);
    return { rowNumber, value, status: 'new', ...(sameHanzi ? { sameHanzi } : {}) };
  });
}

/** Words as spreadsheet rows, header first, in a form that imports straight back in. */
export function wordsToRows(words: readonly Word[]): string[][] {
  return [
    [...TEMPLATE_HEADERS, ADDED_HEADER],
    ...words.map((w) => [w.word, w.reading, w.meaning, w.tags.join(', '), isoDate(w.createdAt)]),
  ];
}

/** What to ask an AI chat (ChatGPT, Claude, Gemini…) so its answer can be pasted straight into the import. */
export function aiPrompt(knownTags: readonly string[]): string {
  const tags = knownTags.slice(0, 40);
  return [
    'Bạn hãy giúp mình soạn danh sách từ vựng tiếng Trung để nhập vào ứng dụng học từ Qinglan Chinese Class.',
    '',
    'Hãy trả lời bằng đúng một khối CSV, không viết gì thêm. Dòng đầu tiên phải là:',
    TEMPLATE_HEADERS.join(','),
    '',
    'Quy tắc cho từng cột:',
    `- ${HEADERS.word}: từ viết bằng chữ Hán giản thể.`,
    `- ${HEADERS.reading}: có dấu thanh, ví dụ nǐ hǎo (không dùng số thanh điệu).`,
    `- ${HEADERS.meaning}: nghĩa tiếng Việt, ngắn gọn.`,
    `- ${HEADERS.tags}: không bắt buộc; nhiều nhãn thì cách nhau bằng dấu phẩy, ví dụ "chào hỏi, HSK 1".`,
    '- Đặt mọi ô trong dấu ngoặc kép. Mỗi từ một dòng, không lặp lại từ.',
    '',
    'Ví dụ:',
    '"你好","nǐ hǎo","xin chào","chào hỏi"',
    '"谢谢","xièxie","cảm ơn","chào hỏi"',
    ...(tags.length ? ['', `Nếu hợp, hãy dùng lại các nhãn mình đang có: ${tags.join(', ')}.`] : []),
    '',
    'Danh sách từ (hoặc chủ đề, bài học) của mình:',
    '',
  ].join('\n');
}
