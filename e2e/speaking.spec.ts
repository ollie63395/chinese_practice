import { expect, test, type Page } from '@playwright/test';
import { items, nav, seed, WORDS } from './helpers';

const removeButtons = (page: Page) => page.getByRole('button', { name: /^Bỏ / });
const wordTiles = (page: Page) => page.getByRole('main').getByRole('listitem').getByRole('button');

test('draws words, lets you change them, times the speech and logs it', async ({ page }) => {
  await page.clock.install();
  await seed(page, WORDS);
  await nav(page).getByRole('link', { name: 'Luyện nói' }).click();

  // Setup: 3 words, 30 seconds.
  await page.getByLabel('Bao nhiêu từ?').fill('3');
  await page.getByRole('button', { name: '30 giây' }).click();
  await page.getByRole('button', { name: 'Bốc 3 từ' }).click();

  // Preparation (untimed): remove, add by search, add at random.
  await expect(page.getByRole('heading', { name: 'Chuẩn bị bài nói' })).toBeVisible();
  await expect(removeButtons(page)).toHaveCount(3);
  await removeButtons(page).first().click();
  await expect(removeButtons(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Thêm một từ', exact: true }).click();
  await page.getByRole('list', { name: 'Các từ phù hợp' }).getByRole('button').first().click();
  await expect(removeButtons(page)).toHaveCount(3);
  await page.getByRole('button', { name: 'Xong' }).click();
  await page.getByRole('button', { name: 'Thêm một từ ngẫu nhiên' }).click();
  await expect(removeButtons(page)).toHaveCount(4);
  await page.locator('#notes').fill('Kể về thầy giáo của tôi.');

  // Speaking (timed).
  await page.getByRole('button', { name: /Bắt đầu nói · 0:30/ }).click();
  await expect(page.getByRole('timer')).toHaveAccessibleName('Còn 0:30');
  await wordTiles(page).nth(0).click();
  await wordTiles(page).nth(1).click();
  await expect(page.getByText('Nhấn vào từ sau khi đã dùng · 2/4')).toBeVisible();
  await page.clock.fastForward(10_000);
  await expect(page.getByRole('timer')).toHaveAccessibleName('Còn 0:20');
  await page.clock.fastForward(21_000);

  await expect(page.getByRole('heading', { name: 'Hết giờ!' })).toBeVisible();
  // \s: durations join the number and unit with a no-break space.
  await expect(page.getByText(/Bạn đã nói 30\sgiây và dùng 2 trên 4 từ/)).toBeVisible();
  await expect(page.getByText('Đã lưu vào lịch sử')).toBeVisible();

  // Same words again keeps the notes; finishing early records the time actually spoken.
  await page.getByRole('button', { name: 'Dùng lại các từ này' }).click();
  await expect(page.locator('#notes')).toHaveValue('Kể về thầy giáo của tôi.');
  await page.getByRole('button', { name: /Bắt đầu nói/ }).click();
  await page.clock.fastForward(8_000);
  await page.getByRole('button', { name: 'Kết thúc' }).click();
  await expect(page.getByText('Bạn đã nói 8 giây trong tổng số 30 giây.')).toBeVisible();

  // History.
  await nav(page).getByRole('link', { name: 'Lịch sử' }).click();
  await expect(items(page)).toHaveCount(2);
  await expect(items(page).last()).toContainText('đã nói 0:30 / 0:30');
  await expect(items(page).last()).toContainText('4 từ, đã dùng 2');
  await items(page).last().getByRole('link').click();
  await expect(page.getByRole('heading', { name: 'Các từ đã luyện' })).toBeVisible();
  await expect(page.getByText('Đã dùng', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Kể về thầy giáo của tôi.')).toBeVisible();
});

test('practises a past session again, then deletes it', async ({ page }) => {
  await page.clock.install();
  await seed(page, WORDS);
  await page.goto('/#/speaking');
  await page.getByRole('button', { name: /^Bốc \d+ từ$/ }).click();
  const drawn = await removeButtons(page).count();
  await page.getByRole('button', { name: /Bắt đầu nói/ }).click();
  await page.clock.fastForward(3_000);
  await page.getByRole('button', { name: 'Kết thúc' }).click();
  await page.getByRole('link', { name: 'Xem buổi này trong lịch sử' }).click();

  await page.getByRole('button', { name: 'Luyện lại các từ này' }).click();
  await expect(page.getByRole('heading', { name: 'Chuẩn bị bài nói' })).toBeVisible();
  await expect(removeButtons(page)).toHaveCount(drawn);

  // Leaving now asks first; going back to the session and deleting it empties the history.
  await nav(page).getByRole('link', { name: 'Lịch sử' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Rời đi' }).click();
  await items(page).first().getByRole('button', { name: /^Xóa buổi luyện tập lúc/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa' }).click();
  await expect(page.getByText('Chưa có buổi luyện tập nào')).toBeVisible();
});

test('asks before leaving a practice in progress', async ({ page }) => {
  await seed(page, WORDS);
  await page.goto('/#/speaking');
  await page.getByRole('button', { name: /^Bốc/ }).click();
  await expect(page.getByRole('heading', { name: 'Chuẩn bị bài nói' })).toBeVisible();

  await nav(page).getByRole('link', { name: 'Từ vựng' }).click();
  await expect(page.getByRole('dialog')).toContainText('Rời khỏi buổi luyện này?');
  await page.getByRole('button', { name: 'Ở lại' }).click();
  await expect(page.getByRole('heading', { name: 'Chuẩn bị bài nói' })).toBeVisible();

  await nav(page).getByRole('link', { name: 'Từ vựng' }).click();
  await page.getByRole('button', { name: 'Rời đi' }).click();
  await expect(page.getByRole('heading', { name: 'Từ vựng của bạn' })).toBeVisible();
});
