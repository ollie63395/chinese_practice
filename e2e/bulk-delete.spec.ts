import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { ANIMALS, items, makeTeacher, otherDevice, PNG, seed, signUp, WORDS } from './helpers';

const startSelecting = (page: Page) => page.getByRole('button', { name: 'Chọn nhiều' }).click();
const tick = (page: Page, word: string) => page.getByRole('checkbox', { name: new RegExp(word) }).check();
const dialog = (page: Page) => page.getByRole('dialog');

test('chooses a few words, says which before deleting them, and can undo it', async ({ page }) => {
  await signUp(page);
  await seed(page, WORDS);
  await page.goto('/#/words');
  await startSelecting(page);

  // Nothing chosen yet, nothing to delete.
  await expect(page.getByRole('button', { name: 'Xóa 0 từ' })).toBeDisabled();

  await tick(page, '猫');
  await tick(page, '狗');
  // A card can be ticked by clicking anywhere on it, and unticked again.
  await items(page).filter({ hasText: '吃' }).click({ position: { x: 150, y: 60 } });
  await expect(page.getByRole('status')).toHaveText('Đã chọn 3 từ');
  await items(page).filter({ hasText: '吃' }).click({ position: { x: 150, y: 60 } });
  await expect(page.getByRole('status')).toHaveText('Đã chọn 2 từ');

  await page.getByRole('button', { name: 'Xóa 2 từ' }).click();
  await expect(dialog(page)).toContainText('Xóa 2 từ?');
  await expect(dialog(page)).toContainText('猫');
  await expect(dialog(page)).toContainText('狗');
  await expect(dialog(page)).not.toContainText('toàn bộ kho từ vựng');

  // Changing your mind keeps the choice.
  await dialog(page).getByRole('button', { name: 'Hủy' }).click();
  await expect(items(page)).toHaveCount(WORDS.length);
  await expect(page.getByRole('status')).toHaveText('Đã chọn 2 từ');

  await page.getByRole('button', { name: 'Xóa 2 từ' }).click();
  await dialog(page).getByRole('button', { name: 'Xóa 2 từ' }).click();
  await expect(page.getByRole('status')).toHaveText('Đã xóa 2 từ');
  await expect(items(page)).toHaveCount(WORDS.length - 2);
  await expect(items(page).filter({ hasText: '猫' })).toHaveCount(0);
  // Back to the normal list: cards open their words again.
  await expect(page.getByRole('checkbox')).toHaveCount(0);

  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(page.getByText('Đã khôi phục 2 từ')).toBeVisible();
  await expect(items(page)).toHaveCount(WORDS.length);
  await expect(page.getByRole('button', { name: 'Hoàn tác' })).toHaveCount(0);
});

test('“select all” takes only the words the filter shows', async ({ page }) => {
  await signUp(page);
  await seed(page, WORDS);
  await page.goto('/#/words');
  await startSelecting(page);

  await page.getByRole('button', { name: /^động vật/ }).click();
  await expect(items(page)).toHaveCount(ANIMALS.length);
  await page.getByRole('button', { name: `Chọn tất cả (${ANIMALS.length})` }).click();
  await expect(page.getByRole('status')).toHaveText(`Đã chọn ${ANIMALS.length} từ`);

  // Words chosen before changing the filter stay chosen, and the bar says so.
  await page.getByRole('button', { name: /^động từ/ }).click();
  await expect(page.getByRole('status')).toContainText(`${ANIMALS.length} từ bị bộ lọc ẩn`);
  await page.getByRole('button', { name: /^Tất cả/ }).click();

  await page.getByRole('button', { name: `Xóa ${ANIMALS.length} từ` }).click();
  await dialog(page).getByRole('button', { name: `Xóa ${ANIMALS.length} từ` }).click();
  await expect(page.getByRole('status')).toHaveText(`Đã xóa ${ANIMALS.length} từ`);
  await expect(items(page)).toHaveCount(WORDS.length - ANIMALS.length);
  await expect(items(page).filter({ hasText: '猫' })).toHaveCount(0);
  await expect(items(page).filter({ hasText: '学校' })).toHaveCount(1);
});

