import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { items, PNG } from './helpers';

test('backs everything up and restores it in a fresh browser', async ({ page, browser }) => {
  // A word with a picture, so the backup has to carry image data too.
  await page.goto('/#/words/new');
  await page.locator('#word').fill('猫');
  await page.locator('#reading').pressSequentially('mao1');
  await page.locator('#meaning').fill('mèo');
  await page.locator('input[type=file]').setInputFiles({ name: 'meo.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByAltText('Ảnh đã chọn')).toBeVisible();
  await page.getByRole('button', { name: 'Lưu từ' }).click();
  await expect(items(page)).toHaveCount(1);

  await page.getByRole('link', { name: 'Sao lưu & khôi phục' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải bản sao lưu' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^cihui-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  const backup = JSON.parse(await readFile(path, 'utf8'));
  expect(backup.words).toHaveLength(1);
  expect(backup.words[0]).toMatchObject({ word: '猫', reading: 'māo', meaning: 'mèo' });
  expect(backup.images).toHaveLength(1);

  // A new context has empty storage, like another browser or device.
  const fresh = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const other = await fresh.newPage();
  await other.goto('/#/backup');
  await other.locator('input[type=file]').setInputFiles(path);
  await expect(other.getByRole('dialog')).toContainText('Bản sao lưu có 1 từ và 0 buổi luyện tập');
  await other.getByRole('dialog').getByRole('button', { name: 'Khôi phục' }).click();
  await expect(other.getByText('Đã khôi phục 1 từ và 0 buổi luyện tập')).toBeVisible();
  await other.goto('/#/words');
  await expect(items(other)).toHaveCount(1);
  await expect(items(other)).toContainText('māo');
  await expect(items(other).locator('img')).toBeVisible();
  await fresh.close();
});

test('rejects files that are not backups', async ({ page }) => {
  await page.goto('/#/backup');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.getByText('Tệp này không phải bản sao lưu của Cíhuì.')).toBeVisible();
});
