import { expect, type Page } from '@playwright/test';

export interface SeedWord {
  word: string;
  reading: string;
  meaning: string;
  tags?: string[];
}

export const ANIMALS: SeedWord[] = [
  { word: '猫', reading: 'māo', meaning: 'mèo', tags: ['động vật'] },
  { word: '狗', reading: 'gǒu', meaning: 'chó', tags: ['động vật'] },
];

export const WORDS: SeedWord[] = [
  ...ANIMALS,
  { word: '吃', reading: 'chī', meaning: 'ăn', tags: ['động từ'] },
  { word: '学校', reading: 'xuéxiào', meaning: 'trường học', tags: ['nơi chốn'] },
  { word: '老师', reading: 'lǎoshī', meaning: 'giáo viên', tags: ['con người'] },
  { word: '昨天', reading: 'zuótiān', meaning: 'hôm qua' },
];

/** A 1×1 PNG. */
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** Loads words into a fresh browser profile by restoring a generated backup file. */
export async function seed(page: Page, words: SeedWord[]) {
  const backup = {
    app: 'cihui',
    version: 1,
    exportedAt: new Date().toISOString(),
    // Later words count as newer.
    words: words.map((w, i) => ({ id: `seed-${i}`, tags: [], createdAt: i + 1, updatedAt: i + 1, ...w })),
    images: [],
    practices: [],
  };
  await page.goto('/#/backup');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'seed.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole('dialog').getByRole('button', { name: 'Khôi phục' }).click();
  await expect(page.getByText(`Đã khôi phục ${words.length} từ`)).toBeVisible();
}

/** The main navigation: the header on desktop, the bottom bar on phones. */
export function nav(page: Page) {
  return page.getByRole('navigation', { name: 'Điều hướng chính' });
}

/** Word cards and similar list items in the page content. */
export function items(page: Page) {
  return page.getByRole('main').getByRole('listitem');
}
