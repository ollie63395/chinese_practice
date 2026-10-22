// Excel files. Only ever loaded with import(), so the spreadsheet libraries stay out of the
// main bundle and are fetched the first time someone opens or saves an .xlsx file.
import readExcelFile from 'read-excel-file/browser';
import writeExcelFile, { type Row } from 'write-excel-file/browser';
import type { Word } from '../db/types';
import { isoDate } from './time';
import { HEADERS, TEMPLATE_HEADERS, wordsToRows } from './wordSheet';

const WORDS_SHEET = 'Từ vựng';
const GUIDE_SHEET = 'Hướng dẫn';
const WORD_COLUMNS = [{ width: 16 }, { width: 22 }, { width: 40 }, { width: 28 }, { width: 14 }];

/**
 * The rows of the sheet that holds the words, every cell as text. That's the first sheet,
 * unless it's the guide that comes with the template.
 */
export async function readXlsx(file: Blob): Promise<string[][]> {
  let sheets;
  try {
    sheets = await readExcelFile(file);
  } catch {
    throw new Error('Không mở được tệp Excel này. Hãy kiểm tra đó là tệp .xlsx, hoặc lưu lại rồi thử lần nữa.');
  }
  const sheet = sheets.find((s) => s.sheet !== GUIDE_SHEET) ?? sheets[0];
  return sheet.data.map((row) => row.map(cellText));
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return isoDate(value.getTime());
  return String(value);
}

const bold = (row: readonly string[]): Row => row.map((value) => ({ value, fontWeight: 'bold' }));

/** Words as an .xlsx file that imports straight back in. */
export function wordsXlsx(words: readonly Word[]): Promise<Blob> {
  const [header, ...rows] = wordsToRows(words);
  return writeExcelFile([{ sheet: WORDS_SHEET, data: [bold(header), ...rows], columns: WORD_COLUMNS, stickyRowsCount: 1 }]).toBlob();
}

/** An empty word list to fill in, with a sheet explaining how. */
export function templateXlsx(): Promise<Blob> {
  const title = (text: string): Row => [{ value: text, fontWeight: 'bold' }];
  // Long notes run on across the empty cells beside them.
  const note = (text: string): Row => [text];
  const column = (name: string, required: string, how: string): Row => [name, required, { value: how, wrap: true }];
  const guide: Row[] = [
    title('Cách điền bảng từ vựng'),
    note(`Điền từ vào trang “${WORDS_SHEET}”, mỗi từ một dòng, và giữ nguyên dòng tiêu đề. Trang hướng dẫn này không được nhập.`),
    [],
    bold(['Cột', 'Bắt buộc', 'Cách điền']),
    column(HEADERS.word, 'Có', 'Từ viết bằng chữ Hán, giản thể hay phồn thể đều được.'),
    column(
      HEADERS.reading,
      'Có',
      'Pinyin có dấu thanh (nǐ hǎo), hoặc gõ số thanh điệu ngay sau mỗi âm tiết (ni3 hao3) và ứng dụng sẽ tự đổi thành dấu. Dùng v cho ü (lv4 → lǜ), số 5 cho thanh nhẹ (xie4xie5 → xièxie).',
    ),
    column(HEADERS.meaning, 'Có', 'Nghĩa tiếng Việt.'),
    column(HEADERS.tags, 'Không', 'Nhóm từ theo chủ đề để ôn cùng nhau. Nhiều nhãn thì cách nhau bằng dấu phẩy, ví dụ: chào hỏi, HSK 1'),
    [],
    title('Ví dụ'),
    bold(TEMPLATE_HEADERS),
    ['你好', 'nǐ hǎo', 'xin chào', 'chào hỏi'],
    ['学校', 'xuéxiào', 'trường học', 'nơi chốn, HSK 1'],
    ['谢谢', 'xie4xie5', 'cảm ơn', 'chào hỏi'],
    [],
    title('Mẹo'),
    note('Nhờ AI điền giúp: trong trang “Nhập từ” của ứng dụng, bấm “Sao chép câu lệnh” rồi dán vào ChatGPT, Claude hoặc Gemini.'),
    note('Hình ảnh không thêm được qua bảng tính. Sau khi nhập, bạn có thể thêm hình cho từng từ.'),
    note('Hãy lưu tệp ở dạng .xlsx. Nếu lưu thành CSV trong Excel, hãy chọn “CSV UTF-8”, nếu không chữ Hán sẽ bị hỏng.'),
  ];
  return writeExcelFile([
    { sheet: WORDS_SHEET, data: [bold(TEMPLATE_HEADERS)], columns: WORD_COLUMNS, stickyRowsCount: 1 },
    { sheet: GUIDE_SHEET, data: guide, columns: [{ width: 16 }, { width: 12 }, { width: 90 }] },
  ]).toBlob();
}
