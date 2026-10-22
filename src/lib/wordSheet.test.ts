import { describe, expect, it } from 'vitest';
import { parseTable } from './csv';
import { makeWord } from './testWords';
import { aiPrompt, MAX_IMPORT_ROWS, previewImport, TEMPLATE_HEADERS, wordsToRows, type ImportRow } from './wordSheet';

const preview = (text: string, bank = [makeWord({ word: '猫', reading: 'māo', meaning: 'mèo', tags: ['Động vật'] })], tags = ['Động vật']) =>
  previewImport(parseTable(text), bank, tags);

const statuses = (rows: ImportRow[]) => rows.map((r) => r.status);

describe('previewImport', () => {
  it('reads the template’s columns, in any order, and ignores unknown ones', () => {
    const [row] = preview('Ghi chú,Nghĩa,Pinyin,Chữ Hán\nxyz,xin chào,nǐ hǎo,你好');
    expect(row).toMatchObject({ rowNumber: 2, status: 'new', value: { word: '你好', reading: 'nǐ hǎo', meaning: 'xin chào', tags: [] } });
  });

  it('recognises English and Chinese headers, ignoring case, accents and brackets', () => {
    expect(preview('Word,PINYIN,Meaning,Tags\n你,nǐ,bạn,x')[0].value).toMatchObject({ word: '你', meaning: 'bạn', tags: ['x'] });
    expect(preview('汉字,拼音,意思\n你,nǐ,bạn')[0].value.word).toBe('你');
    expect(preview('chu han,pinyin,nghia,Nhãn (không bắt buộc)\n你,nǐ,bạn,x')[0].value.tags).toEqual(['x']);
  });

  it('reads rows without a header in the template’s column order', () => {
    const rows = preview('你好\tni3 hao3\txin chào\n谢谢\txie4xie5\tcảm ơn');
    expect(rows.map((r) => [r.rowNumber, r.value.reading])).toEqual([
      [1, 'nǐ hǎo'],
      [2, 'xièxie'],
    ]);
  });

  it('says which required column is missing', () => {
    expect(() => preview('Chữ Hán,Nhãn\n你,x')).toThrow(/“Pinyin”, “Nghĩa”/);
  });

  it('rejects empty input and header-only files', () => {
    expect(() => preview('\n\n')).toThrow(/Không tìm thấy từ nào/);
    expect(() => preview(TEMPLATE_HEADERS.join(','))).toThrow(/chỉ có dòng tiêu đề/);
  });

  it('skips blank rows but keeps the spreadsheet’s row numbers', () => {
    const rows = preview('Chữ Hán,Pinyin,Nghĩa\n\n你,nǐ,bạn\n,,\n好,hǎo,tốt');
    expect(rows.map((r) => r.rowNumber)).toEqual([3, 5]);
  });

  it('flags rows that would not pass the word form, with its message', () => {
    const rows = preview('Chữ Hán,Pinyin,Nghĩa\n你,,bạn\n你,ni9,bạn\n,nǐ,bạn\n你,nǐ,');
    expect(rows.map((r) => (r.status === 'error' ? r.error : r.status))).toEqual([
      'Hãy nhập pinyin của từ.',
      expect.stringMatching(/Còn số/),
      'Hãy nhập từ bằng chữ Hán.',
      'Hãy nhập nghĩa của từ.',
    ]);
  });

  it('explains question marks where the Chinese should be', () => {
    const [row] = preview('Chữ Hán,Pinyin,Nghĩa\n??,nǐ hǎo,xin chao');
    expect(row.status === 'error' && row.error).toMatch(/CSV UTF-8/);
  });

  it('splits tags and reuses the spelling of tags already in use', () => {
    const [first, second] = preview('Chữ Hán,Pinyin,Nghĩa,Nhãn\n狗,gǒu,chó,"động vật; Thú cưng | thú cưng"\n兔,tù,thỏ,thú CƯNG、HSK 1');
    expect(first.value.tags).toEqual(['Động vật', 'Thú cưng']);
    expect(second.value.tags).toEqual(['Thú cưng', 'HSK 1']);
  });

  it('marks words already in the bank, ignoring case and spacing in the pinyin', () => {
    const rows = preview('Chữ Hán,Pinyin,Nghĩa\n猫,MĀO,con mèo\n猫,mao1,mèo');
    expect(statuses(rows)).toEqual(['existing', 'repeat']);
    expect(rows[0].status === 'existing' && rows[0].existing.meaning).toBe('mèo');
    expect(rows[1].status === 'repeat' && rows[1].repeatOf).toBe(2);
  });

  it('treats the same characters with another reading as a new word, with a note', () => {
    const bank = [makeWord({ word: '长', reading: 'cháng', meaning: 'dài' })];
    const [row] = preview('Chữ Hán,Pinyin,Nghĩa\n长,zhǎng,lớn lên', bank);
    expect(row.status).toBe('new');
    expect(row.status === 'new' && row.sameHanzi?.reading).toBe('cháng');
  });

  it('limits how many words one import can hold', () => {
    const many = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `字${i},zì,chữ`).join('\n');
    expect(() => preview(many)).toThrow(new RegExp(`tối đa ${MAX_IMPORT_ROWS}`));
  });
});

describe('wordsToRows', () => {
  it('writes words in a form that imports straight back in', () => {
    const words = [makeWord({ word: '你好', reading: 'nǐ hǎo', meaning: 'xin chào, chào', tags: ['chào hỏi', 'HSK 1'] })];
    const rows = wordsToRows(words);
    expect(rows[0]).toEqual([...TEMPLATE_HEADERS, 'Ngày thêm']);
    expect(rows[1].slice(0, 4)).toEqual(['你好', 'nǐ hǎo', 'xin chào, chào', 'chào hỏi, HSK 1']);
    const [row] = previewImport(rows, [], []);
    expect(row.value).toEqual({ word: '你好', reading: 'nǐ hǎo', meaning: 'xin chào, chào', tags: ['chào hỏi', 'HSK 1'] });
  });
});

describe('aiPrompt', () => {
  it('asks for the template’s header and mentions the tags in use', () => {
    const prompt = aiPrompt(['động vật', 'HSK 1']);
    expect(prompt).toContain(TEMPLATE_HEADERS.join(','));
    expect(prompt).toContain('động vật, HSK 1');
    expect(aiPrompt([])).not.toContain('nhãn mình đang có');
  });

  it('gives an example answer that imports cleanly', () => {
    const example = aiPrompt([])
      .split('\n')
      .filter((line) => line.startsWith('"'));
    const rows = previewImport(parseTable([TEMPLATE_HEADERS.join(','), ...example].join('\n')), [], []);
    expect(statuses(rows)).toEqual(['new', 'new']);
  });
});
