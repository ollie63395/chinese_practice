import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import readExcelFile from 'read-excel-file/node';
import writeExcelFile from 'write-excel-file/node';
import { ANIMALS, items, otherDevice, seed, signUp, WORDS } from './helpers';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const HEADER = ['Chữ Hán', 'Pinyin', 'Nghĩa', 'Nhãn'];

function chooseFile(page: Page, name: string, buffer: Buffer, mimeType = 'text/csv') {
  return page.locator('input[type=file]').setInputFiles({ name, mimeType, buffer });
}

test('imports a CSV file after showing what it will do', async ({ page }) => {
  await signUp(page);
  await seed(page, ANIMALS);
  await page.goto('/#/words');
  await page.getByRole('link', { name: 'Nhập từ hàng loạt' }).click();

  const csv = [
    HEADER.join(','),
    '你好,ni3 hao3,xin chào,chào hỏi',
    '谢谢,xièxie,"cảm ơn, đa tạ",chào hỏi',
    '猫,māo,con mèo,',
    '错,,sai,',
    '你好,nǐ hǎo,xin chào,',
  ].join('\n');
  await chooseFile(page, 'tu-moi.csv', Buffer.from(csv));

  await expect(page.getByText('2 từ mới')).toBeVisible();
  await expect(page.getByText('1 từ đã có')).toBeVisible();
  await expect(page.getByText('2 dòng bị bỏ qua')).toBeVisible();
  const rows = page.getByRole('list', { name: 'Các dòng trong danh sách' }).getByRole('listitem');
  await expect(rows).toHaveCount(5);
  // Tone numbers are turned into marks, like in the word form.
  await expect(rows.nth(0)).toContainText('nǐ hǎo');
  await expect(rows.nth(3)).toContainText('Hãy nhập pinyin của từ.');
  await expect(rows.nth(4)).toContainText('Trùng với dòng 2');

  await page.locator('#extra-tags').fill('Bài 5');
  await page.locator('#extra-tags').press('Enter');
  await page.getByRole('button', { name: 'Nhập 2 từ' }).click();
  await expect(page.getByRole('heading', { name: 'Đã nhập 2 từ' })).toBeVisible();

  // Straight to the words just imported.
  await page.getByRole('link', { name: 'Xem từ vựng' }).click();
  await expect(items(page)).toHaveCount(2);
  await expect(items(page).first()).toContainText('nǐ hǎo');
  await expect(items(page).nth(1)).toContainText('cảm ơn, đa tạ');
  await page.goto('/#/words');
  await expect(items(page)).toHaveCount(4);
});

test('pastes rows from a spreadsheet, updates words already there, and undoes it', async ({ page }) => {
  await signUp(page);
  await seed(page, ANIMALS);
  await page.goto('/#/words/import');

  await page.getByLabel('Hoặc dán vào đây').fill('猫\tmao1\tcon mèo\tthú cưng\n兔\ttu4\tthỏ\n');
  await page.getByRole('button', { name: 'Xem trước' }).click();
  await expect(page.getByText('1 từ mới')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nhập 1 từ' })).toBeVisible();
  await page.getByRole('button', { name: 'Cập nhật nghĩa & nhãn' }).click();
  await expect(page.getByText('Nghĩa cũ: mèo')).toBeVisible();
  await page.getByRole('button', { name: 'Nhập 2 từ' }).click();
  await expect(page.getByRole('heading', { name: 'Đã nhập 1 từ, cập nhật 1 từ' })).toBeVisible();

  await page.getByRole('button', { name: 'Hoàn tác lần nhập này' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(page.getByText('Đã hoàn tác lần nhập')).toBeVisible();

  await page.goto('/#/words');
  await expect(items(page)).toHaveCount(2);
  await expect(items(page).filter({ hasText: '猫' })).toContainText('mèo');
  await expect(items(page).filter({ hasText: '猫' })).not.toContainText('con mèo');
});

test('downloads the Excel template and imports it once filled in', async ({ page }) => {
  await signUp(page);
  await page.goto('/#/words/import');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Mẫu Excel (.xlsx)' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('qinglan-chinese-mau-tu-vung.xlsx');
  const sheets = await readExcelFile(await download.path());
  expect(sheets.map((s) => s.sheet)).toEqual(['Từ vựng', 'Hướng dẫn']);
  expect(sheets[0].data).toEqual([HEADER]);

  // Filled in, with the guide still in the workbook.
  const filled = await writeExcelFile([
    { sheet: 'Từ vựng', data: [HEADER, ['学校', 'xue2xiao4', 'trường học', 'nơi chốn, HSK 1']] },
    { sheet: 'Hướng dẫn', data: [['Cách điền bảng từ vựng']] },
  ]).toBuffer();
  await chooseFile(page, 'mau.xlsx', filled, XLSX);
  await expect(page.getByText('1 từ mới')).toBeVisible();
  await expect(page.getByText('xuéxiào')).toBeVisible();
  await page.getByRole('button', { name: 'Nhập 1 từ' }).click();
  await expect(page.getByRole('heading', { name: 'Đã nhập 1 từ' })).toBeVisible();
  await page.getByRole('link', { name: 'Xem từ vựng' }).click();
  await expect(items(page)).toHaveCount(1);
  await expect(items(page)).toContainText('HSK 1');
});

test('explains how to fix a CSV that Excel saved without UTF-8', async ({ page }) => {
  await signUp(page);
  await page.goto('/#/words/import');
  // "mèo" in Windows-1252, as Excel's plain CSV save writes it.
  await chooseFile(page, 'tu.csv', Buffer.from([0x6d, 0xe8, 0x6f]));
  await expect(page.getByRole('alert')).toContainText('CSV UTF-8');
});

test('exports the word list as Excel and CSV files that import into another account', async ({ page, browser }) => {
  await signUp(page);
  await seed(page, WORDS);
  await page.goto('/#/backup');

  let downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất ra CSV' }).click();
  const csvDownload = await downloading;
  expect(csvDownload.suggestedFilename()).toMatch(/^qinglan-chinese-tu-vung-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = await readFile(await csvDownload.path(), 'utf8');
  expect(csv.startsWith('﻿Chữ Hán,Pinyin,Nghĩa,Nhãn,Ngày thêm\r\n')).toBe(true);
  expect(csv).toContain('学校,xuéxiào,trường học,nơi chốn,');

  downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất ra Excel' }).click();
  const xlsxDownload = await downloading;
  expect(xlsxDownload.suggestedFilename()).toMatch(/^qinglan-chinese-tu-vung-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const [sheet] = await readExcelFile(await xlsxDownload.path());
  expect(sheet.data).toHaveLength(WORDS.length + 1);

  const other = await otherDevice(browser, page);
  await signUp(other, { name: 'Trần Thị Bình' });
  await other.goto('/#/words/import');
  await chooseFile(other, 'tu-vung.xlsx', await readFile(await xlsxDownload.path()), XLSX);
  await expect(other.getByText(`${WORDS.length} từ mới`)).toBeVisible();
  await other.getByRole('button', { name: `Nhập ${WORDS.length} từ` }).click();
  await other.getByRole('link', { name: 'Xem từ vựng' }).click();
  await expect(items(other)).toHaveCount(WORDS.length);
  await other.context().close();
});
