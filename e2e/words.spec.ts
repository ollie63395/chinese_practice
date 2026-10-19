import { expect, test } from '@playwright/test';
import { ANIMALS, items, PNG, seed, signUp, WORDS } from './helpers';

// Every test starts as a new student.
test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test('adds a word with a pinyin reading, tags and an image', async ({ page }) => {
  await page.goto('/#/words/new');
  await page.locator('#word').fill('学校');
  await page.locator('#reading').pressSequentially('xue2xiao4');
  await expect(page.locator('#reading')).toHaveValue('xuéxiào');
  await page.locator('#meaning').fill('trường học');
  await page.locator('#tags').fill('nơi chốn');
  await page.locator('#tags').press('Enter');
  await page.locator('#tags').pressSequentially('giáo dục,');
  await expect(page.getByRole('button', { name: /^Xóa nhãn/ })).toHaveCount(2);
  await page.locator('input[type=file]').setInputFiles({ name: 'truong.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByAltText('Ảnh đã chọn')).toBeVisible();

  await page.getByRole('button', { name: 'Lưu từ' }).click();

  await expect(page).toHaveURL(/#\/words$/);
  const card = items(page).filter({ hasText: '学校' });
  await expect(card).toContainText('xuéxiào');
  await expect(card).toContainText('trường học');
  await expect(card.getByText('nơi chốn')).toBeVisible();
  await expect(card.getByText('giáo dục')).toBeVisible();
  await expect(card.locator('img')).toBeVisible();
});

test('Ctrl+Enter saves, keeping a half-typed tag', async ({ page }) => {
  await page.goto('/#/words/new');
  await page.locator('#word').fill('水');
  await page.locator('#reading').pressSequentially('shui3');
  await page.locator('#meaning').fill('nước');
  await page.locator('#tags').fill('thiên nhiên');
  await page.locator('#tags').press('Control+Enter');
  await expect(page).toHaveURL(/#\/words$/);
  await expect(items(page).filter({ hasText: '水' }).getByText('thiên nhiên')).toBeVisible();
});

test('turns tone numbers into tone marks as you type', async ({ page }) => {
  await page.goto('/#/words/new');
  const reading = page.locator('#reading');

  // Converted as soon as each number is typed, without leaving the field.
  await reading.pressSequentially('ni3 hao3');
  await expect(reading).toHaveValue('nǐ hǎo');

  for (const [typed, expected] of [
    ['lv4', 'lǜ'],
    ['xie4xie5', 'xièxie'],
    ["xi1'an1", "xī'ān"],
    ['Bei3jing1', 'Běijīng'],
  ]) {
    await reading.fill('');
    await reading.pressSequentially(typed);
    await reading.blur();
    await expect(reading).toHaveValue(expected);
  }
});

test('keeps the caret in place when typing in the middle of the pinyin', async ({ page }) => {
  await page.goto('/#/words/new');
  const reading = page.locator('#reading');
  await reading.pressSequentially('hao3');
  await reading.press('Home');
  await reading.pressSequentially('ni3 ');
  await expect(reading).toHaveValue('nǐ hǎo');
  await reading.pressSequentially('X');
  await expect(reading).toHaveValue('nǐ Xhǎo');
});

test('“Save & add another” keeps the tags and refocuses the word', async ({ page }) => {
  await page.goto('/#/words/new');
  await page.locator('#word').fill('谢谢');
  await page.locator('#reading').pressSequentially('xie4xie5');
  await page.locator('#meaning').fill('cảm ơn');
  await page.locator('#tags').fill('chào hỏi');
  await page.locator('#tags').press('Enter');

  await page.getByRole('button', { name: 'Lưu & thêm từ khác' }).click();

  await expect(page.getByText('Đã thêm 谢谢')).toBeVisible();
  await expect(page.locator('#word')).toHaveValue('');
  await expect(page.locator('#reading')).toHaveValue('');
  await expect(page.locator('#word')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Xóa nhãn chào hỏi' })).toBeVisible();
  // The confirmation goes away by itself.
  await expect(page.getByText('Đã thêm 谢谢')).toBeHidden({ timeout: 6000 });
});

test('requires word, pinyin and meaning, and warns about duplicates', async ({ page }) => {
  await seed(page, ANIMALS);
  await page.goto('/#/words/new');
  await page.getByRole('button', { name: 'Lưu từ' }).click();
  await expect(page.getByRole('alert')).toHaveText([
    'Hãy nhập từ bằng chữ Hán.',
    'Hãy nhập pinyin của từ.',
    'Hãy nhập nghĩa của từ.',
  ]);

  await page.locator('#word').fill('猫');
  await expect(page.getByText('Bạn đã có từ')).toContainText('猫');
});

test('rejects pinyin with leftover numbers, characters or Vietnamese letters', async ({ page }) => {
  await page.goto('/#/words/new');
  await page.locator('#word').fill('二');
  await page.locator('#meaning').fill('hai');
  const reading = page.locator('#reading');
  const save = page.getByRole('button', { name: 'Lưu từ' });

  for (const [typed, message] of [
    ['x3', 'Còn số chưa chuyển thành dấu thanh'],
    ['二', 'không nhận chữ Hán'],
    // What Telex makes of "er".
    ['ẻ', 'Hãy tắt bộ gõ tiếng Việt'],
  ]) {
    await reading.fill(typed);
    await save.click();
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(reading).toBeFocused();
  }

  await reading.fill('er4');
  await save.click();
  await expect(page).toHaveURL(/#\/words$/);
  await expect(items(page).filter({ hasText: '二' })).toContainText('èr');
});

test('finds words by pinyin, characters, meaning or tag, and sorts them', async ({ page }) => {
  await seed(page, WORDS);
  await page.goto('/#/words');
  await expect(items(page)).toHaveCount(WORDS.length);

  const search = page.getByLabel('Tìm từ');
  for (const query of ['mao', 'māo', 'mao1', '猫', 'MÈO', 'meo']) {
    await search.fill(query);
    await expect(items(page)).toHaveCount(1);
    await expect(items(page)).toContainText('猫');
  }

  // Vietnamese without its diacritics: "an" finds "ăn".
  await search.fill('an');
  await expect(items(page).filter({ hasText: '吃' })).toHaveCount(1);

  for (const query of ['truong hoc', 'xue2xiao4', 'xue xiao']) {
    await search.fill(query);
    await expect(items(page)).toHaveCount(1);
    await expect(items(page)).toContainText('学校');
  }
  await page.getByRole('button', { name: 'Xóa nội dung tìm kiếm' }).click();
  await expect(items(page)).toHaveCount(WORDS.length);

  await page.getByRole('button', { name: /^động vật/ }).click();
  await expect(items(page)).toHaveCount(2);
  await page.getByRole('button', { name: /^Tất cả/ }).click();

  await page.getByLabel('Sắp xếp từ').selectOption('pinyin');
  // chī comes first in pinyin order.
  await expect(items(page).first()).toContainText('吃');
  await expect(items(page).last()).toContainText('昨天');
});

test('edits and deletes a word', async ({ page }) => {
  await seed(page, ANIMALS);
  await page.goto('/#/words');
  await page.getByRole('link', { name: /狗/ }).click();
  await expect(page.getByRole('heading', { name: 'Sửa từ' })).toBeVisible();
  await page.locator('#meaning').fill('con chó');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(items(page).filter({ hasText: '狗' })).toContainText('con chó');

  await page.getByRole('link', { name: /狗/ }).click();
  await page.getByRole('button', { name: 'Xóa từ' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa' }).click();
  await expect(page).toHaveURL(/#\/words$/);
  await expect(items(page)).toHaveCount(1);
  await expect(items(page)).toContainText('猫');
});
