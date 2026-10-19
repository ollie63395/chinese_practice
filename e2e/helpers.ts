import { expect, type Browser, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

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

export const PASSWORD = 'mat-khau-1';

export interface TestAccount {
  name: string;
  /** What's typed in "email or username". */
  login: string;
  password: string;
}

/** A login no other test uses. */
export function uniqueLogin(prefix: string, kind: 'username' | 'email' = 'username'): string {
  const unique = `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return kind === 'email' ? `${unique}@example.com` : unique;
}

/** Signs up a new account from the sign-in page (a student, as every new account is). */
export async function signUp(
  page: Page,
  { name = 'Nguyễn Văn An', kind = 'username' as 'username' | 'email', login = uniqueLogin('hv', kind) } = {},
): Promise<TestAccount> {
  await page.goto('/');
  await page.getByRole('group', { name: 'Đăng nhập hoặc tạo tài khoản' }).getByRole('button', { name: 'Tạo tài khoản' }).click();
  await page.locator('#new-name').fill(name);
  if (kind === 'username') {
    await page.getByRole('group', { name: 'Đăng nhập bằng' }).getByRole('button', { name: 'Tên đăng nhập' }).click();
  }
  await page.locator('#new-login').fill(login);
  await page.locator('#new-password').fill(PASSWORD);
  await page.locator('form').getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(nav(page)).toBeVisible();
  return { name, login, password: PASSWORD };
}

export async function signIn(page: Page, account: { login: string; password: string }) {
  await page.goto('/');
  await page.locator('#login').fill(account.login);
  await page.locator('#password').fill(account.password);
  await page.locator('form').getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(nav(page)).toBeVisible();
}

/** A page in a new browser context: another device, with nothing stored yet. */
export async function otherDevice(browser: Browser, page: Page): Promise<Page> {
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
  return context.newPage();
}

/**
 * Makes an account a teacher, as the first teacher is made: directly in the database,
 * with the secret key that only the tests (never the website) have.
 */
export async function makeTeacher(login: string) {
  const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const column = login.includes('@') ? 'email' : 'username';
  const { data, error } = await admin.from('profiles').update({ role: 'teacher' }).eq(column, login).select();
  if (error || data.length !== 1) throw new Error(`Couldn't make ${login} a teacher: ${error?.message ?? 'not found'}`);
}

/** A practice session using the first `count` seed words, the first of them ticked off as used. */
export function seedPractice(words: SeedWord[], count: number, notes = '') {
  const startedAt = Date.now() - 3_600_000;
  return {
    id: `practice-${startedAt}`,
    startedAt,
    endedAt: startedAt + 60_000,
    timeLimitSec: 60,
    spokenSec: 60,
    endedEarly: false,
    notes,
    words: words.slice(0, count).map((w, i) => ({ id: `seed-${i}`, word: w.word, reading: w.reading, meaning: w.meaning, used: i === 0 })),
  };
}

/** Loads words (and practice sessions) into the signed-in account by restoring a generated backup file. */
export async function seed(page: Page, words: SeedWord[], practices: ReturnType<typeof seedPractice>[] = []) {
  const backup = {
    app: 'cihui',
    version: 1,
    exportedAt: new Date().toISOString(),
    // Later words count as newer.
    words: words.map((w, i) => ({ id: `seed-${i}`, tags: [], createdAt: i + 1, updatedAt: i + 1, ...w })),
    images: [],
    practices,
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