test('removes a list imported by mistake in one go, even long after importing it', async ({ page }) => {
  await signUp(page);
  await page.goto('/#/words/new');
  await page.locator('#word').fill('手');
  await page.locator('#reading').pressSequentially('shou3');
  await page.locator('#meaning').fill('tay');
  await page.getByRole('button', { name: 'Lưu từ' }).click();
  await expect(items(page)).toHaveCount(1);

  await page.goto('/#/words/import');
  await page.getByLabel(/Hoặc dán vào đây/).fill('一\tyī\tmột\n二\tèr\thai\n三\tsān\tba');
  await page.getByRole('button', { name: 'Xem trước' }).click();
  await page.getByRole('button', { name: 'Nhập 3 từ' }).click();
  await expect(page.getByRole('heading', { name: 'Đã nhập 3 từ' })).toBeVisible();

  // A new visit: the import page's own undo is long gone.
  await page.goto('/#/words');
  await page.reload();
  await expect(items(page)).toHaveCount(4);
  await startSelecting(page);
  const imports = page.getByRole('group', { name: 'Chọn cả một lần nhập' });
  // The word added by hand isn't part of it.
  await expect(imports.getByRole('button')).toHaveCount(1);
  await imports.getByRole('button', { name: /3 từ/ }).click();
  await expect(page.getByRole('status')).toHaveText('Đã chọn 3 từ');
  await expect(page.getByRole('checkbox', { name: /手/ })).not.toBeChecked();

  await page.getByRole('button', { name: 'Xóa 3 từ' }).click();
  await dialog(page).getByRole('button', { name: 'Xóa 3 từ' }).click();
  await expect(page.getByRole('status')).toHaveText('Đã xóa 3 từ');
  await expect(items(page)).toHaveCount(1);
  await expect(items(page)).toContainText('手');
});

test('deleting everything warns first and can still be undone from the empty page', async ({ page }) => {
  await signUp(page);
  await seed(page, ANIMALS);
  await page.goto('/#/words');
  await startSelecting(page);
  await page.getByRole('button', { name: `Chọn tất cả (${ANIMALS.length})` }).click();
  await page.getByRole('button', { name: `Xóa ${ANIMALS.length} từ` }).click();
  await expect(dialog(page)).toContainText('toàn bộ kho từ vựng');
  await dialog(page).getByRole('button', { name: `Xóa ${ANIMALS.length} từ` }).click();

  await expect(page.getByRole('heading', { name: 'Kho từ vựng đang trống' })).toBeVisible();
  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(items(page)).toHaveCount(ANIMALS.length);
});

test('a deleted word’s picture survives an undo, and goes once undoing is over', async ({ page }) => {
  const account = await signUp(page);
  const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { data: profile } = await admin.from('profiles').select('id').eq('username', account.login).single();
  const pictures = async () => (await admin.storage.from('word-images').list(profile!.id)).data!.length;

  await page.goto('/#/words/new');
  await page.locator('#word').fill('猫');
  await page.locator('#reading').pressSequentially('mao1');
  await page.locator('#meaning').fill('mèo');
  await page.locator('input[type=file]').setInputFiles({ name: 'meo.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByAltText('Ảnh đã chọn')).toBeVisible();
  await page.getByRole('button', { name: 'Lưu từ' }).click();
  await expect(items(page)).toHaveCount(1);

  const deleteTheCat = async () => {
    await startSelecting(page);
    await tick(page, '猫');
    await page.getByRole('button', { name: 'Xóa 1 từ' }).click();
    await dialog(page).getByRole('button', { name: 'Xóa 1 từ' }).click();
    await expect(page.getByRole('status')).toHaveText('Đã xóa 1 từ');
  };

  await deleteTheCat();
  expect(await pictures()).toBe(1);
  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(items(page)).toHaveCount(1);
  await expect(items(page).locator('img')).toBeVisible();

  // Leaving the page ends the chance to undo, so the picture goes too.
  await deleteTheCat();
  await page.getByRole('link', { name: 'Lịch sử', exact: true }).first().click();
  await expect.poll(pictures).toBe(0);
});

test('a teacher can’t choose a student’s words to delete', async ({ page, browser }) => {
  const name = `Học viên ${Date.now().toString(36)}`;
  const student = await signUp(page, { name });
  await seed(page, ANIMALS);
  await page.goto('/#/words');
  await expect(page.getByRole('button', { name: 'Chọn nhiều' })).toBeVisible();

  const teacher = await otherDevice(browser, page);
  const account = await signUp(teacher, { name: 'Cô Lan' });
  await makeTeacher(account.login);
  await teacher.reload();
  await expect(teacher.getByRole('link', { name: 'Học viên', exact: true })).toBeVisible();
  await teacher.goto('/#/students');
  await teacher.getByLabel('Tìm học viên').fill(student.login);
  await teacher.getByRole('link', { name }).click();
  await expect(items(teacher)).toHaveCount(ANIMALS.length);
  await expect(teacher.getByRole('button', { name: 'Chọn nhiều' })).toHaveCount(0);
  await teacher.context().close();
});
