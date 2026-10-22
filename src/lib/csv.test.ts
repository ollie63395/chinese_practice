import { describe, expect, it } from 'vitest';
import { NOT_UTF8, parseTable, readTextFile, toCsv } from './csv';

describe('parseTable', () => {
  it('reads plain comma-separated rows', () => {
    expect(parseTable('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('reads quoted cells with commas, newlines and doubled quotes', () => {
    expect(parseTable('"你好","xin chào, chào","nói ""chào""\nlần hai"\n')).toEqual([
      ['你好', 'xin chào, chào', 'nói "chào"\nlần hai'],
    ]);
  });

  it('allows a space before a quoted cell', () => {
    expect(parseTable('"a", "b, c"')).toEqual([['a', 'b, c']]);
  });

  it('keeps a quote inside an unquoted cell as it is', () => {
    expect(parseTable('5" màn hình,x')).toEqual([['5" màn hình', 'x']]);
  });

  it('guesses semicolons and tabs', () => {
    expect(parseTable('a;b;c\n1;2,5;3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2,5', '3'],
    ]);
    expect(parseTable('猫\tmāo\tmèo, con mèo\n狗\tgǒu\tchó')).toEqual([
      ['猫', 'māo', 'mèo, con mèo'],
      ['狗', 'gǒu', 'chó'],
    ]);
  });

  it('ignores separators inside quotes when guessing', () => {
    expect(parseTable('"a;b;c",d\n1,2')).toEqual([
      ['a;b;c', 'd'],
      ['1', '2'],
    ]);
  });

  it('handles a byte-order mark, CRLF and a missing final newline', () => {
    expect(parseTable('﻿a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps blank lines as rows, so row numbers match the file', () => {
    expect(parseTable('a\n\nb\n')).toEqual([['a'], [''], ['b']]);
  });

  it('drops the code fences of text pasted from an AI chat', () => {
    expect(parseTable('```csv\nChữ Hán,Pinyin\n你好,nǐ hǎo\n```')).toEqual([
      ['Chữ Hán', 'Pinyin'],
      ['你好', 'nǐ hǎo'],
    ]);
  });

  it('returns nothing for empty text', () => {
    expect(parseTable('')).toEqual([]);
  });
});

describe('toCsv', () => {
  it('starts with a byte-order mark and quotes only where needed', () => {
    expect(toCsv([['a', 'b, c', 'say "hi"', 'x;y', ' padded']])).toBe('﻿a,"b, c","say ""hi""","x;y"," padded"\r\n');
  });

  it('round-trips through parseTable', () => {
    const rows = [
      ['Chữ Hán', 'Pinyin', 'Nghĩa', 'Nhãn'],
      ['你好', 'nǐ hǎo', 'xin chào, chào', 'chào hỏi, HSK 1'],
      ['引号', 'yǐnhào', 'dấu "ngoặc kép"\nhai dòng', ''],
    ];
    expect(parseTable(toCsv(rows))).toEqual(rows);
  });
});

describe('readTextFile', () => {
  it('reads UTF-8, with or without a byte-order mark', async () => {
    expect(await readTextFile(new Blob(['你好,xin chào']))).toBe('你好,xin chào');
    expect(await readTextFile(new Blob(['﻿你好']))).toBe('你好');
  });

  it('reads UTF-16 with a byte-order mark', async () => {
    const text = '猫\tmèo';
    const bytes = new Uint8Array(2 + text.length * 2);
    bytes.set([0xff, 0xfe]);
    for (let i = 0; i < text.length; i++) {
      bytes[2 + i * 2] = text.charCodeAt(i) & 0xff;
      bytes[3 + i * 2] = text.charCodeAt(i) >> 8;
    }
    expect(await readTextFile(new Blob([bytes]))).toBe(text);
  });

  it('explains how to fix a file that is not UTF-8', async () => {
    // "mèo" in Windows-1252, as Excel's plain CSV save would write it.
    await expect(readTextFile(new Blob([new Uint8Array([0x6d, 0xe8, 0x6f])]))).rejects.toThrow(NOT_UTF8);
  });
});
