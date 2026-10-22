/** Shown when a CSV file isn't UTF-8, which is what Excel's plain "CSV" save gives on Windows. */
export const NOT_UTF8 =
  'Tệp CSV này không được lưu ở dạng UTF-8 nên chữ Hán bị hỏng. Trong Excel, hãy chọn Lưu thành → “CSV UTF-8”, hoặc tải lên tệp .xlsx.';

/**
 * Splits CSV or tab-separated text into rows of cells. The separator (tab, comma or semicolon)
 * is guessed from the first line: Excel in a Vietnamese locale saves with semicolons, and rows
 * copied from a spreadsheet come with tabs. Cells may be quoted, with "" for a quote inside.
 * Markdown code-fence lines (```csv) are dropped, since text pasted from an AI chat often has them.
 */
export function parseTable(text: string): string[][] {
  const body = text
    .replace(/^﻿/, '')
    .split(/\r\n|\r|\n/)
    .filter((line) => !/^\s*```/.test(line))
    .join('\n');
  const separator = guessSeparator(body);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (body[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (char === '"' && cell.trim() === '') {
      // A quote opens a quoted cell only at its start; elsewhere it's just a character.
      cell = '';
      quoted = true;
    } else if (char === separator) {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function guessSeparator(text: string): string {
  const counts = { '\t': 0, ',': 0, ';': 0 };
  let quoted = false;
  for (const char of text.trimStart()) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === '\n') break;
    else if (!quoted && char in counts) counts[char as keyof typeof counts]++;
  }
  if (counts['\t'] > 0) return '\t';
  return counts[';'] > counts[','] ? ';' : ',';
}

/**
 * Rows as a CSV file's text. It starts with a byte-order mark, which is what makes Excel
 * read it as UTF-8 and show Chinese and Vietnamese properly.
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  const quote = (cell: string) => (/[",;\t\r\n]|^\s|\s$/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);
  return `﻿${rows.map((row) => row.map(quote).join(',')).join('\r\n')}\r\n`;
}

/** A text file's contents: UTF-8, or UTF-16 with a byte-order mark (Excel's "Unicode Text"). */
export async function readTextFile(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(NOT_UTF8);
  }
}
