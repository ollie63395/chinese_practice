import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { items, otherDevice, PNG, signIn, signUp } from './helpers';

async function addCatWithPicture(page: Page) {
  await page.goto('/#/words/new');
  await page.locator('#word').fill('猫');
  await page.locator('#reading').pressSequentially('mao1');
  await page.locator('#meaning').fill('mèo');
  await page.locator('input[type=file]').setInputFiles({ name: 'meo.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByAltText('Ảnh đã chọn')).toBeVisible();
  await page.getByRole('button', { name: 'Lưu từ' }).click();
  await expect(items(page)).toHaveCount(1);
}

test('words stay after a reload and follow the account to another device', async ({ page, browser }) => {
  const account = await signUp(page);
  await addCatWithPicture(page);

  // Closing and reopening: still signed in, word still there.
  await page.reload();
  await expect(items(page)).toHaveCount(1);
  await expect(items(page)).toContainText('māo');

  // Another device starts empty, until the same account signs in.
  const other = await otherDevice(browser, page);
  await signIn(other, account);
  await other.goto('/#/words');
  await expect(items(other)).toHaveCount(1);
  await expect(items(other)).toContainText('māo');
  await expect(items(other).locator('img')).toBeVisible();
  await other.context().close();
});

test('backs everything up and restores it into another account', async ({ page, browser }) => {
  await signUp(page);
  await addCatWithPicture(page);

  await page.getByRole('link', { name: 'Nhập, xuất & sao lưu' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải bản sao lưu' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^qinglan-chinese-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  const backup = JSON.parse(await readFile(path, 'utf8'));
  expect(backup.words).toHaveLength(1);
  expect(backup.words[0]).toMatchObject({ word: '猫', reading: 'māo', meaning: 'mèo' });
  expect(backup.images).toHaveLength(1);

  const other = await otherDevice(browser, page);
  await signUp(other, { name: 'Trần Thị Bình' });
  await other.goto('/#/backup');
  await other.locator('input[type=file]').setInputFiles(path);
  await expect(other.getByRole('dialog')).toContainText('Bản sao lưu có 1 từ và 0 buổi luyện tập');
  await other.getByRole('dialog').getByRole('button', { name: 'Khôi phục' }).click();
  await expect(other.getByText('Đã khôi phục 1 từ và 0 buổi luyện tập')).toBeVisible();
  await other.goto('/#/words');
  await expect(items(other)).toHaveCount(1);
  await expect(items(other).locator('img')).toBeVisible();
  await other.context().close();
});

test('rejects files that are not backups', async ({ page }) => {
  await signUp(page);
  await page.goto('/#/backup');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.getByText('Tệp này không phải bản sao lưu của Qinglan Chinese Class.')).toBeVisible();
});
